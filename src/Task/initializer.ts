import {Task} from './Task';
import { log } from 'console';

/**
 * The task initializer maps serialized prototasks to Task instances
 */
export function initializeTask(protoTask: ProtoTask): Task {
	// Retrieve name and target data from the ProtoTask
	const taskName = protoTask.name;
	const target = deref(protoTask._target.ref);
	let task: any;
	// Create a task object of the correct type
	switch (taskName) {
		case attackTaskName:
			task = new TaskAttack(target as attackTargetType);
			break;
		case buildTaskName:
			task = new TaskBuild(target as buildTargetType);
			break;
		case claimTaskName:
			task = new TaskClaim(target as claimTargetType);
			break;
		case dismantleTaskName:
			task = new TaskDismantle(target as dismantleTargetType);
			break;
		case dropTaskName:
			task = new TaskDrop(derefRoomPosition(protoTask._target._pos) as dropTargetType);
			break;
		// case fleeTaskName:
		// 	task = new TaskFlee(derefRoomPosition(ProtoTask._target._pos) as fleeTargetType);
		// 	break;
		case fortifyTaskName:
			task = new TaskFortify(target as fortifyTargetType);
			break;
		case getBoostedTaskName:
			task = new TaskGetBoosted(target as getBoostedTargetType,
									  protoTask.data.resourceType as _ResourceConstantSansEnergy);
			break;
		case getRenewedTaskName:
			task = new TaskGetRenewed(target as getRenewedTargetType);
			break;
		case goToTaskName:
			// task = new TaskGoTo(derefRoomPosition(ProtoTask._target._pos) as goToTargetType);
			task = new TaskInvalid();
			break;
		case goToRoomTaskName:
			task = new TaskGoToRoom(protoTask._target._pos.roomName as goToRoomTargetType);
			break;
		case harvestTaskName:
			task = new TaskHarvest(target as harvestTargetType);
			break;
		case healTaskName:
			task = new TaskHeal(target as healTargetType);
			break;
		case meleeAttackTaskName:
			task = new TaskMeleeAttack(target as meleeAttackTargetType);
			break;
		case pickupTaskName:
			task = new TaskPickup(target as pickupTargetType);
			break;
		case rangedAttackTaskName:
			task = new TaskRangedAttack(target as rangedAttackTargetType);
			break;
		case rechargeTaskName:
			task = new TaskRecharge(null);
			break;
		case repairTaskName:
			task = new TaskRepair(target as repairTargetType);
			break;
		case reserveTaskName:
			task = new TaskReserve(target as reserveTargetType);
			break;
		case signControllerTaskName:
			task = new TaskSignController(target as signControllerTargetType);
			break;
		case transferTaskName:
			task = new TaskTransfer(target as transferTargetType);
			break;
		case transferAllTaskName:
			task = new TaskTransferAll(target as transferAllTargetType);
			break;
		case upgradeTaskName:
			task = new TaskUpgrade(target as upgradeTargetType);
			break;
		case withdrawTaskName:
			task = new TaskWithdraw(target as withdrawTargetType);
			break;
		case withdrawAllTaskName:
			task = new TaskWithdrawAll(target as withdrawAllTargetType);
			break;
		default:
			log.error(`Invalid task name: ${taskName}! task.creep: ${protoTask._creep.name}. Deleting from memory!`);
			task = new TaskInvalid();
			break;
	}
	// Modify the task object to reflect any changed properties
	task.proto = protoTask;
	// Return it
	return task;
}
