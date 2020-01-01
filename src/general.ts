import { Directive } from "directives/Directive";
import { onPublicServer, hasJustSpawned, minBy, derefCoords } from "utils/utils";
import { Notifier } from "directives/Notifier";
import Mem from "memory/memory";
import { Commander } from "commander/Commander";
import { USE_TRY_CATCH } from "settings";
import { Base, BaseStage } from "./Base";
import { Pathing } from "Movement/pathing";
import { Roles } from "creeps/setups/setups";
import { bodyCost } from "creeps/setups/CreepSetups";
import  DirectiveBootstrap  from "directives/situational/bootstrap";
import { LogisticsNetwork } from "logistics/LogisticsNetwork";
import { log } from "./console/log";
import { Cartographer, ROOMTYPE_CONTROLLER } from "utils/Cartographer";
import { RoomIntel } from "intel/RoomIntel";
import DirectiveOutpost from "./directives/colony/outpost";

interface GeneralMemory {
    suspsendUntil: {[commanderRef: string]: number;};
}

const defaultGeneralMemory = {
    suspsendUntil: {},
}

export default class General implements IGeneral {
    private memory: GeneralMemory;
    private commanders: Commander[];
    private sorted: boolean;
    private commanderByBase: {[col: string]: Commander[]};
    private directives: Directive[];
    notifier: INotifier;

    static settings = {
        outpostCheckFrequency: onPublicServer() ? 250 : 100,
    }

    constructor() {
        this.memory = Mem.wrap(Memory, 'general', defaultGeneralMemory);
        this.directives = [];
        this.commanders = [];
        this.commanderByBase = {};
        this.sorted = false;
        this.notifier = new Notifier();
    }
    refresh(): void {
        this.memory = Mem.wrap(Memory, 'general', defaultGeneralMemory);
        this.notifier.clear();
    }

    private try(callback: ()=> any, identifier?:string): void {
        if((USE_TRY_CATCH)){
            try{
                callback();
            } catch(e){
                if(identifier){
                    e.name = `Caught unhandle exception at ${'' + callback} (identifier: ${identifier}): \n ${e.name} \n ${e.stack}`;
                } else {
                    e.name = `Caught unhandle exception at ${'' + callback}: \n ${e.name} \n ${e.stack}`;
                }
                Cobal.expections.push(e)
            }
        } else {
            callback();
        }
    }

    private get bases(): Base[]{
        return _.values(Cobal.bases);
    }

    registerDirective(directive: Directive): void {
        this.directives.push(directive);
    }
    removeDirective(directive: Directive): void {
        _.remove(this.directives, dir => dir.name == directive.name);
        for(const name in directive.commanders){
            this.removeCommander(directive.commanders[name]);
        }
    }

    registerCommander(commander: Commander): void {
        this.commanders = [...this.commanders, commander];
        if(!this.commanderByBase[commander.base.name]){
            this.commanderByBase[commander.base.name] = [];
        }
        this.commanderByBase[commander.base.name].push(commander);
    }

    getCommanderForBased(base: Base): Commander[] {
        return this.commanderByBase[base.name];
    }

    private removeCommander(commander: Commander):void {
        _.remove(this.commanders, c => c.ref === commander.ref);
        if(this.commanderByBase[commander.base.name]){
            _.remove(this.commanderByBase[commander.base.name], c => c.ref === commander.ref);
        }
    }

    build(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        for(const direct of this.directives){
            this.try(() => direct.init());
        }
        if(!this.sorted){
            this.commanders.sort((c1, c2) => c1.priority - c2.priority);
            _.forEach(_.keys(this.commanderByBase), baseName => {
                this.commanderByBase[baseName].sort((c1,c2) => c1.priority - c2.priority);
            })
            this.sorted = true;
        }

        for(const commander of this.commanders){
            if(!this.isCommanderSuspended(commander)) {
                commander.preInit();
                this.try(() => commander.init());
            }
        }

        for(const base of this.bases){
            this.registerLogisticsRequests(base);
        }

    }

    isCommanderSuspended(commander: Commander) {
        if(this.memory.suspsendUntil[commander.ref]){
            if(Game.time < this.memory.suspsendUntil[commander.ref]){
                return true;
            } else {
                delete this.memory.suspsendUntil[commander.ref];
                return false;
            }
        }
        return false;
    }

    suspendCommanderFor(commander: Commander, ticks: number): void {
        this.memory.suspsendUntil[commander.ref] = Game.time + ticks;
    }

    suspendCommanderUntil(commander: Commander, untilTick: number): void {
        this.memory.suspsendUntil[commander.ref] = untilTick;
    }

    run(): void {
        for(const directive of this.directives){
            this.try(() => directive.run());
        }

        for(const commander of this.commanders){
            if(!this.isCommanderSuspended(commander)){
                this.try(() => commander.run())
            }
        }

        for(const base of this.bases){
            this.handleSafeMode(base);
            this.placeDirectives(base);
        }
    }
    placeDirectives(base: Base) {
        this.handleBootstrapping(base);

        if(Game.time % General.settings.outpostCheckFrequency == 2 * base.id){
            this.handleNewOutposts(base);
        }
    }

    // SafeMode handling
    private handleSafeMode(base: Base): void {
        if(base.stage == BaseStage.MCV && onPublicServer()){
            return;
        }

        const criticalStructures = _.compact([...base.spawns, base.storage, base.terminal]) as Structure[];
        for(const structure of criticalStructures){
            if(structure.hits < structure.hitsMax && structure.pos.findInRange(base.room.dangerousPlayerHostiles, 2).length > 0){
                const ret = base.controller.activateSafeMode();
                if(ret != OK && !base.controller.safeMode){
                    if(base.terminal){

                    }
                } else {
                    return;
                }
            }
        }
        const firstHostile = _.first(base.room.dangerousPlayerHostiles);
        if(firstHostile && base.spawns[0]){
            const barriers = _.map(base.room.barriers, barrier => barrier.pos);
            if(Pathing.isReachable(firstHostile.pos, base.spawns[0].pos, barriers)){
                const ret = base.controller.activateSafeMode();
                if(ret != OK && !base.controller.safeMode){
                    if(base.terminal){

                    }
                } else {
                    return;
                }
            }
        }
    }

    private registerLogisticsRequests(base: Base): void {
		// Register logistics requests for all dropped resources and tombstones
		for (const room of base.rooms) {
			// Pick up all nontrivial dropped resources
			for (const resourceType in room.drops) {
				for (const drop of room.drops[resourceType]) {
					if (drop.amount > LogisticsNetwork.settings.droppedEnergyThreshold
						|| drop.resourceType != RESOURCE_ENERGY) {
						base.logisticsNetwork.requestOutput(drop);
					}
				}
			}
		}
		// Place a logistics request directive for every tombstone with non-empty store that isn't on a container
		for (const tombstone of base.tombstones) {
			if (_.sum(tombstone.store) > LogisticsNetwork.settings.droppedEnergyThreshold
				|| _.sum(tombstone.store) > tombstone.store.energy) {
				base.logisticsNetwork.requestOutput(tombstone, {resourceType: 'all'});
			}
		}
	}

    private handleBootstrapping(base: Base): void {
        if(!base.isIncubating){
            const noQueen = base.getCreepsByRole(Roles.queen).length == 0;
            if(noQueen && base.handOfNod){
                const setup = base.handOfNod.commander.queenSetup;
                const energyToMakeQueen = bodyCost(setup.generateBody(base.room.energyCapacityAvailable));
                if(base.room.energyAvailable < energyToMakeQueen || hasJustSpawned()){
                    const result = DirectiveBootstrap.createIfNotPresent(base.handOfNod.pos, 'pos');{
                        if(typeof result === 'string' || result == OK){
                            base.handOfNod.settings.suppressSpawning = true;
                        }
                    }
                }
            }
        }
    }
    getCreepReport(base: Base): string[][] {
		const spoopyBugFix = false;
		const roleOccupancy: { [role: string]: [number, number] } = {};

		for (const overlord of this.commanderByBase[base.name]) {
			for (const role in overlord.creepUsageReport) {
				const report = overlord.creepUsageReport[role];
				if (report == undefined) {
					if (Game.time % 100 == 0) {
						log.info(`Role ${role} is not reported by ${overlord.ref}!`);
					}
				} else {
					if (roleOccupancy[role] == undefined) {
						roleOccupancy[role] = [0, 0];
					}
					roleOccupancy[role][0] += report[0];
					roleOccupancy[role][1] += report[1];
					if (spoopyBugFix) { // bizzarely, if you comment these lines out, the creep report is incorrect
						log.debug(`report: ${JSON.stringify(report)}`);
						log.debug(`occupancy: ${JSON.stringify(roleOccupancy)}`);
					}
				}
			}
		}


		// let padLength = _.max(_.map(_.keys(roleOccupancy), str => str.length)) + 2;
		const roledata: string[][] = [];
		for (const role in roleOccupancy) {
			const [current, needed] = roleOccupancy[role];
			// if (needed > 0) {
			// 	stringReport.push('| ' + `${role}:`.padRight(padLength) +
			// 					  `${Math.floor(100 * current / needed)}%`.padLeft(4));
			// }
			roledata.push([role, `${current}/${needed}`]);
		}
		return roledata;
	}

    visuals(): void {
		for (const directive of this.directives) {
			directive.visuals();
		}
		for (const overlord of this.commanders) {
			overlord.visuals();
		}
	// 	this.notifier.visuals();
	// 	// for (let colony of this.colonies) {
	// 	// 	this.drawCreepReport(colony);
	// 	// }
    }

    private computePossibleOutposts(base: Base, depth = 3): string[] {
        return _.filter(Cartographer.findRoomsInRange(base.room.name, 3), roomName => {
            if(Cartographer.roomType(roomName) != ROOMTYPE_CONTROLLER){
                return false;
            }
            const alreadyAnOutpost = _.any(Cobal.cache.outpostFlags,
                flag => (flag.memory.setPosition || flag.pos).roomName == roomName);
            const alreadyABase = !!Cobal.bases[roomName];
            if(alreadyABase || alreadyAnOutpost) {
                return false;
            }
            const alreadyOwned = RoomIntel.roomOwnedBy(roomName);
            const alreadyReserved = RoomIntel.roomReservedBy(roomName);
            if(alreadyOwned || alreadyReserved){
                return false;
            }
            const neighboringRooms = _.values(Game.map.describeExits(roomName)) as string[];
            const isReachableFromBase = _.any(neighboringRooms, r => base.roomNames.includes(r));
            return isReachableFromBase && Game.map.isRoomAvailable(roomName);
        });
    }

    private handleNewOutposts(base: Base){
        const numSources = _.sum(base.roomNames, roomName => (
            Memory.rooms[roomName] && Memory.rooms[roomName][_RM.SOURCES] && Memory.rooms[roomName][_RM.SOURCES]!.length || 0
        ));
        const numRemotes = numSources - base.room.sources.length;
        if(numRemotes < Base.settings.remoteSourcesByLevel[base.level]){
            const possibleOutposts = this.computePossibleOutposts(base);

            const origin = base.pos;
            const bestOutpost = minBy(possibleOutposts, name => {
                if(!Memory.rooms[name]) return false;
                const sourceCoords = Memory.rooms[name][_RM.SOURCES] as SavedSource[];
                if(!sourceCoords) return false;
                const sourcePositions = _.map(sourceCoords, src => derefCoords(src.c, name));
                const sourceDistances = _.map(sourcePositions, pos => Pathing.distance(origin, pos));
                if(_.any(sourceDistances, dist => dist == undefined)) return false;
                return _.sum(sourceDistances) / sourceDistances.length;
            });
            if(bestOutpost){
                const pos = Pathing.findPathablePosition(bestOutpost);
                log.info(`Base ${base.room.print} now remoting mining from ${pos.print}`);
                DirectiveOutpost.createIfNotPresent(pos, 'room', {memory: {[_MEM.BASE]: base.name }});
            }
        }
    }
}
