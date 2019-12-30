import Mem from "memory/memory";
import $ from './caching/GlobalCache';
import Unit from "unit/Unit";
import DirectiveHavest, { _HAVEST_MEM_DOWNTIME, _HAVEST_MEM_USAGE } from "directives/resource/harvest";
import HandOfNod from "mcv/handOfNod";
import Stats from "./stats/stats";
import { StoreStructure } from "declarations/typeGuards";
import { mergeSum } from "utils/utils";
import { log } from "console/log";
import MCV from "mcv/mcv";
import UpgradeSite from "mcv/upgradeSite";
import { TransportRequestGroup } from "logistics/TransportRequestGroup";
import DefaultCommander from "commander/core/default";
import WorkerCommander from "commander/core/workers";

export enum BaseStage {
	MCV = 0,		// No storage and no incubator
	HAND_OF_NOD  = 1,		// Has storage but RCL < 8
	TEMPLE_OF_NOD = 2,		// RCL 8 room
}
export enum DEFCON {
	safe               = 0,
	invasionNPC        = 1,
	boostedInvasionNPC = 2,
	playerInvasion     = 2,
	bigPlayerInvasion  = 3,
}

export interface BaseMemory {
	defcon: {
		level: number,
		tick: number,
	};
	expansionData: {
		possibleExpansions: { [roomName: string]: number | boolean },
		expiration: number,
	};
	suspend?: boolean;
}

const defaultBaseMemory: BaseMemory = {
	defcon       : {
		level: DEFCON.safe,
		tick : -Infinity
	},
	expansionData: {
		possibleExpansions: {},
		expiration        : 0,
	},
};

export const getAllBases = (): Base[] => (
    _.values(Cobal.bases)
)

export default class Base {
    availableLinks: StructureLink[];
    id: number;
    name: string;
    ref: string;
    memory: BaseMemory;
    room: Room;
    roomNames: string[];
    outposts: Room[];
    rooms: Room[];
    miningSites: {[flagName:string]: DirectiveHavest};
    extractionSites: {[flagName:string]: any};
    destinations: { pos: RoomPosition, order: number }[];
    creeps: Creep[];
    creepsByRole: {[roleName:string]: Creep[]}
    flags: Flag[];
    controller: StructureController;
    spawns: StructureSpawn[];
    extentions: StructureExtension[];
    storage: StructureStorage | undefined;
    sources: Source[];
    constructionSites: ConstructionSite[];
    tombstones: Tombstone[];
    drops: RESOURCE_ENERGY[];
    repairables: Structure<StructureConstant>[];
    rechargeables: rechargeObjectType[];
    pos: RoomPosition;
    stage: BaseStage;
    terminal: any;
    MCVbuildings: MCV[];
    links: StructureLink[];
    towers: StructureTower[];
    handOfNod: HandOfNod;
    labs: StructureLab[];
    bootstraping: boolean;
    isIncubating: boolean;
    defcon: number;
    terminalState: undefined;
    breached: boolean;
    termianl: StructureTerminal | undefined;
    level: number;
    assets: { [resourceType: string]: number; };
    upgradeSite: UpgradeSite;
    transportRequests: TransportRequestGroup;
    commanders: {
        default: DefaultCommander;
        worker: WorkerCommander;
    };

    constructor(id:number, roomName:string, outposts: string[]){
        this.id = id;
        this.name = roomName;
        this.ref = roomName;
        this.memory = Mem.wrap(Memory.bases, roomName, defaultBaseMemory, true);
        global[this.name] = this;
        global[this.name.toLowerCase()] = this;
        this.build(roomName, outposts);
    }

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.room.name}">[${this.room.name}]</a>`;
    }

    build(roomName: string, outposts: string[]): void {
        this.roomNames = [roomName, ...outposts];
        this.room = Game.rooms[roomName];
        this.outposts = _.compact(_.map(outposts, outpost => Game.rooms[outpost]));
        this.rooms = [this.room, ...this.outposts];
        this.miningSites = {};
        this.extractionSites = {};
        this.creeps = global.Cobal.cache.creepsByBase[this.name] || [];
        this.creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
        this.registerRoomObjects_cached();
        this.registerOperationalState();
        this.registerUtilities();
        this.registerMCVComponets();
    }

    private registerRoomObjects(): void {
        this.flags = [];
        this.destinations = [];
        this.controller = this.room.controller!;
        this.spawns = _.sortBy(_.filter(this.room.spawns, spawn => spawn.my && spawn.isActive()), spawn => spawn.ref);
        this.extentions = this.room.extensions;
        this.storage = this.room.storage && this.room.storage.isActive() ? this.room.storage : undefined;
        this.sources = _.sortBy(_.flatten(_.map(this.rooms, room => room.sources)));
        this.constructionSites = _.flatten(_.map(this.rooms, room => room.constructionSites));
		this.tombstones = _.flatten(_.map(this.rooms, room => room.tombstones));
		this.drops = _.merge(_.map(this.rooms, room => room.drops));
		this.repairables = _.flatten(_.map(this.rooms, room => room.repairables));
        this.rechargeables = _.flatten(_.map(this.rooms, room => room.rechargeables));
        this.assets = this.getAllAssets();
    }

    private registerUtilities() {
        this.transportRequests = new TransportRequestGroup();
    }

    private refreshUtilities(){
        this.transportRequests.refresh();
    }

    private registerRoomObjects_cached(): void {
        this.flags = [];
        this.destinations = [];
        this.controller = this.room.controller!;
        this.extentions = this.room.extensions;
        this.links = this.room.links;
        this.availableLinks = _.clone(this.room.links);
        $.set(this, 'spawns', () =>  _.sortBy(_.filter(this.room.spawns, spawn => spawn.my && spawn.isActive()), spawn => spawn.ref));
        $.set(this, 'storage', () => this.room.storage && this.room.storage.isActive() ? this.room.storage : undefined);
        this.pos = (this.storage || this.spawns[0] || this.controller).pos;
        $.set(this, 'sources', () => _.sortBy(_.flatten(_.map(this.rooms, room => room.sources)), source => source.pos.getMultiRoomRangeTo(this.pos)));
        for(const source of this.sources){
            DirectiveHavest.createIfNotPresent(source.pos, 'pos');
        }
        $.set(this, 'repairables', () => _.flatten(_.map(this.rooms, room => room.repairables)));
		$.set(this, 'rechargeables', () => _.flatten(_.map(this.rooms, room => room.rechargeables)));
		$.set(this, 'constructionSites', () => _.flatten(_.map(this.rooms, room => room.constructionSites)), 10);
		$.set(this, 'tombstones', () => _.flatten(_.map(this.rooms, room => room.tombstones)), 5);
        this.drops = _.merge(_.map(this.rooms, room => room.drops));
        this.assets = this.getAllAssets();
    }

    private refreshRoomObjects(): void {
        $.refresh(this, 'controller', 'extentions', 'links', 'towers', 'spawns', 'storage', 'constructionSites', 'repairables', 'rechargeables');
        $.set(this, 'constructionSites', () => _.flatten(_.map(this.rooms, room => room.constructionSites)), 10);
        $.set(this, 'tombstones', () => _.flatten(_.map(this.rooms, room => room.tombstones)), 5);
        this.drops = _.merge(_.map(this.rooms, room => room.drops));
        this.assets = this.getAllAssets();
    }

    private registerOperationalState(): void {
        this.level = this.controller.level as 1|2|3|4|5|6|7|8;
        this.bootstraping = false;
        this.isIncubating = false;
        if(this.storage && this.spawns[0]){
            if(this.controller.level == 8) {
                this.stage = BaseStage.TEMPLE_OF_NOD;
            } else {
                this.stage = BaseStage.HAND_OF_NOD;
            }
        } else {
            this.stage = BaseStage.MCV
        }

        let defcon = DEFCON.safe;
        const defconDecayTime = 200;
        if(this.room.dangerousHostiles.length > 0 && !this.controller.safeMode){
            const effectiveHostileCount = _.sum(_.map(this.room.dangerousHostiles, hostile => hostile.boosts.length > 0 ? 2 : 1));
            if(effectiveHostileCount >= 3){
                defcon = DEFCON.boostedInvasionNPC;
            } else {
                defcon = DEFCON.invasionNPC;
            }
        }
        if (this.memory.defcon) {
			if (defcon < this.memory.defcon.level) { // decay defcon level over time if defcon less than memory value
				if (this.memory.defcon.tick + defconDecayTime < Game.time) {
					this.memory.defcon.level = defcon;
					this.memory.defcon.tick = Game.time;
				}
			} else if (defcon > this.memory.defcon.level) { // refresh defcon time if it increases by a level
				this.memory.defcon.level = defcon;
				this.memory.defcon.tick = Game.time;
			}
		} else {
			this.memory.defcon = {
				level: defcon,
				tick : Game.time
			};
		}
		this.defcon = this.memory.defcon.level;
		this.breached = (this.room.dangerousHostiles.length > 0 &&
						 this.creeps.length == 0 &&
                         !this.controller.safeMode);
        this.terminalState = undefined;
    }

    getCreepsByRole(role: string): Creep[] {
        return this.creepsByRole[role] || [];
    }

    private registerMCVComponets() {
        this.MCVbuildings = [];
        if(this.spawns[0]){
            this.handOfNod = new HandOfNod(this, this.spawns[0]);
        }
        this.upgradeSite = new UpgradeSite(this, this.controller);
        this.MCVbuildings.reverse();
    }

    private refreshMCVComponets(){
        for(let i = this.MCVbuildings.length -1; i>= 0; i--){
            this.MCVbuildings[i].refresh();
        }
    }

    	/**
	 * Summarizes the total of all resources in colony store structures, labs, and some creeps
	 */
	private getAllAssets(verbose = false): { [resourceType: string]: number } {
		// if (this.name == 'E8S45') verbose = true; // 18863
		// Include storage structures, lab contents, and manager carry
		const stores = _.map(<StoreStructure[]>_.compact([this.storage, this.terminal]), s => s.store);
		const creepCarriesToInclude = _.map(this.creeps, creep => creep.carry) as { [resourceType: string]: number }[];
		const labContentsToInclude = _.map(_.filter(this.labs, lab => !!lab.mineralType), lab =>
			({[<string>lab.mineralType]: lab.mineralAmount})) as { [resourceType: string]: number }[];
		const allAssets: { [resourceType: string]: number } = mergeSum([
																		   ...stores,
																		   ...creepCarriesToInclude,
																		   ...labContentsToInclude
																	   ]);
		if (verbose) log.debug(`${this.room.print} assets: ` + JSON.stringify(allAssets));
		return allAssets;
	}
    getUnitByRole(role:string): (Unit | undefined)[] {
        return _.map(this.getCreepsByRole(role), creep => Cobal.units[creep.name]);
    }

    spawnMoreCommanders(): void {
        this.commanders = {
            default: new DefaultCommander(this),
            worker: new WorkerCommander(this),
        }
        for(const mcv of this.MCVbuildings){
            mcv.spawnMoreCommanders();
        }
    }

    init(): void {
        _.forEach(this.MCVbuildings, mcv => mcv.init());
    }

    run(): void {
        _.forEach(this.MCVbuildings, mcv => mcv.run());
        this.stats();
    }

    refresh(): void {
        this.memory = Mem.wrap(Memory.bases, this.room.name, defaultBaseMemory, true);
        this.room = Game.rooms[this.room.name];
        this.outposts = _.compact(_.map(this.outposts, outpost => Game.rooms[outpost.name]));
        this.rooms = [this.room].concat(this.outposts);
        this.creeps = Cobal.cache.creepsByBase[this.name] || [];
        this.creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
        this.refreshRoomObjects();
        this.registerOperationalState();
        this.refreshUtilities();
        this.refreshMCVComponets();
    }

    stats(): void {
        if(Game.time % 8 == 0) {
            Stats.log(`Bases.${this.name}.storage.energy`, this.storage ? this.storage.energy : undefined);
            Stats.log(`Bases.${this.name}.rcl.level`, this.controller.level);
            Stats.log(`Bases.${this.name}.rcl.progress`, this.controller.progress);
            Stats.log(`Bases.${this.name}.rcl.progressTotal`, this.controller.progressTotal);
            const numSites = _.keys(this.miningSites).length;
			const avgDowntime = _.sum(this.miningSites, site => site.memory[_HAVEST_MEM_DOWNTIME]) / numSites;
			const avgUsage = _.sum(this.miningSites, site => site.memory[_HAVEST_MEM_USAGE]) / numSites;
			const energyInPerTick = _.sum(this.miningSites,
                                          site => site.commanders.mine.energyPerTick * site.memory[_HAVEST_MEM_USAGE]);
            Stats.log(`colonies.${this.name}.miningSites.avgDowntime`, avgDowntime);
            Stats.log(`colonies.${this.name}.miningSites.avgUsage`, avgUsage);
            Stats.log(`colonies.${this.name}.miningSites.energyInPerTick`, energyInPerTick);
            Stats.log(`colonies.${this.name}.assets`, this.assets);
            // Log defensive properties
			Stats.log(`colonies.${this.name}.defcon`, this.defcon);
			const avgBarrierHits = _.sum(this.room.barriers, barrier => barrier.hits) / this.room.barriers.length;
			Stats.log(`colonies.${this.name}.avgBarrierHits`, avgBarrierHits);
        }
    }
}
