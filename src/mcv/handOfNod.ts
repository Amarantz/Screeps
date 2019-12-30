import { CreepSetup, bodyCost } from "creeps/setups/CreepSetups";
import $ from '../caching/GlobalCache';
import Commander from "commander/Commander";
import MCV from "./mcv";
import Base from "Base";
import Mem from "memory/memory";
import { EnergyStructure } from "declarations/typeGuards";
import Unit from "unit/Unit";
import { log } from "console/log";
import { Movement } from "movement/Movement";
import { Pathing } from "movement/Pathing";
import { exponentialMovingAverage } from "utils/utils";
import Stats from "../stats/stats";
import { QueenCommander } from "commander/core/queen";
import { TransportRequestGroup } from "logistics/TransportRequestGroup";

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
    batteries: StructureContainer[];
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
        this.extensions = base.extentions;
        this.batteries = _.filter(this.room.containers, container => container.pos.findInRange(FIND_MY_SPAWNS, 4));
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
        $.refresh(this, 'spawns', 'extensions', 'energyStructures', 'link', 'towers', 'batteries');
        this.avaliableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
        this.isOverloaded = false;
        this.productionQueue = {};
        this.productionPriorities = [];
    }
    get idlePos(): RoomPosition {
        if(this.batteries.length > 0){
            return this.batteries[0].pos;
        }
        return this.spawns[0].pos.availableNeighbors(true)[0];
    }

    private computeEnergyStructures(): (StructureSpawn| StructureExtension)[] {
        let spawnsAndExtentions: (StructureSpawn | StructureExtension)[] = [];
        spawnsAndExtentions = spawnsAndExtentions.concat(this.spawns, this.extensions);
        return _.sortBy(spawnsAndExtentions, s => s.pos.getRangeTo(this.idlePos));
    }

    private registerEnergyRequests(): void {

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
			protoCreep.name = this.generateCreepName(protoCreep.name); // modify the creep name to make it unique
			if (bodyCost(protoCreep.body) > this.room.energyCapacityAvailable) {
				return ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH;
			}
            protoCreep.memory.data.origin = spawnToUse.pos.roomName;
            //@ts-ignore
			const result = spawnToUse.spawnCreep(protoCreep.body, protoCreep.name, {
				memory          : protoCreep.memory,
				energyStructures: this.energyStructures,
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
            task: undefined,
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
        while (this.avaliableSpawns.length > 0 && this.productionPriorities.length > 0) {
            const result = this.spawnHighestPriorityCreep();
            if(result == ERR_NOT_ENOUGH_ENERGY){
                this.isOverloaded = true;
            }
            if(result != OK && result != ERR_SPECIFIED_SPAWN_BUSY){
                for(const spawn of this.spawns){
                    if(spawn.spawning && spawn.spawning.remainingTime <= 1 && spawn.pos.findInRange(FIND_MY_CREEPS, 1).length > 0) {
                        let directions: DirectionConstant[];
                        if(spawn.spawning.directions){
                            directions = spawn.spawning.directions;
                        } else {
                            directions = _.map(spawn.pos.availableNeighbors(true), pos => spawn.pos.getDirectionTo(pos));
                        }
                        const exitPos = Pathing.positionAtDirection(spawn.pos, _.first(directions)) as RoomPosition;
                        Movement.vacatePos(exitPos);
                    }
                }
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
}
