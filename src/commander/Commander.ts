import { Base } from "../Base";
import { CreepSetup } from "creeps/setups/CreepSetups";
import { Unit } from "unit/Unit";
import { log } from "console/log";
import { Pathing } from "Movement/Pathing";
import { SpawnRequest, SpawnRequestOptions } from "mcv/handOfNod";
import { boostParts } from "resources/map_resources";
import { Tasks } from "tasks/Tasks";
import { MIN_LIFETIME_FOR_BOOST } from "tasks/instances/getBoosted";
import { CombatUnit } from "unit/CombatUnit";

export interface CommanderInitializer {
    ref: string;
    room: Room | undefined;
    pos: RoomPosition;
    base: Base;
    memory: any;
    waypoints?: RoomPosition[];
}

export const hasBase = (initializer: CommanderInitializer | Base): initializer is CommanderInitializer => {
    return (<CommanderInitializer>initializer).base != undefined;
}

export const DEFAULT_PRESPAWN = 50;
export const MAX_SPANW_REQUESTS = 100;

export interface CreepRequestOptions {
    priority?: any;
    reassignIdle?: boolean;
    noLifetimeFilter?: boolean;
    prespawn?: number;
    partners?: CreepSetup[];
    options?: SpawnRequestOptions;
}

export interface UnitOptions {
    notifyWhenAttacked?: boolean;
    boostWishList?: _ResourceConstantSansEnergy[] | undefined;
}

export interface CommanderMemory {
    suspendUntil?: number;
}

const CommmanderMemoryDefaults: CommanderMemory = {}

export abstract class Commander {
    spawnGroup: any;
    protected initializer: CommanderInitializer | Base;
    room: Room | undefined;
    priority: number;
    base: Base;
    ref: string;
    name: string;

    private _creeps: {[roleName:string]: Creep[]};
    private _units: {[roleName:string]: Unit[]};
	private boosts: { [roleName: string]: _ResourceConstantSansEnergy[] | undefined };
	private _combatUnit: { [roleName: string]: CombatUnit[] };
    pos: RoomPosition;
    creepUsageReport: { [roleName: string]: [number, number] | undefined };

    constructor(initializer: CommanderInitializer | Base, name:string, priority:number){
        this.initializer = initializer;
        this.room = initializer.room;
        this.priority = priority;
        this.name = name;
        this.ref = initializer.ref + '>' + name;
        this.pos = initializer.pos;
        this.base = hasBase(initializer) ? initializer.base : initializer;
        this._units = {};
		this._creeps = {};
		this._combatUnit = {};
        this.recalculateCreeps();
        this.creepUsageReport = _.mapValues(this._creeps, creep => undefined);
        Cobal.commanders[this.ref] = this;
        Cobal.general.registerCommander(this);
    }
    get isSuspended(): boolean {
        return Cobal.general.isCommanderSuspended(this);
    }

    suspendFor(ticks: number): void{
        return Cobal.general.suspendCommanderFor(this, ticks);
    }

    supsendUntil(untilTicks:number): void {
        return Cobal.general.suspendCommanderUntil(this, untilTicks);
    }
    refresh(): void {
        this.room = Game.rooms[this.pos.roomName];
        this.recalculateCreeps();
        for(const role in this._creeps){
            for(const creep of this._creeps[role]){
                if(Cobal.units[creep.name]){
                    Cobal.units[creep.name].refresh();
                } else {
                    log.warning(`${this.print}: could not find and refresh unit with the name ${creep.name}`);
                }
            }
        }
    }

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.pos.roomName}">[${this.ref}]</a>`;
    }
    recalculateCreeps(): void {
       this._creeps = _.mapValues(Cobal.cache.commanders[this.ref], creepsOfRole => _.map(creepsOfRole, creepName => Game.creeps[creepName.name]));
       for(const role in this._units){
            this.synchronizeUnits(role);
	   }
	   for(const role in this._combatUnit){
		   this.synchronizeCombatUnit(role);
	   }
    }

    protected unit(role:string, opts: UnitOptions = {}): Unit[] {
        if(!this._units[role]){
            this._units[role] = [];
            this.synchronizeUnits(role, opts.notifyWhenAttacked);
        }
        return this._units[role];
    }

    private synchronizeUnits(role:string, notifyWhenAttacked?: boolean): void {
        const unitNames = _.zipObject(_.map((this._units[role] || []), unit => [unit.name, true])) as {[name: string]: boolean;};
        const creepNames = _.zipObject(_.map((this._creeps[role] || []), creep => [creep.name, true])) as {[name: string]: boolean;};
        for(const creep of this._creeps[role] || []){
            if(!unitNames[creep.name]){
                this._units[role].push(Cobal.units[creep.name] || new Unit(creep, notifyWhenAttacked));
            }
        }
        for (const unit of this._units[role]){
            if(!creepNames[unit.name]){
                _.remove(this._units[role], u => u.name == unit.name);
            }
        }
	}
	
		/**
	 * Wraps all creeps of a given role to CombatZerg objects and updates the contents in future ticks
	 */
	protected combatUnit(role: string, opts: UnitOptions = {}): CombatUnit[] {
		if (!this._combatUnit[role]) {
			this._combatUnit[role] = [];
			this.synchronizeCombatUnit(role, opts.notifyWhenAttacked);
		}
		if (opts.boostWishList) {
			this.boosts[role] = opts.boostWishList;
		}
		return this._combatUnit[role];
	}

	synchronizeCombatUnit(role: string, notifyWhenAttacked?: boolean) {
				// Synchronize the corresponding sets of CombatZerg
		const zergNames = _.zipObject(_.map(this._combatUnit[role] || [],
											zerg => [zerg.name, true])) as { [name: string]: boolean };
		const creepNames = _.zipObject(_.map(this._creeps[role] || [],
											 creep => [creep.name, true])) as { [name: string]: boolean };
		// Add new creeps which aren't in the _combatZerg record
		for (const creep of this._creeps[role] || []) {
			if (!zergNames[creep.name]) {
				if (Cobal.units[creep.name] && (<CombatUnit>Cobal.units[creep.name]).isCombatZerg) {
					this._combatUnit[role].push(Cobal.units[creep.name]);
				} else {
					this._combatUnit[role].push(new CombatUnit(creep, notifyWhenAttacked));
				}
			}
		}
		// Remove dead/reassigned creeps from the _combatZerg record
		for (const zerg of this._combatUnit[role]) {
			if (!creepNames[zerg.name]) {
				_.remove(this._combatUnit[role], z => z.name == zerg.name);
			}
		}
	}

    get outpostIndex(): number {
        return _.findIndex(this.base.roomNames, roomName => roomName == this.pos.roomName);
    }

    protected reassignIdleCreeps(role: string): void {
        const idleCreeps = _.filter(this.base.getCreepsByRole(role), creep => !getCommander(creep));
        for(const creep of idleCreeps){
            setCommander(creep, this);
        }
    }
    protected wishList(quantity: number, setup: CreepSetup, opts = {} as CreepRequestOptions){
		_.defaults(opts, {priority: this.priority, prespawn: DEFAULT_PRESPAWN, reassignIdle: false});
		let creepQuantity: number;
		if (opts.noLifetimeFilter) {
			creepQuantity = (this._creeps[setup.role] || []).length;
		} else if (_.has(this.initializer, 'waypoints')) {
			// TODO: replace hardcoded distance with distance computed through portals
			creepQuantity = this.lifetimeFilter(this._creeps[setup.role] || [], opts.prespawn, 500).length;
		} else {
			creepQuantity = this.lifetimeFilter(this._creeps[setup.role] || [], opts.prespawn).length;
		}
		let spawnQuantity = quantity - creepQuantity;
		if (opts.reassignIdle && spawnQuantity > 0) {
			const idleCreeps = _.filter(this.base.getCreepsByRole(setup.role), creep => !getCommander(creep));
			for (let i = 0; i < Math.min(idleCreeps.length, spawnQuantity); i++) {
				setCommander(idleCreeps[i], this);
				spawnQuantity--;
			}
		}
		// A bug in outpostDefenseOverlord caused infinite requests and cost me two botarena rounds before I found it...
		if (spawnQuantity > MAX_SPANW_REQUESTS) {
			log.warning(`Too many requests for ${setup.role}s submitted by ${this.print}! (Check for errors.)`);
		} else {
			for (let i = 0; i < spawnQuantity; i++) {
				this.requestCreep(setup, opts);
			}
		}
		this.creepReport(setup.role, creepQuantity, quantity);
    }

    protected requestCreep(setup: CreepSetup, opts = {} as CreepRequestOptions) {
		_.defaults(opts, {priority: this.priority, prespawn: DEFAULT_PRESPAWN});
		const spawner = this.spawnGroup || this.base.spawnGroup || this.base.handOfNod;
		if (spawner) {
			const request: SpawnRequest = {
				setup   : setup,
				commander: this,
				priority: opts.priority!,
			};
			if (opts.partners) {
				request.patners = opts.partners;
			}
			if (opts.options) {
				request.options = opts.options;
			}
			spawner.enqueue(request);
		} else {
			if (Game.time % 100 == 0) {
				log.warning(`Overlord ${this.ref} @ ${this.pos.print}: no spawner object!`);
			}
		}
    }

    parkCreepsIfIdle(creeps: Unit[], outsidehandOfNod = true){
        for (const creep of creeps) {
			if (!creep) {
				console.log(`creeps: ${_.map(creeps, creep => creep.name)}`);
				continue;
			}
			if (creep.isIdle && creep.canExecute('move')) {
				if (this.base.handOfNod) {
					const hatcheryRestrictedRange = 6;
					if (creep.pos.getRangeTo(this.base.handOfNod.pos) < hatcheryRestrictedRange) {
						const hatcheryBorder = this.base.handOfNod.pos.getPositionsAtRange(hatcheryRestrictedRange);
						const moveToPos = creep.pos.findClosestByRange(hatcheryBorder);
						if (moveToPos) creep.goTo(moveToPos);
					} else {
						creep.park();
					}
				} else {
					creep.park();
				}
			}
		}
    }

    abstract run(): void;
    abstract init(): void;
    preInit() {
        // Handle resource requests for boosts
		for (const role in this.boosts) {
			if (this.boosts[role] && this._creeps[role]) {
				this.requestBoosts(_.compact(_.map(this._creeps[role], creep => Cobal.units[creep.name])));
			}
		}
    }

    autoRun(roleCreeps: Unit[], taskHandler: (creep: Unit) => void, fleeCallback?: (creep: Unit) => boolean) {
		for (const creep of roleCreeps) {
			if (!!fleeCallback) {
				if (fleeCallback(creep)) continue;
			}
			if (creep.isIdle) {
				if (this.shouldBoost(creep)) {
					this.handleBoosting(creep);
				} else {
					taskHandler(creep);
				}
			}
            creep.run();
        }
    }

    	/**
	 * Handle boosting of a creep; should be called during run()
	 */
	protected handleBoosting(creep: Unit): void {
		const base = Cobal.bases[creep.room.name] as Base | undefined;
		const evolutionChamber = base ? base.evolutionChamber : undefined;

		if (this.boosts[creep.roleName] && evolutionChamber) {
			const boosts = _.filter(this.boosts[creep.roleName]!, boost =>
				(creep.boostCounts[boost] || 0) < creep.getActiveBodyparts(boostParts[boost]));
			for (const boost of boosts) {
				const boostLab = _.find(evolutionChamber.boostingLabs, lab => lab.mineralType == boost);
				if (boostLab) {
					creep.task = Tasks.getBoosted(boostLab, boost);
				}
			}
		}
    }

    	/**
	 * Request a boost from the evolution chamber; should be called during init()
	 */
	private requestBoostsForCreep(creep: Unit): void {
		const colony = Cobal.bases[creep.room.name] as Base | undefined;
		const evolutionChamber = colony ? colony.evolutionChamber : undefined;
		if (evolutionChamber && this.boosts[creep.roleName]) {
			const boosts = _.filter(this.boosts[creep.roleName]!, boost =>
				(creep.boostCounts[boost] || 0) < creep.getActiveBodyparts(boostParts[boost]));
			for (const boost of boosts) {
				evolutionChamber.requestBoost(creep, boost);
			}
		}
    }

    	/**
	 * Return whether you are capable of boosting a creep to the desired specifications
	 */
	shouldBoost(creep: Unit, onlyBoostInSpawn = false): boolean {
		// Can't boost if there's no evolution chamber or TTL is less than threshold
		const colony = Cobal.bases[creep.room.name] as Base | undefined;
		const evolutionChamber = colony ? colony.evolutionChamber : undefined;
		if (!evolutionChamber ||
			(creep.ticksToLive && creep.ticksToLive < MIN_LIFETIME_FOR_BOOST * creep.lifetime)) {
			return false;
		}

		// EDIT: they removed in-spawn boosting... RIP :(
		// // If you're in a bunker layout at level 8 with max labs, only boost while spawning
		// if (onlyBoostInSpawn && this.colony.bunker && this.colony.level == 8 && this.colony.labs.length == 10) {
		// 	if (!creep.spawning) {
		// 		return false;
		// 	}
		// }

		// Otherwise just boost if you need it and can get the resources
		if (this.boosts[creep.roleName]) {
			const boosts = _.filter(this.boosts[creep.roleName]!, boost =>
				(creep.boostCounts[boost] || 0) < creep.getActiveBodyparts(boostParts[boost]));
			if (boosts.length > 0) {
				return _.all(boosts, boost => evolutionChamber!.canBoost(creep.body, boost));
			}
		}
		return false;
    }

    canBoostSetup(setup: CreepSetup): boolean {
		if (this.base.evolutionChamber && this.boosts[setup.role] && this.boosts[setup.role]!.length > 0) {
			let energyCapacityAvailable: number;
			if (this.spawnGroup) {
				energyCapacityAvailable = this.spawnGroup.energyCapacityAvailable;
			} else if (this.base.spawnGroup) {
				energyCapacityAvailable = this.base.spawnGroup.energyCapacityAvailable;
			} else if (this.base.handOfNod) {
				energyCapacityAvailable = this.base.handOfNod.room.energyCapacityAvailable;
			} else {
				return false;
			}
			const body = _.map(setup.generateBody(energyCapacityAvailable), part => ({type: part, hits: 100}));
			if (body.length == 0) return false;
			return _.all(this.boosts[setup.role]!,
						 boost => this.base.evolutionChamber!.canBoost(body, boost));
		}
		return false;
	}


    protected creepReport(role:string, currentAmt: number, neededAmt: number){
        this.creepUsageReport[role] = [currentAmt, neededAmt];
    }

	// TODO: include creep move speed
	lifetimeFilter(creeps: (Creep | Unit)[], prespawn = DEFAULT_PRESPAWN, spawnDistance?: number): (Creep | Unit)[] {
		if (!spawnDistance) {
			spawnDistance = 0;
			if (this.spawnGroup) {
				const distances = _.take(_.sortBy(this.spawnGroup.memory.distances), 2);
				spawnDistance = (_.sum(distances) / distances.length) || 0;
			} else if (this.base.handOfNod) {
				// Use distance or 0 (in case distance returns something undefined due to incomplete pathfinding)
				spawnDistance = Pathing.distance(this.pos, this.base.handOfNod.pos) || 0;
			}
			if (this.base.isIncubating && this.base.spawnGroup) {
				spawnDistance += this.base.spawnGroup.stats.avgDistance;
			}
		}

		/* The last condition fixes a bug only present on private servers that took me a fucking week to isolate.
		 * At the tick of birth, creep.spawning = false and creep.ticksTolive = undefined
		 * See: https://screeps.com/forum/topic/443/creep-spawning-is-not-updated-correctly-after-spawn-process */
		return _.filter(creeps, creep =>
			creep.ticksToLive! > CREEP_SPAWN_TIME * creep.body.length + spawnDistance! + prespawn ||
			creep.spawning || (!creep.spawning && !creep.ticksToLive));
    }
    /**
	 * Request any needed boosting resources from terminal network
	 */
	private requestBoosts(creeps: Unit[]): void {
		for (const creep of creeps) {
			if (this.shouldBoost(creep)) {
				this.requestBoostsForCreep(creep);
			}
		}
	}

    visuals(): void {

	}
}


export function getCommander(creep: Unit | Creep): Commander | null {
	if (creep.memory[_MEM.COMMANDER]) {
		return Cobal.commanders[creep.memory[_MEM.COMMANDER]!] || undefined;
	} else {
		return null;
	}
}

export function setCommander(creep: Unit | Creep, newCommander: Commander | null) {
	// Remove cache references to old assignments
	const roleName = creep.memory.role;
	const ref = creep.memory[_MEM.COMMANDER];
	const oldCommander: Commander | null = ref ? Cobal.commanders[ref] : null;
	if (ref && Cobal.cache.commanders[ref] && Cobal.cache.commanders[ref][roleName]) {
		_.remove(Cobal.cache.commanders[ref][roleName], name => name == creep.name);
	}
	if (newCommander) {
		// Change to the new overlord's colony
		creep.memory[_MEM.BASE] = newCommander.base.name;
		// Change assignments in memory
		creep.memory[_MEM.COMMANDER] = newCommander.ref;
		// Update the cache references
		if (!Cobal.cache.commanders[newCommander.ref]) {
			Cobal.cache.commanders[newCommander.ref] = {};
		}
		if (!Cobal.cache.commanders[newCommander.ref][roleName]) {
			Cobal.cache.commanders[newCommander.ref][roleName] = [];
		}
		Cobal.cache.commanders[newCommander.ref][roleName].push(creep.name);
	} else {
		creep.memory[_MEM.COMMANDER] = null;
	}
	if (oldCommander) oldCommander.recalculateCreeps();
	if (newCommander) newCommander.recalculateCreeps();
	log.info(`${creep.name} has been reassigned from ${oldCommander ? oldCommander.print : 'IDLE'} ` +
			 `to ${newCommander ? newCommander.print : 'IDLE'}`);
}
