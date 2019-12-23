import { Component } from "./_componet";
import { Base, BasesStage } from "Base";
import { Commander } from "commander/Commander";
import { CreepSetup, bodyCost } from "creeps/setups/CreepSetups";
import Mem from "memory/memory";
import { $ } from "caching/GlobalCache";
import { energyStructureOrder, getPosFromBunkerCoord, insideBunkerBounds} from "roomPlanner/layouts/bunker";
import { hasMinerals, exponentialMovingAverage } from "utils/utils";
import { Priority } from "priorities/Priorities";
import Unit from "unit/unit";
import { log } from "console/log";
import { Pathing } from "movement/Pathing";
import { Movement } from "movement/Movement";

const ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH = -20;
const ERR_SPECIFIED_SPAWN_BUSY = -21;

export interface SpawnRequest {
	setup: CreepSetup;					// creep body generator to use
	commander: Commander;					// overlord requesting the creep
    priority: number;					// priority of the request // TODO: WIP
	partners?: CreepSetup[];			// partners to spawn along with the creep
	options?: SpawnRequestOptions;		// options
}

export interface SpawnRequestOptions {
	spawn?: StructureSpawn;				// allows you to specify which spawn to use; only use for high priority
	directions?: DirectionConstant[];	// StructureSpawn.spawning.directions
}

interface SpawnOrder {
	protoCreep: ProtoCreep;
	options: SpawnOptions | undefined;
}

export interface HandOfNodMemory {
	stats: {
		commander: number;
		uptime: number;
		longUptime: number;
	};
}

const HandOfNodMemoryDefaults: HandOfNodMemory = {
	stats: {
		commander  : 0,
		uptime    : 0,
		longUptime: 0,
	}
};

export class HandOfNod extends Component {
	settings: {
		refillTowersBelow: number;
		linksRequestEnergyBelow: number;
		suppressSpawning: boolean
	}
	static restrictedRange = 6;
	spawns: StructureSpawn[];
	availableSpawns: StructureSpawn[];
	extentions: StructureExtension[];
	towers: StructureTower[];
	battery: StructureContainer | undefined;
	link: StructureLink | undefined;
	energyStructures: any[];
	isOverloaded: boolean;
	productionQueue: {
		[priority:number]: SpawnOrder[];
	};
	productionPriorities: number[];
	transportRequests: any;
	private _nextAvailability: number | undefined;

    constructor(base: Base, headSpawn: StructureSpawn){
		super(base, headSpawn, 'hand_of_nod');
		this.memory = Mem.wrap(this.base.memory, 'handOfNod', HandOfNodMemoryDefaults, true);
		if (this.base.layout == 'twoPart') this.base.destinations.push({pos:this.pos, order: -1});
		this.spawns = base.spawns;
		this.availableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
		this.extentions = base.extensions;
		this.towers = base.commandCenter ? _.difference(base.towers, base.commandCenter.towers) : base.towers;
		if(this.base.layout == 'bunker') {
			this.battery = _.first(_.filter(this.room.containers, cont => insideBunkerBounds(cont.pos, this.base)))
			$.set(this, 'energyStructures', () => this.computeEnergyStructures());
		} else {
			this.link = this.pos.findClosestByLimitedRange(base.availableLinks, 2);
			this.base.linkNetwork.claimLink(this.link);
			this.battery = this.pos.findClosestByLimitedRange(this.room.containers, 2);
			this.energyStructures = (<(StructureSpawn | StructureExtension)[]>[]).concat(this.spawns, this.extentions);
		}
		this.productionPriorities = [];
		this.productionQueue = {};
		this.isOverloaded = false;
		this.settings = {
			refillTowersBelow: 750,
			linksRequestEnergyBelow: 0,
			suppressSpawning: false,
		}
    }
    refresh(): void {
		this.memory = Mem.wrap(this.base.memory, 'handOfNod', HandOfNodMemoryDefaults, true);
		$.refreshRoom(this);
		$.refresh(this, 'spawns', 'extentions', 'energyStructures', 'link', 'towers', 'battery');
		this.availableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
		this.isOverloaded = false;
		this.productionPriorities = [];
		this.productionQueue = {};
    }
    spawnCommander(): void {
       if (this.base.layout == 'bunker' && (this.base.storage || this.base.terminal) && this.base.assets[RESOURCE_ENERGY] > 10000){
			this.commander = new BunkerQueenCommander(this);
	   } else {
		   this.commander = new QueenOverlord(this);
	   }
	}

	get idlePos(): RoomPosition {
		if(this.battery) {
			return this.battery.pos;
		} else {
			return this.spawns[0].pos.availableNeighbors(true)[0]
		}
	}

	private computeEnergyStructures(): (StructureSpawn | StructureExtension)[] {
		if(this.base.layout == 'bunker'){
			const positions = _.map(energyStructureOrder, coord => getPosFromBunkerCoord(coord, this.base));
			let spawnsAndExtentions: (StructureSpawn | StructureExtension)[] = [];
			const energyStructures: (StructureSpawn | StructureExtension)[] = [];
			for( const pos of positions){
				const structure = _.find(pos.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) as StructureSpawn | StructureExtension;
				if (structure) {
					energyStructures.push(_.remove(spawnsAndExtentions, s=> s.id == structure.id)[0]);
				}
			}
			return _.compact(energyStructures.concat(spawnsAndExtentions));
		} else {
			let spawnsAndExtentions: (StructureSpawn | StructureExtension)[] = [];
			spawnsAndExtentions = [...this.spawns, ...this.extentions];
			return _.sortBy(spawnsAndExtentions, strucuture => strucuture.pos.getRangeTo(this.idlePos));
		}
	}

	private reigisterEnergyRequests(): void {
		if(this.link && this.link.store.getUsedCapacity(RESOURCE_ENERGY) == 0){
			this.base.linkNetwork.requestRecieve(this.link);
		}

		if(this.battery) {
			const threshold = this.base.stage == BasesStage.MCV ? .75 : .5;
			if(this.battery.store.getUsedCapacity(RESOURCE_ENERGY) < threshold * this.battery.store.getCapacity()){
				this.base.logisticsNetwork.requestInput(this.battery, {multiplier: 1.5});
			}

			if(hasMinerals(this.battery.store)){
				this.base.logisticsNetwork.requestOutputMinerals(this.battery);
			}
		}
		_.forEach(this.energyStructures, struct => this.transportRequests.requestInput(struct, Priority.NormalLow))
		const refillTowers = _.filter(this.towers, tower => tower.store.getUsedCapacity(RESOURCE_ENERGY) < this.settings.refillTowersBelow);
		_.forEach(refillTowers, tower => this.transportRequests.requestInput(tower, Priority.NormalLow))
	}

	private generateCreepName(roleName: string): string {
		let i = 0
		while(Game.creeps[(roleName + '_'+i)]){
			i++
		};
		return (roleName + '_' + i);
	}

	private spawnCreep(protoCreep: ProtoCreep, options: SpawnRequestOptions = {}): number {
		let spawnToUse: StructureSpawn | undefined;
		if(options.spawn){
			spawnToUse = options.spawn;
			if(spawnToUse.spawning){
				return ERR_SPECIFIED_SPAWN_BUSY;
			} else {
				_.remove(this.availableSpawns, spawn => spawn.id == spawnToUse!.id);
			}
		} else {
			spawnToUse = this.availableSpawns.shift();
		}
		if(spawnToUse){
			if(this.base.bunker && this.base.bunker.coreSpawn && spawnToUse.id == this.base.bunker.coreSpawn.id && !options.directions){
				options.directions = [TOP, RIGHT];
			}
			protoCreep.name = this.generateCreepName(protoCreep.name);
			if(bodyCost(protoCreep.body) > this.room.energyCapacityAvailable) {
				return ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH;
			}
			protoCreep.memory.data.origin = spawnToUse.pos.roomName;
			const result = spawnToUse.spawnCreep(protoCreep.body, protoCreep.name, {
				memory: protoCreep.memory,
				energyStructures: this.energyStructures,
				directions: options.directions,
			})
			if(result == OK) {
				return result;
			} else {
				this.availableSpawns.unshift(spawnToUse);
				return result;
			}
		} else {
			return ERR_BUSY;
		}
	}

	canSpawn(body: BodyPartConstant[]): boolean {
		return bodyCost(body) <= this.room.energyCapacityAvailable;
	}

	canSpawnUnit(unit: Unit): boolean{
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
				origin: ''
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
		if(!this._nextAvailability) {
			const allQueued = _.flatten(_.values(this.productionQueue)) as SpawnOrder[];
			const queueSpawnTime = _.sum(allQueued, order => order.protoCreep.body.length) * CREEP_SPAWN_TIME;
			const activeSpawnTime = _.sum(this.spawns, spawn => spawn.spawning ? spawn.spawning.remainingTime: 0);
			this._nextAvailability = (activeSpawnTime + queueSpawnTime) / this.spawns.length;
		}
		return this._nextAvailability;
	}

	enqueue(request: SpawnRequest): void {
		const protoCreep = this.generateProtoCreep(request.setup, request.commander);
		const priority = request.priority;
		if(this.canSpawn(protoCreep.body) && protoCreep.body.length > 0) {
			this._nextAvailability = undefined;
			if(!this.productionQueue[priority]){
				this.productionQueue[priority] = [];
				this.productionPriorities.push(priority);
			}
			this.productionQueue[priority].push({protoCreep, options: request.options});
		} else {
			log.debug(`${this.room.print}: cannot spawn creep ${protoCreep.name} with body ${JSON.stringify(protoCreep.body)}`)
		}
	}

	private spawnHighestPriorityCreep(): number | undefined {
		const sortedKeys = _.sortBy(this.productionPriorities);
		for (const priority of sortedKeys){
			const next = this.productionQueue[priority].shift();
			if(next){
				const {protoCreep, options} = next;
				const result = this.spawnCreep(protoCreep, options);
				if(result == OK) return result;
				else if (result == ERR_SPECIFIED_SPAWN_BUSY) return result;
				else {
					if(result != ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH) {
						this.productionQueue[priority].unshift(next);
						return result;
					}
				}
			}
		}
	}

	private handleSpawns(): void {
		while(this.availableSpawns.length > 0){
			const result = this.spawnHighestPriorityCreep();
			if(result == ERR_NOT_ENOUGH_ENERGY){
				this.isOverloaded = true;
			}
			if(result != OK && result != ERR_SPECIFIED_SPAWN_BUSY){
				break;
			}
		}
		for(const spawn of this.spawns){
			if(spawn.spawning && spawn.spawning.remainingTime <= 1 && spawn.pos.findInRange(FIND_MY_CREEPS, 1).length > 0) {
				let directions: DirectionConstant[];
				if(spawn.spawning.directions){
					directions = spawn.spawning.directions;
				} else {
					directions = _.map(spawn.pos.availableNeighbors(true), pos => spawn.pos.getDirectionTo(pos));
				}
				const exitPos = Pathing.positionAtDirection(spawn.pos, _.first(directions)) as RoomPosition;
				Movement.vacatePos(exitPos)
			}
		}
	}

    init(): void {
        this.reigisterEnergyRequests();
    }
    run(): void {
        if(!this.settings.suppressSpawning){
			this.handleSpawns();
		}
		this.recordStats();
	}

	private recordStats() {
		const spawnUsageThisTick = _.filter(this.spawns, spawn => spawn.spawning).length / this.spawns.length;
		const uptime = exponentialMovingAverage(spawnUsageThisTick, this.memory.stats.uptime, CREEP_LIFE_TIME);
		const longUptime = exponentialMovingAverage(spawnUsageThisTick, this.memory.stats.longUptime, 5 * CREEP_LIFE_TIME);
		const overload = exponentialMovingAverage(this.isOverloaded ? 1 : 0, this.memory.stats.overload, CREEP_LIFE_TIME);

		this.memory.stats = {
			overload, uptime, longUptime
		}
	}
}
