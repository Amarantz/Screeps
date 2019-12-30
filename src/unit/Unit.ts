import Base from '../Base';
import {log} from '../console/log';
import {isCreep, isUnit} from '../declarations/typeGuards';
import {Movement, MoveOptions} from '../movement/Movement';
import Commander from '../commander/Commander';
import {initializeTask} from '../tasks/initializer';
import {Task} from '../tasks/Task';
import { NEW_COBAL_INTERVAL } from '../Cobal';

export function normalizeUnit(creep: Unit | Creep): Unit | Creep {
	return Cobal.units[creep.name] || creep;
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

const RANGES = {
	BUILD   : 3,
	REPAIR  : 3,
	TRANSFER: 1,
	WITHDRAW: 1,
	HARVEST : 1,
	DROP    : 0,
};

/**
 * The Zerg class is a wrapper for owned creeps and contains all wrapped creep methods and many additional methods for
 * direct control of a creep.
 */
export default class Unit {
    flee(arg0: any, arg1: any): any {
        throw new Error("Method not implemented.");
    }
	boostCounts: any;
    moveOffCurrentPos() {
        throw new Error("Method not implemented.");
    }

	creep: Creep; 						// The creep that this wrapper class will control
	body: BodyPartDefinition[];    	 	// These properties are all wrapped from this.creep.* to this.*
	carry: StoreDefinition;				// |
	carryCapacity: number;				// |
	fatigue: number;					// |
	hits: number;						// |
	hitsMax: number;					// |
	id: string;							// |
	memory: CreepMemory;				// | See the ICreepMemory interface for structure
	name: string;						// |
	pos: RoomPosition;					// |
	nextPos: RoomPosition;				// | The next position the creep will be in after registering a move intent
	ref: string;						// |
	roleName: string;					// |
	room: Room;							// |
	saying: string;						// |
	spawning: boolean;					// |
	ticksToLive: number | undefined;	// |
	lifetime: number;
	actionLog: { [actionName: string]: boolean }; // Tracks the actions that a creep has completed this tick
	blockMovement: boolean; 			// Whether the zerg is allowed to move or not
	private _task: Task | undefined; 		// Cached Task object that is instantiated once per tick and on change
    store: Store<ResourceConstant, false>;

	constructor(creep: Creep, notifyWhenAttacked = true) {
		// Copy over creep references
		this.creep = creep;
		this.body = creep.body;
		this.carry = creep.carry;
        this.carryCapacity = creep.carryCapacity;
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
		// Extra properties
		this.lifetime = this.getBodyparts(CLAIM) > 0 ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
		this.actionLog = {};
		this.blockMovement = false;
		// Register global references
		Cobal.units[this.name] = this;
		global[this.name] = this;
		// Handle attack notification when at lifetime - 1
		if (!notifyWhenAttacked && (this.ticksToLive || 0) >= this.lifetime - (NEW_COBAL_INTERVAL + 1)) {
			// creep.notifyWhenAttacked only uses the 0.2CPU intent cost if it changes the intent value
			this.notifyWhenAttacked(notifyWhenAttacked);
		}
	}

	/**
	 * Refresh all changeable properties of the creep or delete from Overmind and global when dead
	 */
	refresh(): void {
		const creep = Game.creeps[this.name];
		if (creep) {
			this.creep = creep;
			this.pos = creep.pos;
			this.nextPos = creep.pos;
			this.body = creep.body;
			this.carry = creep.carry;
			this.carryCapacity = creep.carryCapacity;
			this.fatigue = creep.fatigue;
            this.hits = creep.hits;
            this.store = creep.store;
			this.memory = creep.memory;
			this.roleName = creep.memory.role;
			this.room = creep.room;
			this.saying = creep.saying;
			this.spawning = creep.spawning;
			this.ticksToLive = creep.ticksToLive;
			this.actionLog = {};
			this.blockMovement = false;
			this._task = undefined; // todo
		} else {
			log.debug(`Deleting from global`);
			delete Cobal.units[this.name];
			delete global[this.name];
		}
	}

	debug(...args: any[]) {
		if (this.memory.debug) {
			log.debug(this.print, args);
		}
	}

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.pos.roomName}">[${this.name}]</a>`
    }

    /**
     * Task Logic
     */
    get task(): Task | undefined {
        if(!this._task){
            this._task = this.memory.task ? initializeTask(this.memory.task) : undefined;
        }
        return this._task;
    }

    set task(task: Task | undefined) {
        const oldProtoTask = this.memory.task;
        if(oldProtoTask){
            const oldRef = oldProtoTask._target.ref;
            if(Cobal.cache.targets[oldRef]){
                _.remove(Cobal.cache.targets[oldRef], name => name == this.name);
            }
        }

        this.memory.task = task ? task.proto : undefined;
        if(task){
            if(task.target){
                if(!Cobal.cache.targets[task.target.ref]) {
                    Cobal.cache.targets[task.target.ref] = [];
                }
                Cobal.cache.targets[task.target.ref] = [...Cobal.cache.targets[task.target.ref], this.name];
            }
            task.creep = this;
        }
        this._task = undefined;
    }

    get hasValidTask(): boolean {
        return !!this.task && this.task.isValid();
    };

    get isIdle(): boolean {
        return !this.task || !this.task.isValid();
    }

    run(): number | undefined {
        if(this.task) {
            return this.task.run();
        }
    }

    /**
     * base Association
     */
    get base(): Base | undefined {
        if(this.memory[_MEM.BASE]){
            return Cobal.bases[this.memory[_MEM.BASE] as string];
        }
        return undefined;
    }

    set base(newBase: Base | undefined) {
        if(newBase) {
            this.memory[_MEM.BASE] = newBase.name;
        } else {
            this.memory[_MEM.BASE] = undefined;
        }
    }

    get inBaseRoom(): boolean {
        return Cobal.baseMap[this.room.name] == this.memory[_MEM.BASE];
    }

    // Body configuration and related data -----------------------------------------------------------------------------

	getActiveBodyparts(type: BodyPartConstant): number {
		return this.creep.getActiveBodyparts(type);
	}

	/* The same as creep.getActiveBodyparts, but just counts bodyparts regardless of condition. */
	getBodyparts(partType: BodyPartConstant): number {
		return _.filter(this.body, (part: BodyPartDefinition) => part.type == partType).length;
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
	attack(target: any): number {
		return OK
	}

	rangedAttack(target: any): number {
		return OK
	}

	notifyWhenAttacked(enabled: boolean) {
		return this.creep.notifyWhenAttacked(enabled);
	}

	pickup(resource: Resource) {
		const result = this.creep.pickup(resource);
		if (!this.actionLog.pickup) this.actionLog.pickup = (result == OK);
		return result;
	}
	heal(target: any): number{
		return OK
	}
	rangedHeal(target: any): number {
		return OK
	}

    attackController(controller: StructureController) {
		const result = this.creep.attackController(controller);
		if (!this.actionLog.attackController) this.actionLog.attackController = (result == OK);
		return result;
	}
}
