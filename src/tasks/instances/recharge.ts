import { TaskPickup, pickupTaskName } from "./pickup";
import { TaskWithdraw, withdrawTaskName } from "./withdraw";
import { isResource } from "declarations/typeGuards";
import { TaskHarvest } from "./harvest";
import { Unit } from "../../unit/Unit";
import { maxBy, minMax } from "utils/utils";
import { log } from "../../console/log";
import { Task } from "../Task";

export type rechargeTargetType = null;
export const rechargeTaskName = 'recharge';

// This is a "dispenser task" which is not itself a valid task, but dispenses a task when assigned to a creep.

export class TaskRecharge extends Task {
	target: rechargeTargetType;

	data: {
		minEnergy: number;
	};

	constructor(target: rechargeTargetType, minEnergy = 0, options = {} as TaskOptions) {
		super(rechargeTaskName, {ref: '', pos: {x: -1, y: -1, roomName: ''}}, options);
		this.data.minEnergy = minEnergy;
	}

	private rechargeRateForCreep(creep: Unit, obj: rechargeObjectType): number | false {
		if (creep.base && creep.base.handOfNod && creep.base.handOfNod.battery
			&& obj.id == creep.base.handOfNod.battery.id && creep.roleName != 'queen') {
			return false; // only queens can use the hatchery battery
		}
		let amount = isResource(obj) ? obj.amount : obj.energy;
		if (amount < this.data.minEnergy) {
			return false;
		}
		const otherTargeters = _.filter(_.map(obj.targetBy, name => Cobal.units[name]),
										zerg => !!zerg && zerg.memory._task
												&& (zerg.memory._task.name == withdrawTaskName
													|| zerg.memory._task.name == pickupTaskName));
		const resourceOutflux = _.sum(_.map(otherTargeters,
											other => other.carryCapacity - _.sum(other.carry)));
		amount = minMax(amount - resourceOutflux, 0, creep.carryCapacity);
		const effectiveAmount = amount / (creep.pos.getMultiRoomRangeTo(obj.pos) + 1);
		if (effectiveAmount <= 0) {
			return false;
		} else {
			return effectiveAmount;
		}
	}

	// Override creep setter to dispense a valid recharge task
	set creep(creep: Unit) {
		this._creep.name = creep.name;
		if (this._parent) {
			this.parent!.creep = creep;
		}
		// Choose the target to maximize your energy gain subject to other targeting workers
		const target = creep.base && creep.inBaseRoom
					   ? maxBy(creep.base.rechargeables, o => this.rechargeRateForCreep(creep, o))
					   : maxBy(creep.room.rechargeables, o => this.rechargeRateForCreep(creep, o));
		if (!target || creep.pos.getMultiRoomRangeTo(target.pos) > 40) {
			// workers shouldn't harvest; let drones do it (disabling this check can destabilize early economy)
			const canHarvest = creep.getActiveBodyparts(WORK) > 0 && creep.roleName != 'worker';
			if (canHarvest) {
				// Harvest from a source if there is no recharge target available
				const availableSources = _.filter(creep.room.sources, function(source) {
					// Only harvest from sources which aren't surrounded by creeps excluding yourself
					const isSurrounded = source.pos.availableNeighbors(false).length == 0;
					return !isSurrounded || creep.pos.isNearTo(source);
				});
				const availableSource = creep.pos.findClosestByMultiRoomRange(availableSources);
				if (availableSource) {
					creep.task = new TaskHarvest(availableSource);
					return;
				}
			}
		}
		if (target) {
			if (isResource(target)) {
				creep.task = new TaskPickup(target);
				return;
			} else {
				creep.task = new TaskWithdraw(target);
				return;
			}
		} else {
			creep.task = null;
		}
	}

	isValidTask() {
		return false;
	}

	isValidTarget() {
		return false;
	}

	work() {
		log.warning(`BAD RESULT: Should not get here...`);
		return ERR_INVALID_TARGET;
	}
}
