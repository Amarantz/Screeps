import Cobal from "Cobal";
import { NEW_COBAL_INTERVAL } from "~settings";
import { log } from "console";
import { Movement, MoveOptions } from "movement/Movement";
import { Base } from "Base";
import { Task } from "Task/Task";
import { initializeTask } from "Task/initializer";

export function setOverlord(creep: Unit | Creep, newOverlord: Commander | null) {
	// Remove cache references to old assignments
	const roleName = creep.memory.role;
	const ref = creep.memory[_MEM.COMMANDER];
	const oldCommander: Commader | null = ref ? Cobal.commander[ref] : null;
	if (ref && Cobal.cache.commander[ref] && Cobal.cache.commanders[ref][roleName]) {
		_.remove(Cobal.cache.commander[ref][roleName], name => name == creep.name);
	}
	if (newOverlord) {
		// Change to the new overlord's colony
		creep.memory[_MEM.BASE] = newOverlord.colony.name;
		// Change assignments in memory
		creep.memory[_MEM.COMMANDER] = newOverlord.ref;
		// Update the cache references
		if (!Cobal.cache.commanders[newOverlord.ref]) {
			Cobal.cache.commanders[newOverlord.ref] = {};
		}
		if (!Cobal.cache.commanders[newOverlord.ref][roleName]) {
			Cobal.cache.commanders[newOverlord.ref][roleName] = [];
		}
		Cobal.cache.overlords[newOverlord.ref][roleName].push(creep.name);
	} else {
		creep.memory[_MEM.COMMANDER] = null;
	}
	if (oldCommander) oldCommander.recalculateCreeps();
	if (newCommander) newCommander.recalculateCreeps();
}


export function normalizeUnit(creep: Unit | Creep): Unit | Creep {
	return Cobal.unit[creep.name] || creep;
}

export function toCreep(creep: Unit | Creep): Creep {
	return isUnit(creep) ? creep.creep : creep;
}

// Last pipeline is more complex because it depends on the energy a creep has; sidelining this for now
const actionPipelines: string[][] = [
	['harvest', 'attack', 'build', 'repair', 'dismantle', 'attackController', 'rangedHeal', 'heal'],
	['rangedAttack', 'rangedMassAttack', 'build', 'repair', 'rangedHeal'],
	// ['upgradeController', 'build', 'repair', 'withdraw', 'transfer', 'drop'],
];

interface ParkingOptions {
	range: number;
	exactRange: boolean;
	offroad: boolean;
}

interface FleeOptions {
	dropEnergy?: boolean;
	invalidateTask?: boolean;
}

export function getCommander(creep: Unit | Creep): Commander | null {
	if (creep.memory[_MEM.COMMANDER]) {
		return Cobal.commanders[creep.memory[_MEM.COMMANDER]!] || null;
	} else {
		return null;
	}
}

const RANGES = {
	BUILD   : 3,
	REPAIR  : 3,
	TRANSFER: 1,
	WITHDRAW: 1,
	HARVEST : 1,
	DROP    : 0,
};

export default class Unit {
    creep: Creep;
    body: BodyPartDefinition[];
    store: Store<ResourceConstant, false>;
    fatigue: number;
    hits: number;
    hitsMax: number;
    id: Id<Creep>;
    memory: CreepMemory;
    name: string;
    pos: RoomPosition;
    nextPos: RoomPosition;
    ref: string;
    roleName: string;
    room: Room;
    saying: string;
    spawning: boolean;
    ticksToLive: number | undefined;
    lifetime: number;
    actionLog: {[otherProperty:string]: any};
    blockMovement: boolean;
    notifiyWhenAttacked(notifyWhenAttacked: boolean) {
        throw new Error("Method not implemented.");
    }
    private _task: Task | null;
    constructor(creep:Creep, notifyWhenAttacked = true){
        this.creep = creep;
        this.body = creep.body;
        this.store = creep.store;
        this.fatigue = creep.fatigue;
        this.hits = creep.hits;
        this.hitsMax = creep.hitsMax;
        this.id = creep.id;
        this.memory = creep.memory;
        this.name = creep.name;
        this.pos = creep.pos;
        this.nextPos = creep.pos;
        this.ref = creep.ref;
        this.roleName = creep.memory.role;
        this.room = creep.room;
        this.saying = creep.saying;
        this.spawning = creep.spawning;
        this.ticksToLive = creep.ticksToLive;
        this.lifetime = this.getBodyparts(CLAIM) > 0 ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
        this.actionLog = {};
        this.blockMovement = false;
        Cobal.unit[this.name] = this;
        global[this.name] = this;
        if(!notifyWhenAttacked && (this.ticksToLive || 0) >= this.lifetime - NEW_COBAL_INTERVAL + 1)) {
            this.notifiyWhenAttacked(notifyWhenAttacked);
        }
    }

    refresh(): void {
        const creep = Game.creeps[this.name];
        if(creep) {
            this.creep = creep;
			this.pos = creep.pos;
			this.nextPos = creep.pos;
			this.body = creep.body;
            this.store = creep.store;
			this.fatigue = creep.fatigue;
			this.hits = creep.hits;
			this.memory = creep.memory;
			this.roleName = creep.memory.role;
			this.room = creep.room;
			this.saying = creep.saying;
			this.spawning = creep.spawning;
			this.ticksToLive = creep.ticksToLive;
			this.actionLog = {};
			this.blockMovement = false;
			this._task = null; // todo
        } else {
			log.debug(`Deleting from global`);
			delete Cobal.unit[this.name];
			delete global[this.name];
		}
    }
    debug(...args: any[]) {
		if (this.memory.debug) {
			log.debug(this.print, args);
		}
    }

    get ticksUntilSpawned(): number | undefined {
		if (this.spawning) {
			const spawner = this.pos.lookForStructure(STRUCTURE_SPAWN) as StructureSpawn;
			if (spawner && spawner.spawning) {
				return spawner.spawning.remainingTime;
			} else {
				// Shouldn't ever get here
				console.log(`Error determining ticks to spawn for ${this.name} @ ${this.pos.print}!`);
			}
		}
    }
    get print(): string {
		return '<a href="#!/room/' + Game.shard.name + '/' + this.pos.roomName + '">[' + this.name + ']</a>';
    }

    // Wrapped creep methods ===========================================================================================

	// attack(target: Creep | Structure) {
	// 	const result = this.creep.attack(target);
	// 	if (result == OK) {
	// 		this.actionLog.attack = true;
	// 		if (isCreep(target)) {
	// 			if (target.hitsPredicted == undefined) target.hitsPredicted = target.hits;
	// 			target.hitsPredicted -= CombatIntel.predictedDamageAmount(this.creep, target, 'attack');
	// 			// account for hitback effects
	// 			if (this.creep.hitsPredicted == undefined) this.creep.hitsPredicted = this.creep.hits;
	// 			this.creep.hitsPredicted -= CombatIntel.predictedDamageAmount(target, this.creep, 'attack');
	// 		}
	// 		if (this.memory.talkative) this.say(`💥`);
	// 	}
	// 	return result;
	// }

	attackController(controller: StructureController) {
		const result = this.creep.attackController(controller);
		if (!this.actionLog.attackController) this.actionLog.attackController = (result == OK);
		return result;
	}

	build(target: ConstructionSite) {
		const result = this.creep.build(target);
		if (!this.actionLog.build) this.actionLog.build = (result == OK);
		return result;
	}

	goBuild(target: ConstructionSite) {
		if (this.pos.inRangeToPos(target.pos, RANGES.BUILD)) {
			return this.build(target);
		} else {
			return this.goTo(target);
		}
	}

	cancelOrder(methodName: string): OK | ERR_NOT_FOUND {
		const result = this.creep.cancelOrder(methodName);
		if (result == OK) this.actionLog[methodName] = false;
		return result;
	}

	claimController(controller: StructureController) {
		const result = this.creep.claimController(controller);
		if (!this.actionLog.claimController) this.actionLog.claimController = (result == OK);
		return result;
	}

	dismantle(target: Structure): CreepActionReturnCode {
		const result = this.creep.dismantle(target);
		if (!this.actionLog.dismantle) this.actionLog.dismantle = (result == OK);
		return result;
	}

	drop(resourceType: ResourceConstant, amount?: number) {
		const result = this.creep.drop(resourceType, amount);
		if (!this.actionLog.drop) this.actionLog.drop = (result == OK);
		return result;
	}

	goDrop(pos: RoomPosition, resourceType: ResourceConstant, amount?: number) {
		if (this.pos.inRangeToPos(pos, RANGES.DROP)) {
			return this.drop(resourceType, amount);
		} else {
			return this.goTo(pos);
		}
	}

	generateSafeMode(target: StructureController) {
		return this.creep.generateSafeMode(target);
	}

	harvest(source: Source | Mineral) {
		const result = this.creep.harvest(source);
		if (!this.actionLog.harvest) this.actionLog.harvest = (result == OK);
		return result;
	}

	goHarvest(source: Source | Mineral) {
		if (this.pos.inRangeToPos(source.pos, RANGES.HARVEST)) {
			return this.harvest(source);
		} else {
			return this.goTo(source);
		}
	}

	move(direction: DirectionConstant, force = false) {
		if (!this.blockMovement && !force) {
			const result = this.creep.move(direction);
			if (result == OK) {
				if (!this.actionLog.move) this.actionLog.move = true;
				this.nextPos = this.pos.getPositionAtDirection(direction);
			}
			return result;
		} else {
			return ERR_BUSY;
		}
	}

	notifyWhenAttacked(enabled: boolean) {
		return this.creep.notifyWhenAttacked(enabled);
	}

	pickup(resource: Resource) {
		const result = this.creep.pickup(resource);
		if (!this.actionLog.pickup) this.actionLog.pickup = (result == OK);
		return result;
	}

	// rangedAttack(target: Creep | Structure) {
	// 	const result = this.creep.rangedAttack(target);
	// 	if (result == OK) {
	// 		this.actionLog.rangedAttack = true;
	// 		if (isCreep(target)) {
	// 			if (target.hitsPredicted == undefined) target.hitsPredicted = target.hits;
	// 			target.hitsPredicted -= CombatIntel.predictedDamageAmount(this, target, 'rangedAttack');
	// 		}
	// 		if (this.memory.talkative) this.say(`🔫`);
	// 	}
	// 	return result;
	// }

	// rangedMassAttack() {
	// 	const result = this.creep.rangedMassAttack();
	// 	if (result == OK) {
	// 		this.actionLog.rangedMassAttack = true;
	// 		for (const target of this.pos.findInRange(this.room.hostiles, 3)) {
	// 			if (target.hitsPredicted == undefined) target.hitsPredicted = target.hits;
	// 			target.hitsPredicted -= CombatIntel.getMassAttackDamageTo(this, target);
	// 		}
	// 		if (this.memory.talkative) this.say(`💣`);
	// 	}
	// 	return result;
	// }

	repair(target: Structure) {
		const result = this.creep.repair(target);
		if (!this.actionLog.repair) this.actionLog.repair = (result == OK);
		return result;
	}

	goRepair(target: Structure) {
		if (this.pos.inRangeToPos(target.pos, RANGES.REPAIR)) {
			return this.repair(target);
		} else {
			return this.goTo(target);
		}
	}

	reserveController(controller: StructureController) {
		const result = this.creep.reserveController(controller);
		if (!this.actionLog.reserveController) this.actionLog.reserveController = (result == OK);
		return result;
	}

	/* Say a message; maximum message length is 10 characters */
	say(message: string, pub?: boolean) {
		return this.creep.say(message, pub);
	}

	signController(target: StructureController, text: string) {
		const result = this.creep.signController(target, text);
		if (!this.actionLog.signController) this.actionLog.signController = (result == OK);
		return result;
	}

	suicide() {
		return this.creep.suicide();
	}

	upgradeController(controller: StructureController) {
		const result = this.creep.upgradeController(controller);
		if (!this.actionLog.upgradeController) this.actionLog.upgradeController = (result == OK);
		// Determine amount of upgrade power
		// let weightedUpgraderParts = _.map(this.boostCounts, )
		// let upgradeAmount = this.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER;
		// let upgrade

		// Stats.accumulate(`colonies.${this.colony.name}.rcl.progressTotal`, upgradeAmount);
		return result;
	}

	// heal(target: Creep | Unit, rangedHealInstead = false) {
	// 	if (rangedHealInstead && !this.pos.isNearTo(target)) {
	// 		return this.rangedHeal(target);
	// 	}
	// 	const creep = toCreep(target);
	// 	const result = this.creep.heal(creep);
	// 	if (result == OK) {
	// 		this.actionLog.heal = true;
	// 		if (creep.hitsPredicted == undefined) creep.hitsPredicted = creep.hits;
	// 		creep.hitsPredicted += CombatIntel.getHealAmount(this);
	// 		if (this.memory.talkative) this.say('🚑');
	// 	}
	// 	return result;
	// }

	// rangedHeal(target: Creep | Unit) {
	// 	const creep = toCreep(target);
	// 	const result = this.creep.rangedHeal(creep);
	// 	if (result == OK) {
	// 		this.actionLog.rangedHeal = true;
	// 		if (creep.hitsPredicted == undefined) creep.hitsPredicted = creep.hits;
	// 		creep.hitsPredicted += CombatIntel.getRangedHealAmount(this);
	// 		if (this.memory.talkative) this.say(`💉`);
	// 	}
	// 	return result;
	// }

	transfer(target: Creep | Unit | Structure, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
		let result: ScreepsReturnCode;
		if (target instanceof Unit) {
			result = this.creep.transfer(target.creep, resourceType, amount);
		} else {
			result = this.creep.transfer(target, resourceType, amount);
		}
		if (!this.actionLog.transfer) this.actionLog.transfer = (result == OK);
		return result;
	}

	goTransfer(target: Creep | Unit | Structure, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
		if (this.pos.inRangeToPos(target.pos, RANGES.TRANSFER)) {
			return this.transfer(target, resourceType, amount);
		} else {
			return this.goTo(target);
		}
	}

	withdraw(target: Structure | Tombstone, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
		const result = this.creep.withdraw(target, resourceType, amount);
		if (!this.actionLog.withdraw) this.actionLog.withdraw = (result == OK);
		return result;
	}

	goWithdraw(target: Structure | Tombstone, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
		if (this.pos.inRangeToPos(target.pos, RANGES.WITHDRAW)) {
			return this.withdraw(target, resourceType, amount);
		} else {
			return this.goTo(target);
		}
	}

	// Simultaneous creep actions --------------------------------------------------------------------------------------

	/**
	 * Determine whether the given action will conflict with an action the creep has already taken.
	 * See http://docs.screeps.com/simultaneous-actions.html for more details.
	 */
	canExecute(actionName: string): boolean {
		// Only one action can be executed from within a single pipeline
		let conflictingActions: string[] = [actionName];
		for (const pipeline of actionPipelines) {
			if (pipeline.includes(actionName)) conflictingActions = conflictingActions.concat(pipeline);
		}
		for (const action of conflictingActions) {
			if (this.actionLog[action]) {
				return false;
			}
		}
		return true;
	}

	// Body configuration and related data -----------------------------------------------------------------------------

	getActiveBodyparts(type: BodyPartConstant): number {
		return this.creep.getActiveBodyparts(type);
	}

	/* The same as creep.getActiveBodyparts, but just counts bodyparts regardless of condition. */
	getBodyparts(partType: BodyPartConstant): number {
		return _.filter(this.body, (part: BodyPartDefinition) => part.type == partType).length;
	}

	// Custom creep methods ============================================================================================

	// Carry methods

	get hasMineralsInCarry(): boolean {
		for (const resourceType in this.store) {
			if (resourceType != RESOURCE_ENERGY && (this.store[<ResourceConstant>resourceType] || 0) > 0) {
				return true;
			}
		}
		return false;
	}

	// Boosting logic --------------------------------------------------------------------------------------------------

	get boosts(): _ResourceConstantSansEnergy[] {
		return this.creep.boosts;
	}

	get boostCounts(): { [boostType: string]: number } {
		return this.creep.boostCounts;
	}

	get needsBoosts(): boolean {
		if (this.commander) {
			return this.commander.shouldBoost(this);
		}
		return false;
    }
    // Commander Logic
    get commander(): Commander | null {
        return getCommander(this);
    }

    set commander(commander: Commander | null){
        setCommander(this, commander);
    }

    reassign(newCommander: Commander | null, newRole: string, invalidateTask = true){
        this.commander = newCommander;
        this.roleName = newRole;
        this.memory.role = newRole;
        if(invalidateTask) {
            this.task = null;
        }
    }


	/**
	 * Colony that the creep belongs to.
	 */
	get base(): Base | undefined {
		if (this.memory[_MEM.BASE] != undefined) {
			return global.Cobal.bases[this.memory[_MEM.BASE] as string];
		} else {
			return undefined;
		}
	}

	set base(newBase: Base | undefined) {
		if (newBase != undefined) {
			this.memory[_MEM.BASE] = newBase.name;
		} else {
			this.memory[_MEM.BASE] = undefined;
		}
	}

	/**
	 * If the creep is in a colony room or outpost
	 */
	get inColonyRoom(): boolean {
		return global.Cobal.baseMap[this.room.name] == this.memory[_MEM.BASE];
	}

    // Movement and location -------------------------------------------------------------------------------------------

	goTo(destination: RoomPosition | HasPos, options: MoveOptions = {}) {
		return Movement.goTo(this, destination, options);
	}

	goToRoom(roomName: string, options: MoveOptions = {}) {
		return Movement.goToRoom(this, roomName, options);
	}

	inSameRoomAs(target: HasPos): boolean {
		return this.pos.roomName == target.pos.roomName;
	}

	safelyInRoom(roomName: string): boolean {
		return this.room.name == roomName && !this.pos.isEdge;
	}

	get inRampart(): boolean {
		return this.creep.inRampart;
	}

	get isMoving(): boolean {
		const moveData = this.memory._go as MoveData | undefined;
		return !!moveData && !!moveData.path && moveData.path.length > 1;
	}

	/**
	 * Kite around hostiles in the room
	 */
	kite(avoidGoals: (RoomPosition | HasPos)[] = this.room.hostiles, options: MoveOptions = {}): number | undefined {
		_.defaults(options, {
			fleeRange: 5
		});
		return Movement.kite(this, avoidGoals, options);
	}

	private defaultFleeGoals() {
		let fleeGoals: (RoomPosition | HasPos)[] = [];
		fleeGoals = fleeGoals.concat(this.room.hostiles)
							 .concat(_.filter(this.room.keeperLairs, lair => (lair.ticksToSpawn || Infinity) < 10));
		return fleeGoals;
	}

	/**
	 * Flee from hostiles in the room, while not repathing every tick
	 */
	flee(avoidGoals: (RoomPosition | HasPos)[] = this.room.fleeDefaults,
		 fleeOptions: FleeOptions              = {},
		 moveOptions: MoveOptions              = {}): boolean {
		if (avoidGoals.length == 0) {
			return false;
		} else if (this.room.controller && this.room.controller.my && this.room.controller.safeMode) {
			return false;
		} else {
			const fleeing = Movement.flee(this, avoidGoals, fleeOptions.dropEnergy, moveOptions) != undefined;
			if (fleeing) {
				// Drop energy if needed
				if (fleeOptions.dropEnergy && this.store.getUsedCapacity() > 0) {
					const nearbyContainers = this.pos.findInRange(this.room.storageUnits, 1);
					if (nearbyContainers.length > 0) {
						this.transfer(_.first(nearbyContainers), RESOURCE_ENERGY);
					} else {
						this.drop(RESOURCE_ENERGY);
					}
				}
				// Invalidate task
				if (fleeOptions.invalidateTask) {
					this.task = null;
				}
			}
			return fleeing;
		}
	}

	/**
	 * Park the creep off-roads
	 */
	park(pos: RoomPosition = this.pos, maintainDistance = false): number {
		return Movement.park(this, pos, maintainDistance);
	}

	/**
	 * Moves a creep off of the current tile to the first available neighbor
	 */
	moveOffCurrentPos(): number | undefined {
		return Movement.moveOffCurrentPos(this);
	}

	/**
	 * Moves onto an exit tile
	 */
	moveOnExit(): ScreepsReturnCode | undefined {
		return Movement.moveOnExit(this);
	}

	/**
	 * Moves off of an exit tile
	 */
	moveOffExit(avoidSwamp = true): ScreepsReturnCode {
		return Movement.moveOffExit(this, avoidSwamp);
	}

	moveOffExitToward(pos: RoomPosition, detour = true): number | undefined {
		return Movement.moveOffExitToward(this, pos, detour);
	}



	// Miscellaneous fun stuff -----------------------------------------------------------------------------------------

	sayLoop(messageList: string[], pub?: boolean) {
		return this.say(messageList[Game.time % messageList.length], pub);
	}

	sayRandom(phrases: string[], pub?: boolean) {
		return this.say(phrases[Math.floor(Math.random() * phrases.length)], pub);
    }

    	/**
	 * Wrapper for _task
	 */
	get task(): Task | null {
		if (!this._task) {
			this._task = this.memory.task ? initializeTask(this.memory.task) : null;
		}
		return this._task;
	}

	/**
	 * Assign the creep a task with the setter, replacing creep.assign(Task)
	 */
	set task(task: Task | null) {
		// Unregister target from old task if applicable
		const oldProtoTask = this.memory.task;
		if (oldProtoTask) {
			const oldRef = oldProtoTask._target.ref;
			if (global.Cobal.cache.targets[oldRef]) {
				_.remove(global.Cobal.cache.targets[oldRef], name => name == this.name);
			}
		}
		// Set the new task
		this.memory.task = task ? task.proto : null;
		if (task) {
			if (task.target) {
				// Register task target in cache if it is actively targeting something (excludes goTo and similar)
				if (!global.Cobal.cache.targets[task.target.ref]) {
					global.Cobal.cache.targets[task.target.ref] = [];
				}
				global.Cobal.cache.targets[task.target.ref].push(this.name);
			}
			// Register references to creep
			task.creep = this;
		}
		// Clear cache
		this._task = null;
	}

	/**
	 * Does the creep have a valid task at the moment?
	 */
	get hasValidTask(): boolean {
		return !!this.task && this.task.isValid();
	}

	/**
	 * Creeps are idle if they don't have a task.
	 */
	get isIdle(): boolean {
		return !this.task || !this.task.isValid();
	}

	/**
	 * Execute the task you currently have.
	 */
	run(): number | undefined {
		if (this.task) {
			return this.task.run();
		}
	}
}
