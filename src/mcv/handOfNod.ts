import { CreepSetup, bodyCost } from "creeps/setups/CreepSetups";
import { $}  from '../caching/GlobalCache';
import { Commander } from "commander/Commander";
import { MCV } from "./mcv";
import {Base, BaseStage } from "Base";
import Mem from "memory/memory";
import { EnergyStructure } from "declarations/typeGuards";
import { Unit } from "unit/Unit";
import { log } from "console/log";
import { Movement } from "movement/Movement";
import { Pathing } from "movement/Pathing";
import { exponentialMovingAverage, hasMinerals } from "utils/utils";
import Stats from "../stats/stats";
import { QueenCommander } from "commander/core/queen";
import { TransportRequestGroup } from "logistics/TransportRequestGroup";
import { Priority } from "priorities/priorities";
import { Visualizer } from "../Visualizer";
import { insideBunkerBounds, energyStructureOrder, getPosFromBunkerCoord } from "../roomPlanner/layouts.ts/bunker";

const ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH = -20;
const ERR_SPECIFIED_SPAWN_BUSY = -21;

export interface SpawnRequest {
    setup: CreepSetup;
    commander: Commander;
    priority: number;
    patners?: CreepSetup[];
    options?: SpawnRequestOptions;
}

export interface SpawnRequestOptions {
    spawn?: StructureSpawn;
    directions?: DirectionConstant[];
}

interface SpawnOrder {
    protoCreep: ProtoCreep;
    options: SpawnOptions | undefined;
}

export interface HandOfNodMemory {
    stats: {
        overload: number;
        uptime: number;
        longUptime: number;
    }
}

const HandOfNodMemoryDefaults: HandOfNodMemory = {
    stats: {
        overload: 0,
        uptime: 0,
        longUptime: 0,
    }
}

export default class HandOfNod extends MCV {
    memory: HandOfNodMemory;
    spawns: StructureSpawn[];
    avaliableSpawns: StructureSpawn[];
    extensions: StructureExtension[];
    energyStrctures: (StructureSpawn | StructureExtension)[];
    battery: StructureContainer | undefined;
    towers: StructureTower[];
    link: StructureLink | undefined;
    energyStructures: EnergyStructure[];

    commander: QueenCommander;
    settings: {
        refillTowersBelow: number,
        suppressSpawning: boolean;
    }
    private _nextAvailability: number | undefined;
    private productionPriorities: number[];
    private productionQueue: {
        [priority:number]: SpawnOrder[];
    }
    private isOverloaded: boolean;
    static restrictedRange = 6;
    transportRequests: TransportRequestGroup;

    constructor(base: Base, headSpawn: StructureSpawn){
        super(base, headSpawn, 'handOfNod');
        this.memory = Mem.wrap(this.base.memory, 'handOfNod', HandOfNodMemoryDefaults, true);
        this.spawns = base.spawns;
        this.avaliableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
        this.extensions = base.extensions;
        this.battery = _.first(_.filter(this.room.containers, cont => insideBunkerBounds(cont.pos, this.base)));
        $.set(this, 'energyStructures', () => this.computeEnergyStructures());
        this.productionPriorities = [];
        this.productionQueue = {};
        this.link = this.pos.findClosestByLimitedRange(base.availableLinks, 2)
        this.isOverloaded = false;
        this.settings = {
            refillTowersBelow: 750,
            suppressSpawning: false,
        }
        this.transportRequests = base.transportRequests;
    }

    refresh(): void {
        this.memory = Mem.wrap(this.base.memory, 'handOfNod', HandOfNodMemoryDefaults, true);
        $.refreshRoom(this);
        $.refresh(this, 'spawns', 'extensions', 'energyStructures', 'link', 'towers', 'battery');
        this.avaliableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
        this.isOverloaded = false;
        this.productionQueue = {};
        this.productionPriorities = [];
    }
    get idlePos(): RoomPosition {
        if(this.battery){
            return this.battery.pos;
        }
        return this.spawns[0].pos.availableNeighbors(true)[0];
    }

    private computeEnergyStructures(): (StructureSpawn| StructureExtension)[] {
        const positions = _.map(energyStructureOrder, coord => getPosFromBunkerCoord(coord, this.base));
        let spawnsAndExtensions: (StructureSpawn | StructureExtension)[] = [];
        spawnsAndExtensions = spawnsAndExtensions.concat(this.spawns, this.extensions);
        const energyStructures: (StructureSpawn | StructureExtension)[] = [];
        for (const pos of positions) {
            const structure = _.find(pos.lookFor(LOOK_STRUCTURES), s =>
                s.structureType == STRUCTURE_SPAWN
                || s.structureType == STRUCTURE_EXTENSION) as StructureSpawn | StructureExtension;
            if (structure) {
                energyStructures.push(_.remove(spawnsAndExtensions, s => s.id == structure.id)[0]);
            }
        }
        return _.compact(energyStructures.concat(spawnsAndExtensions));
    }

    private registerEnergyRequests(): void {
        if(this.link && this.link.isEmpty){
            this.base.linkNetwork.requestReceive(this.link);
        }

        if(this.battery) {
            const threshold = this.base.stage == BaseStage.MCV ? 0.75 : 0.5;
			if (this.battery.energy < threshold * this.battery.storeCapacity) {
				this.base.logisticsNetwork.requestInput(this.battery, {multiplier: 1.5});
			}
			// get rid of any minerals in the container if present
			if (hasMinerals(this.battery.store)) {
				this.base.logisticsNetwork.requestOutputMinerals(this.battery);
			}
        }

        _.forEach(this.energyStructures, struct => this.transportRequests.requestInput(struct, Priority.NormalLow));
        const refillTowers = _.filter(this.towers, tower => tower.energy < this.settings.refillTowersBelow);
        _.forEach(refillTowers, tower => this.transportRequests.requestInput(tower, Priority.NormalLow));
    }

    private generateCreepName(roleName: string) : string {
        let i = 0
        while(Game.creeps[(roleName + '::' + i)]){
            i++;
        }
        return (roleName + '::' + i);
    }

    private spawnCreep(protoCreep: ProtoCreep, options: SpawnRequestOptions = {}): number {
		// get a spawn to use
		let spawnToUse: StructureSpawn | undefined;
		if (options.spawn) {
			spawnToUse = options.spawn;
			if (spawnToUse.spawning) {
				return ERR_SPECIFIED_SPAWN_BUSY;
			} else {
				_.remove(this.avaliableSpawns, spawn => spawn.id == spawnToUse!.id); // mark as used
			}
		} else {
			spawnToUse = this.avaliableSpawns.shift();
		}
		if (spawnToUse) { // if there is a spawn, create the creep
			// if (this.colony.bunker && this.colony.bunker.coreSpawn
			// 	&& spawnToUse.id == this.colony.bunker.coreSpawn.id && !options.directions) {
			// 	options.directions = [TOP, RIGHT]; // don't spawn into the manager spot
			// }
			if (bodyCost(protoCreep.body) > this.room.energyCapacityAvailable) {
				return ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH;
            }
            protoCreep.name = this.generateCreepName(protoCreep.name); // modify the creep name to make it unique
            protoCreep.memory.data.origin = spawnToUse.pos.roomName;
			const result = spawnToUse.spawnCreep(protoCreep.body, protoCreep.name, {
				memory          : protoCreep.memory,
				directions      : options.directions
			});
			if (result == OK) {
				return result;
			} else {
				this.avaliableSpawns.unshift(spawnToUse); // return the spawn to the available spawns list
				return result;
			}
		} else { // otherwise, return busy
			return ERR_BUSY;
		}
    }

    canSpawn(body: BodyPartConstant[]): boolean{
        return bodyCost(body) <= this.room.energyCapacityAvailable;
    }

    canSpawnUnit(unit: Unit): boolean {
        return this.canSpawn(_.map(unit.body, part => part.type))
    }

    private generateProtoCreep(setup: CreepSetup, commander: Commander): ProtoCreep {
        let creepBody: BodyPartConstant[];
        creepBody = setup.generateBody(this.room.energyCapacityAvailable);
        const creepMemory: CreepMemory = {
            [_MEM.BASE]: commander.base.name,
            [_MEM.COMMANDER]: commander.ref,
            role: setup.role,
            task: null,
            data: {
                origin: '',
            },
        };

        const protoCreep: ProtoCreep = {
            body: creepBody,
            name: setup.role,
            memory: creepMemory,
        };

        return protoCreep;
    }

    get nextAvailability(): number {
        if(!this._nextAvailability){
            const allQueued = _.flatten(_.values(this.productionQueue)) as SpawnOrder[];
            const queuedSpawnTime = _.sum(allQueued, order => order.protoCreep.body.length) * CREEP_SPAWN_TIME
            const activeSpawnTime = _.sum(this.spawns, spawn => spawn.spawning && spawn.spawning.remainingTime || 0)
            this._nextAvailability = (activeSpawnTime + queuedSpawnTime) / this.spawns.length;
        }
        return this._nextAvailability
    }

    enqueue(request: SpawnRequest){
        const protoCreep = this.generateProtoCreep(request.setup, request.commander);
        const { priority, options = {} } = request;
        if(this.canSpawn(protoCreep.body) && protoCreep.body.length > 0){
            this._nextAvailability = undefined;
            if(!this.productionQueue[priority]){
                this.productionQueue[priority] = [];
                this.productionPriorities.push(priority);
            }
            this.productionQueue[priority].push({ protoCreep, options })
        } else {
            log.debug(`${this.room.print}: cannot spawn creep ${protoCreep.name} with body: ${JSON.stringify(protoCreep.body)}!`);
        }
    }

    private spawnHighestPriorityCreep(): number | undefined {
		const sortedKeys = _.sortBy(this.productionPriorities);
		for (const priority of sortedKeys) {

			// if (this.colony.defcon >= DEFCON.playerInvasion
			// 	&& !this.colony.controller.safeMode
			// 	&& priority > OverlordPriority.warSpawnCutoff) {
			// 	continue; // don't spawn non-critical creeps during wartime
			// }

			const nextOrder = this.productionQueue[priority].shift();
			if (nextOrder) {
				const {protoCreep, options} = nextOrder;
				const result = this.spawnCreep(protoCreep, options);
				if (result == OK) {
					return result;
				} else if (result == ERR_SPECIFIED_SPAWN_BUSY) {
					return result; // continue to spawn other things while waiting on specified spawn
				} else {
					// If there's not enough energyCapacity to spawn, ignore it and move on, otherwise block and wait
					if (result != ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH) {
						this.productionQueue[priority].unshift(nextOrder);
						return result;
					}
				}
			}
		}
    }

    private handleSpawns(): void {
		// Spawn all queued creeps that you can
		while (this.avaliableSpawns.length > 0) {
			const result = this.spawnHighestPriorityCreep();
			if (result == ERR_NOT_ENOUGH_ENERGY) { // if you can't spawn something you want to
				this.isOverloaded = true;
			}
			if (result != OK && result != ERR_SPECIFIED_SPAWN_BUSY) {
				// Can't spawn creep right now
				break;
			}
		}
		// Move creeps off of exit position to let the spawning creep out if necessary
		for (const spawn of this.spawns) {
			if (spawn.spawning && spawn.spawning.remainingTime <= 1
				&& spawn.pos.findInRange(FIND_MY_CREEPS, 1).length > 0) {
				let directions: DirectionConstant[];
				if (spawn.spawning.directions) {
					directions = spawn.spawning.directions;
				} else {
					directions = _.map(spawn.pos.availableNeighbors(true), pos => spawn.pos.getDirectionTo(pos));
				}
				const exitPos = Pathing.positionAtDirection(spawn.pos, _.first(directions)) as RoomPosition;
				Movement.vacatePos(exitPos);
			}
		}
    }

    spawnMoreCommanders(): void {
        this.commander = new QueenCommander(this);
    }
    init(): void {
        this.registerEnergyRequests();
    }
    run(): void {
        if(!this.settings.suppressSpawning){
            this.handleSpawns();
        }
        this.recordStats();
    }

    private recordStats(){
        const spawnUsageThisTick = _.filter(this.spawns, spawn => spawn.spawning).length / this.spawns.length;
        const uptime = exponentialMovingAverage(spawnUsageThisTick, this.memory.stats.uptime, CREEP_LIFE_TIME);
        const longUptime = exponentialMovingAverage(spawnUsageThisTick, this.memory.stats.longUptime, 5 * CREEP_LIFE_TIME);
        const overload = exponentialMovingAverage(this.isOverloaded ? 1 : 0, this.memory.stats.overload, CREEP_LIFE_TIME)

        Stats.log(`bases.${this.base.name}.handOfNod.uptime`, uptime);
        Stats.log(`base.${this.base.name}.handOfNod.overload`, overload);

        this.memory.stats = {overload, uptime, longUptime};

    }

    visuals(coord: Coord): Coord {
		let {x, y} = coord;
		const spawning: string[] = [];
		const spawnProgress: [number, number][] = [];
		_.forEach(this.spawns, function(spawn) {
			if (spawn.spawning) {
				spawning.push(spawn.spawning.name.split('_')[0]);
				const timeElapsed = spawn.spawning.needTime - spawn.spawning.remainingTime;
				spawnProgress.push([timeElapsed, spawn.spawning.needTime]);
			}
		});
		const boxCoords = Visualizer.section(`${this.base.name} Hatchery`, {x, y, roomName: this.room.name},
											 9.5, 3 + spawning.length + .1);
		const boxX = boxCoords.x;
		y = boxCoords.y + 0.25;

		// Log energy
		Visualizer.text('Energy', {x: boxX, y: y, roomName: this.room.name});
		Visualizer.barGraph([this.room.energyAvailable, this.room.energyCapacityAvailable],
							{x: boxX + 4, y: y, roomName: this.room.name}, 5);
		y += 1;

		// Log uptime
		const uptime = this.memory.stats.uptime;
		Visualizer.text('Uptime', {x: boxX, y: y, roomName: this.room.name});
		Visualizer.barGraph(uptime, {x: boxX + 4, y: y, roomName: this.room.name}, 5);
		y += 1;

		// Log overload status
		const overload = this.memory.stats.overload;
		Visualizer.text('Overload', {x: boxX, y: y, roomName: this.room.name});
		Visualizer.barGraph(overload, {x: boxX + 4, y: y, roomName: this.room.name}, 5);
		y += 1;

		for (const i in spawning) {
			Visualizer.text(spawning[i], {x: boxX, y: y, roomName: this.room.name});
			Visualizer.barGraph(spawnProgress[i], {x: boxX + 4, y: y, roomName: this.room.name}, 5);
			y += 1;
		}
		return {x: x, y: y + .25};
	}
}
