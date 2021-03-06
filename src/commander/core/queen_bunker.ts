import { Base } from "Base";
import { getPosFromBunkerCoord, insideBunkerBounds, quadrantFillOrder } from "roomPlanner/layouts.ts/bunker";
import { Commander } from "commander/Commander";
import { Unit } from "unit/Unit";
import { StoreStructure } from "declarations/typeGuards";
import HandOfNod from "mcv/handOfNod";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Setups, Roles } from "creeps/setups/setups";
import { CreepSetup } from "creeps/setups/CreepSetups";
import {$} from "../../caching/GlobalCache";
import { hasMinerals, mergeSum, minBy } from "utils/utils";
import { Task } from "tasks/Task";
import { Tasks } from "tasks/Tasks";
import { log } from "console/log";
import { TransportRequest } from "logistics/TransportRequestGroup";
import { Pathing } from "movement/Pathing";

type SupplyStructure = StructureExtension | StructureSpawn | StructureTower | StructureLab;

function isSupplyStructure(structure: Structure): structure is SupplyStructure {
    return structure.structureType == STRUCTURE_EXTENSION ||
        structure.structureType == STRUCTURE_LAB ||
        structure.structureType == STRUCTURE_SPAWN ||
        structure.structureType == STRUCTURE_TOWER;
}

function computeQuadrant(base: Base, quandrant: Coord[]): SupplyStructure[] {
    const positions = _.map(quandrant, coord => getPosFromBunkerCoord(coord, base));
    const structures: SupplyStructure[] = [];
    for(const pos of positions){
        const structure = _.find(pos.lookFor(LOOK_STRUCTURES), s => isSupplyStructure(s)) as SupplyStructure;
        if(structure){
            structures.push(structure);
        }
    }
    return structures;
}

export class BunkerQueenOverlord extends Commander {
    room: Room;
    queens: Unit[];
    storeStructures: StoreStructure[];
    batteries: StructureContainer[];
    quadrants: {[quadrants: string]: SupplyStructure[]};
    private numActiveQueens: number;
    assignments: {[queenName:string]: {[id:string]:boolean}};
    queenSetup: CreepSetup;

    constructor(handOfNod: HandOfNod, priority = CommanderPriority.core.queen) {
        super(handOfNod, 'supply', priority);
        this.queenSetup = Setups.queens.default
        this.queens = this.unit(Roles.queen);
        this.batteries = _.filter(this.room.containers, container => insideBunkerBounds(container.pos, this.base));
		this.storeStructures = _.compact([this.base.terminal!, this.base.storage!, ...this.batteries]);
		this.quadrants = {
			lowerRight: $.structures(this, 'LR',
									 () => computeQuadrant(this.base, quadrantFillOrder.lowerRight)),
			upperLeft : $.structures(this, 'UL',
									 () => computeQuadrant(this.base, quadrantFillOrder.upperLeft)),
			lowerLeft : $.structures(this, 'LL',
									 () => computeQuadrant(this.base, quadrantFillOrder.lowerLeft)),
			upperRight: $.structures(this, 'UR',
									 () => computeQuadrant(this.base, quadrantFillOrder.upperRight)),
		};
		this.computeQueenAssignments();
	}

	private computeQueenAssignments() {
		// Assign quadrants to queens
		this.assignments = _.zipObject(_.map(this.queens, queen => [queen.name, {}]));
		const activeQueens = _.filter(this.queens, queen => !queen.spawning);
		this.numActiveQueens = activeQueens.length;
		if (this.numActiveQueens > 0) {
			const quadrantAssignmentOrder = [this.quadrants.lowerRight,
											 this.quadrants.upperLeft,
											 this.quadrants.lowerLeft,
											 this.quadrants.upperRight];
			let i = 0;
			for (const quadrant of quadrantAssignmentOrder) {
				const queen = activeQueens[i % activeQueens.length];
				_.extend(this.assignments[queen.name], _.zipObject(_.map(quadrant, s => [s.id, true])));
				i++;
			}
		}
	}

	refresh() {
		super.refresh();
		$.refresh(this, 'batteries', 'storeStructures');
		$.refreshObject(this, 'quadrants');
		// Re-compute queen assignments if the number of queens has changed
		if (_.filter(this.queens, queen => !queen.spawning).length != this.numActiveQueens) {
			this.computeQueenAssignments();
		}
	}

	init() {
		for (const battery of this.batteries) {
			if (hasMinerals(battery.store)) { // get rid of any minerals in the container if present
				this.base.logisticsNetwork.requestOutputMinerals(battery);
			}
		}
		// const amount = this.base.spawns.length > 1 ? 2 : 1;
		const amount = this.base.room.energyCapacityAvailable > 2000 ? 2 : 1;
		this.wishList(amount, this.queenSetup);
	}

	// Builds a series of tasks to empty unnecessary carry contents, withdraw required resources, and supply structures
	private buildSupplyTaskManifest(queen: Unit): Task | null {
		let tasks: Task[] = [];
		// Step 1: empty all contents (this shouldn't be necessary since queen is normally empty at this point)
		let queenPos = queen.pos;
		if (_.sum(queen.carry) > 0) {
			const transferTarget = this.base.terminal || this.base.storage || this.batteries[0];
			if (transferTarget) {
				tasks.push(Tasks.transferAll(transferTarget));
				queenPos = transferTarget.pos;
			} else {
				log.warning(`No transfer targets for ${queen.print}!`);
				return null;
			}
		}
		// Step 2: figure out what you need to supply for and calculate the needed resources
		const queenCarry = {} as { [resourceType: string]: number };
		const allStore = mergeSum(_.map(this.storeStructures, s => s.store));

		const supplyRequests: TransportRequest[] = [];
		for (const priority in this.base.transportRequests.supply) {
			for (const request of this.base.transportRequests.supply[priority]) {
				if (this.assignments[queen.name][request.target.id]) {
					supplyRequests.push(request);
				}
			}
		}
		const supplyTasks: Task[] = [];
		for (const request of supplyRequests) {
			// stop when carry will be full
			const remainingAmount = queen.carryCapacity - _.sum(queenCarry);
			if (remainingAmount == 0) break;
			// figure out how much you can withdraw
			let amount = Math.min(request.amount, remainingAmount);
			amount = Math.min(amount, allStore[request.resourceType] || 0);
			if (amount == 0) continue;
			// update the simulated carry
			if (!queenCarry[request.resourceType]) {
				queenCarry[request.resourceType] = 0;
			}
			queenCarry[request.resourceType] += amount;
			// add a task to supply the target
			supplyTasks.push(Tasks.transfer(request.target, request.resourceType, amount));
		}
		// Step 3: make withdraw tasks to get the needed resources
		const withdrawTasks: Task[] = [];
		const neededResources = _.keys(queenCarry) as ResourceConstant[];
		// TODO: a single structure doesn't need to have all resources; causes jam if labs need supply but no minerals
		const targets: StoreStructure[] = _.filter(this.storeStructures, s =>
			_.all(neededResources, resource => (s.store[resource] || 0) >= (queenCarry[resource] || 0)));
		const withdrawTarget = minBy(targets, target => Pathing.distance(queenPos, target.pos));
		if (!withdrawTarget) {
			log.warning(`Could not find adequate withdraw structure for ${queen.print}! ` +
						`(neededResources: ${neededResources}, queenCarry: ${queenCarry})`);
			return null;
		}
		for (const resourceType of neededResources) {
			withdrawTasks.push(Tasks.withdraw(withdrawTarget, resourceType, queenCarry[resourceType]));
		}
		// Step 4: put all the tasks in the correct order, set nextPos for each, and chain them together
		tasks = tasks.concat(withdrawTasks, supplyTasks);
		return Tasks.chain(tasks);
	}

	// Builds a series of tasks to withdraw required resources from targets
	private buildWithdrawTaskManifest(queen: Unit): Task | null {
		const tasks: Task[] = [];
		const transferTarget = this.base.terminal || this.base.storage || this.batteries[0];
		// Step 1: empty all contents (this shouldn't be necessary since queen is normally empty at this point)
		if (_.sum(queen.carry) > 0) {
			if (transferTarget) {
				tasks.push(Tasks.transferAll(transferTarget));
			} else {
				log.warning(`No transfer targets for ${queen.print}!`);
				return null;
			}
		}
		// Step 2: figure out what you need to withdraw from
		const queenCarry = {energy: 0} as { [resourceType: string]: number };
		// let allWithdrawRequests = _.compact(_.flatten(_.map(this.assignments[queen.name],
		// 													struc => this.transportRequests.withdrawByID[struc.id])));
		const withdrawRequests: TransportRequest[] = [];
		for (const priority in this.base.transportRequests.withdraw) {
			for (const request of this.base.transportRequests.withdraw[priority]) {
				if (this.assignments[queen.name][request.target.id]) {
					withdrawRequests.push(request);
				}
			}
		}
		for (const request of withdrawRequests) {
			// stop when carry will be full
			const remainingAmount = queen.carryCapacity - _.sum(queenCarry);
			if (remainingAmount == 0) break;
			// figure out how much you can withdraw
			const amount = Math.min(request.amount, remainingAmount);
			if (amount == 0) continue;
			// update the simulated carry
			if (!queenCarry[request.resourceType]) {
				queenCarry[request.resourceType] = 0;
			}
			queenCarry[request.resourceType] += amount;
			// add a task to supply the target
			tasks.push(Tasks.withdraw(request.target, request.resourceType, amount));
		}
		// Step 3: put stuff in terminal/storage
		if (transferTarget) {
			tasks.push(Tasks.transferAll(transferTarget));
		} else {
			log.warning(`No transfer targets for ${queen.print}!`);
			return null;
		}
		// Step 4: return chained task manifest
		return Tasks.chain(tasks);
	}

	// private getChargingSpot(queen: Zerg): RoomPosition {
	// 	let chargeSpots = _.map(bunkerChargingSpots, coord => getPosFromBunkerCoord(coord, this.base));
	// 	let chargeSpot = (_.first(this.assignments[queen.name]) || queen).pos.findClosestByRange(chargeSpots);
	// 	if (chargeSpot) {
	// 		return chargeSpot;
	// 	} else {
	// 		log.warning(`Could not determine charging spot for queen at ${queen.pos.print}!`);
	// 		return queen.pos;
	// 	}
	// }
	//
	// private idleActions(queen: Zerg): void {
	//
	// 	// // Refill any empty batteries
	// 	// for (let battery of this.batteries) {
	// 	// 	if (!battery.isFull) {
	// 	// 		let amount = Math.min(battery.storeCapacity - _.sum(battery.store), queen.carryCapacity);
	// 	// 		let target = this.base.storage || this.base.storage;
	// 	// 		if (target) {
	// 	// 			queen.task = Tasks.transfer(battery, RESOURCE_ENERGY, amount)
	// 	// 							  .fork(Tasks.withdraw(target, RESOURCE_ENERGY, amount))
	// 	// 			return;
	// 	// 		}
	// 	// 	}
	// 	// }
	//
	// 	// Go to recharging spot and get recharged
	// 	let chargingSpot = this.getChargingSpot(queen);
	// 	queen.goTo(chargingSpot, {range: 0});
	// 	// // TODO: this will cause oscillating behavior where recharge drains some energy and queen leaves to supply it
	// 	// if (queen.pos.getRangeTo(chargingSpot) == 0) {
	// 	// 	let chargingSpawn = _.first(queen.pos.findInRange(this.base.spawns, 1));
	// 	// 	if (chargingSpawn && !chargingSpawn.spawning) {
	// 	// 		chargingSpawn.renewCreep(queen.creep);
	// 	// 	}
	// 	// }
	// }

	private handleQueen(queen: Unit): void {
		// Does something need withdrawing?
		if (this.base.transportRequests.needsWithdrawing &&
			_.any(_.keys(this.assignments[queen.name]), id => this.base.transportRequests.withdrawByID[id])) {
			queen.task = this.buildWithdrawTaskManifest(queen);
		}
		// Does something need supplying?
		else if (this.base.transportRequests.needsSupplying &&
				 _.any(_.keys(this.assignments[queen.name]), id => this.base.transportRequests.supplyByID[id])) {
			queen.task = this.buildSupplyTaskManifest(queen);
		}
		// Otherwise do idle actions
		if (queen.isIdle) {
			// this.idleActions(queen);
			delete queen.memory._go;
		}
	}

	run() {
		this.autoRun(this.queens, queen => this.handleQueen(queen));
	}
}