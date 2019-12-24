/* tslint:disable:variable-name */
import { EnergyStructure, StoreStructure, isEnergyStructure, isResource, isStoreStructure, isTombstone } from '../declarations/typeGuards';
import { Base } from '../Base';
import Mem from '../memory/memory';
import { log } from '../console/log';
import Unit from '../unit/unit';
import { Roles } from '../creeps/setups/setups';
import {minMax} from '../utils/utils';
import {Matcher} from '../algorithms/galeShapley';
import { Pathing } from '../movement/Pathing';

export type LogisticsTarget =
    EnergyStructure | StoreStructure | StructureLab | StructureNuker | StructurePowerSpawn | Tombstone | Resource;

export const ALL_RESOURCE_TYPE_ERROR = 'Imporer logistics Request: "all" can only be used for store structure or tombstones!';

export type BufferTarget = StructureStorage | StructureTerminal;

export interface LogisticsRequest {
    id: string,
    target: LogisticsTarget,
    amount: number;
    dAmountdt: number;
    resourceType: ResourceConstant | 'all';
    multiplier: number;
}
interface  RequestOptions {
    amount?: number;
    dAmountdt?: number;
    resourceType?: ResourceConstant | 'all';
    multiplier?: number;
}

interface LogisticsNetworkMemory {
    transportCache: {
        [transporterName: string]: {
            nextAvailability: [number, RoomPosition],
            pridictedTransporterCarry: StoreDefinition,
            tick: number,
        }
    }
}

const LogicsticsNetworkMemoryDefaults: LogisticsNetworkMemory = {
    transportCache: {},
}

export class LogisticsNetwork {
    memory: LogisticsNetworkMemory;
    requests: LogisticsRequest[];
    buffers: BufferTarget[];
    base: Base;
    private targetToRequest: {[targetRef: string]: number};
    private _matching: {[creepName:string]: LogisticsRequest | undefined} | undefined;
    private cache: {
        nextAvailability: {[transporterName: string]: [number, RoomPosition]};
        predictedTransporterCarry: {[transporterName: string]: StoreDefinition};
        resourceChangeRate: {[requestId: string]: {[transportName: string]: number}};
    }

    static settings = {
        flagDropAmmount: 1000,
        rangeToPathHeuristic: 1.1,
        carryThreshold: 800,
        droppedEnergyThreshold: 200,
    }

    constructor(base: Base){
        this.memory = Mem.wrap(base.memory, 'logisticsNetwork', LogicsticsNetworkMemoryDefaults);
        this.requests = [];
        this.targetToRequest = {};
        this.base = base;
        this.buffers = _.compact([base.terminal!, base.storage!]);
        this.cache = {
            nextAvailability: {},
            predictedTransporterCarry: {},
            resourceChangeRate: {},
        }
    }

    refresh(): void {
        this.memory = Mem.wrap(this.base.memory, 'logisticsNetwork', LogicsticsNetworkMemoryDefaults);
        this.requests = [];
        this.targetToRequest = {};
        this._matching = undefined;
        this.cache = {
            nextAvailability: {},
            predictedTransporterCarry: {},
            resourceChangeRate: {},
        }
    }

    requestInput(target: LogisticsTarget, opts: RequestOptions = {}): void {
        _.defaults(opts, {
            resourceType: RESOURCE_ENERGY,
            multiplier: 1,
            dAmountdt: 0,
        });
        if(target.room != this.base.room){
            //@ts-ignore
            log.warning(`${target.ref} at ${this.pos.print} is outside base room. Shouln't request!`);
            return;
        }
        if(opts.resourceType == 'all') {
            log.warning(`Logistics request error: 'all can only be used for output requests`);
            return;
        }
        if(!opts.amount){
            opts.amount = this.getInputAmount(target, opts.resourceType!);
        }
        const requestID = this.requests.length;
        const req: LogisticsRequest = {
            id: requestID.toString(),
            target: target,
            amount: opts.amount,
            dAmountdt: opts.dAmountdt!,
            resourceType: opts.resourceType!,
            multiplier: opts.multiplier!,
        };
        this.requests.push(req);
        //@ts-ignore
        this.targetToRequest[req.target.ref] = requestID;
    }

    requestOutput(target: LogisticsTarget, opts: RequestOptions = {}) {
        _.defaults(opts, {
			resourceType: RESOURCE_ENERGY,
			multiplier  : 1,
			dAmountdt   : 0,
		});
		if (opts.resourceType == 'all' && (isStoreStructure(target) || isTombstone(target))) {
			if (_.sum(target.store) == target.store.energy) {
				opts.resourceType = RESOURCE_ENERGY; // convert "all" requests to energy if that's all they have
			}
		}
		if (!opts.amount) {
			opts.amount = this.getOutputAmount(target, opts.resourceType!);
		}
		opts.amount *= -1;
		(opts.dAmountdt!) *= -1;
		// Register the request
		const requestID = this.requests.length;
		const req: LogisticsRequest = {
			id          : requestID.toString(),
			target      : target,
			amount      : opts.amount,
			dAmountdt   : opts.dAmountdt!,
			resourceType: opts.resourceType!,
			multiplier  : opts.multiplier!,
		};
        this.requests.push(req);
        //@ts-ignore
		this.targetToRequest[req.target.ref] = requestID;
    }

    requestOutputMinerals(target: StoreStructure, opts = {} as RequestOptions): void {
		for (const resourceType in target.store) {
			if (resourceType == RESOURCE_ENERGY) continue;
			const amount = target.store[<ResourceConstant>resourceType] || 0;
			if (amount > 0) {
				opts.resourceType = <ResourceConstant>resourceType;
				this.requestOutput(target, opts);
			}
		}
    }

    private getInputAmount(target: LogisticsTarget, resourceType: ResourceConstant): number {
		// if (target instanceof DirectivePickup) {
		// 	return target.storeCapacity - _.sum(target.store);
		// } else
		if (isResource(target) || isTombstone(target)) {
            //@ts-ignore
			log.error(`Improper logistics request: should not request input for resource or tombstone!`);
			return 0;
		} else if (isStoreStructure(target)) {
			return target.storeCapacity - _.sum(target.store);
		} else if (isEnergyStructure(target) && resourceType == RESOURCE_ENERGY) {
			return target.energyCapacity - target.energy;
		}
		// else if (target instanceof Zerg) {
		// 	return target.carryCapacity - _.sum(target.carry);
		// }
		else {
			if (target instanceof StructureLab) {
				if (resourceType == target.mineralType) {
					return target.mineralCapacity - target.mineralAmount;
				} else if (resourceType == RESOURCE_ENERGY) {
					return target.energyCapacity - target.energy;
				}
			} else if (target instanceof StructureNuker) {
				if (resourceType == RESOURCE_GHODIUM) {
					return target.ghodiumCapacity - target.ghodium;
				} else if (resourceType == RESOURCE_ENERGY) {
					return target.energyCapacity - target.energy;
				}
			} else if (target instanceof StructurePowerSpawn) {
				if (resourceType == RESOURCE_POWER) {
					return target.powerCapacity - target.power;
				} else if (resourceType == RESOURCE_ENERGY) {
					return target.energyCapacity - target.energy;
				}
			}
        }
        //@ts-ignore
		log.warning('Could not determine input amount!');
		return 0;
	}

    private getOutputAmount(target: LogisticsTarget, resourceType: ResourceConstant | 'all'): number {
		if (resourceType == 'all') {
			if (isTombstone(target) || isStoreStructure(target)) {
				return _.sum(target.store);
			} else {
                //@ts-ignore
				log.error(ALL_RESOURCE_TYPE_ERROR);
				return 0;
			}
		} else {
			if (isResource(target)) {
				return target.amount;
			} else if (isTombstone(target)) {
				return target.store[resourceType] || 0;
			} else if (isStoreStructure(target)) {
				return target.store[resourceType] || 0;
			} else if (isEnergyStructure(target) && resourceType == RESOURCE_ENERGY) {
				return target.energy;
			}
			// else if (target instanceof Zerg) {
			// 	return target.carry[resourceType]!;
			// }
			else {
				if (target instanceof StructureLab) {
					if (resourceType == target.mineralType) {
						return target.mineralAmount;
					} else if (resourceType == RESOURCE_ENERGY) {
						return target.energy;
					}
				} else if (target instanceof StructureNuker) {
					if (resourceType == RESOURCE_GHODIUM) {
						return target.ghodium;
					} else if (resourceType == RESOURCE_ENERGY) {
						return target.energy;
					}
				} else if (target instanceof StructurePowerSpawn) {
					if (resourceType == RESOURCE_POWER) {
						return target.power;
					} else if (resourceType == RESOURCE_ENERGY) {
						return target.energy;
					}
				}
			}
		}
		log.warning('Could not determine output amount!');
        return 0;
    }

    private computeNextAvailability(transporter: Unit): [number, RoomPosition] {
		if (transporter.task) {
			let approximateDistance = transporter.task.eta;
			let pos = transporter.pos;
			const targetPositions = transporter.task.targetPosManifest;
			// If there is a well-defined task ETA, use that as the first leg, else set dist to zero and use range
			if (approximateDistance) {
				for (const targetPos of targetPositions.slice(1)) {
                    // The path lengths between any two logistics targets should be well-memorized
                    //@ts-ignore
					approximateDistance += Math.ceil(pos.getMultiRoomRangeTo(targetPos)
													 * LogisticsNetwork.settings.rangeToPathHeuristic);
					// approximateDistance += Pathing.distance(pos, targetPos);
					pos = targetPos;
				}
			} else {
				// This probably shouldn't happen...
				approximateDistance = 0;
				for (const targetPos of targetPositions) {
                    //@ts-ignore
					approximateDistance += Math.ceil(pos.getMultiRoomRangeTo(targetPos)
													 * LogisticsNetwork.settings.rangeToPathHeuristic);
					// approximateDistance += Pathing.distance(pos, targetPos);
					pos = targetPos;
				}
			}
			return [approximateDistance, pos];
		} else {
			// Report the transporter as being near a logistics target so that Pathing.distance() won't waste CPU
			// let nearbyLogisticPositions = transporter.pos.findInRange(this.logisticPositions[transporter.room.name], 2);
			return [0, transporter.pos];
		}
    }

    	/**
	 * Number of ticks until the transporter is available and where it will be
	 */
	private nextAvailability(transporter: Unit): [number, RoomPosition] {
		if (!this.cache.nextAvailability[transporter.name]) {
			this.cache.nextAvailability[transporter.name] = this.computeNextAvailability(transporter);
		}
		return this.cache.nextAvailability[transporter.name];
	}

	static targetingTransporters(target: LogisticsTarget, excludedTransporter?: Unit): Unit[] {
        //@ts-ignore
		const targetingZerg = _.map(target.targetedBy, name => global.Cobal.unit[name]);
		const targetingTransporters = _.filter(targetingZerg, zerg => zerg.roleName == Roles.transport);
		if (excludedTransporter) {
			_.remove(targetingTransporters, transporter => transporter.name == excludedTransporter.name);
		}
		return targetingTransporters;
    }

    /**
	 * Returns the predicted state of the transporter's carry after completing its current task
	 */
	private computePredictedTransporterCarry(transporter: Unit,
											 nextAvailability?: [number, RoomPosition]): StoreDefinition {
		if (transporter.task && transporter.task.target) {
			const requestID = this.targetToRequest[transporter.task.target.ref];
			if (requestID) {
				const request = this.requests[requestID];
				if (request) {
					const carry = transporter.carry as { [resourceType: string]: number };
					const remainingCapacity = transporter.carryCapacity - _.sum(carry);
					const resourceAmount = -1 * this.predictedRequestAmount(transporter, request, nextAvailability);
					// ^ need to multiply amount by -1 since transporter is doing complement of what request needs
					if (request.resourceType == 'all') {
						if (!isStoreStructure(request.target) && !isTombstone(request.target)) {
                            log.error(ALL_RESOURCE_TYPE_ERROR);
                            //@ts-ignore
							return {energy: 0};
						}
						for (const resourceType in request.target.store) {
							const resourceFraction = (request.target.store[<ResourceConstant>resourceType] || 0)
												   / _.sum(request.target.store);
							if (carry[resourceType]) {
								carry[resourceType]! += resourceAmount * resourceFraction;
								carry[resourceType] = minMax(carry[resourceType]!, 0, remainingCapacity);
							} else {
								carry[resourceType] = minMax(resourceAmount, 0, remainingCapacity);
							}
						}
					} else {
						if (carry[request.resourceType]) {
							carry[request.resourceType]! += resourceAmount;
							carry[request.resourceType] = minMax(carry[request.resourceType]!, 0, remainingCapacity);
						} else {
							carry[request.resourceType] = minMax(resourceAmount, 0, remainingCapacity);
						}
					}
					return carry as StoreDefinition;
				}
			}
		}
		return transporter.carry;
    }

    /**
	 * Returns the predicted state of the transporter's carry after completing its task
	 */
	private predictedTransporterCarry(transporter: Unit): StoreDefinition {
		if (!this.cache.predictedTransporterCarry[transporter.name]) {
			this.cache.predictedTransporterCarry[transporter.name] = this.computePredictedTransporterCarry(transporter);
		}
		return this.cache.predictedTransporterCarry[transporter.name];
    }

    /**
	 * Returns the effective amount that a transporter will see upon arrival, accounting for other targeting creeps
	 */
	predictedRequestAmount(transporter: Unit, request: LogisticsRequest,
						   nextAvailability?: [number, RoomPosition]): number {
		// Figure out when/where the transporter will be free
		let busyUntil: number;
		let newPos: RoomPosition;
		if (!nextAvailability) {
			[busyUntil, newPos] = this.nextAvailability(transporter);
		} else {
			[busyUntil, newPos] = nextAvailability;
		}
        // let eta = busyUntil + Pathing.distance(newPos, request.target.pos);
        //@ts-ignore
		const eta = busyUntil + LogisticsNetwork.settings.rangeToPathHeuristic * newPos.getMultiRoomRangeTo(request.target.pos);
		const predictedDifference = request.dAmountdt * eta; // dAmountdt has same sign as amount
		// Account for other transporters targeting the target
		const otherTargetingTransporters = LogisticsNetwork.targetingTransporters(request.target, transporter);
		// let closerTargetingTransporters = _.filter(otherTargetingTransporters,
		// 										   transporter => this.nextAvailability(transporter)[0] < eta);
		if (request.amount > 0) { // input state, resources into target
			let predictedAmount = request.amount + predictedDifference;
			if (isStoreStructure(request.target)) { 	// cap predicted amount at storeCapacity
				predictedAmount = Math.min(predictedAmount, request.target.storeCapacity);
			} else if (isEnergyStructure(request.target)) {
				predictedAmount = Math.min(predictedAmount, request.target.energyCapacity);
			}
			const resourceInflux = _.sum(_.map(otherTargetingTransporters,
											 other => (other.carry[<ResourceConstant>request.resourceType] || 0)));
			predictedAmount = Math.max(predictedAmount - resourceInflux, 0);
			return predictedAmount;
		} else { // output state, resources withdrawn from target
			let predictedAmount = request.amount + predictedDifference;
			if (isStoreStructure(request.target)) { 	// cap predicted amount at -1 * storeCapacity
				predictedAmount = Math.max(predictedAmount, -1 * request.target.storeCapacity);
			} else if (isEnergyStructure(request.target)) {
				predictedAmount = Math.min(predictedAmount, -1 * request.target.energyCapacity);
			}
			const resourceOutflux = _.sum(_.map(otherTargetingTransporters,
											  other => other.carryCapacity - _.sum(other.carry)));
			predictedAmount = Math.min(predictedAmount + resourceOutflux, 0);
			return predictedAmount;
		}
    }

    /**
	 * Consider all possibilities of buffer structures to visit on the way to fulfilling the request
	 */
	bufferChoices(transporter: Unit, request: LogisticsRequest): {
		dQ: number,			// Absolute value of amount of resource transported with the choice
		dt: number,			// Amount of time to execute the choice
		targetRef: string	// Reference of the immediate target
	}[] {
		const [ticksUntilFree, newPos] = this.nextAvailability(transporter);
		const choices: { dQ: number, dt: number, targetRef: string }[] = [];
		const amount = this.predictedRequestAmount(transporter, request, [ticksUntilFree, newPos]);
		let carry: StoreDefinition;
		if (!transporter.task || transporter.task.target != request.target) {
			// If you are not targeting the requestor, use predicted carry after completing current task
			carry = this.predictedTransporterCarry(transporter);
		} else {
			// If you are targeting the requestor, use current carry for computations
			carry = transporter.carry;
		}
		if (amount > 0) { // requestInput instance, needs refilling
			if (request.resourceType == 'all') {
				log.warning(`Improper resourceType in bufferChoices! Type 'all' is only allowable for outputs!`);
				return [];
			}
			// Change in resources if transporter goes straight to the input
			const dQ_direct = Math.min(amount, carry[request.resourceType] || 0);
            // let dt_direct = Pathing.distance(newPos, request.target.pos) + ticksUntilFree;
            //@ts-ignore
			const dt_direct = ticksUntilFree + newPos.getMultiRoomRangeTo(request.target.pos)
							  * LogisticsNetwork.settings.rangeToPathHeuristic;
			choices.push({
							 dQ       : dQ_direct,
                             dt       : dt_direct,
                             //@ts-ignore
							 targetRef: request.target.ref
						 });
			if ((carry[request.resourceType] || 0) > amount || _.sum(carry) == transporter.carryCapacity) {
				return choices; // Return early if you already have enough resources to go direct or are already full
			}
			// Change in resources if transporter picks up resources from a buffer first
			for (const buffer of this.buffers) {
                const dQ_buffer = Math.min(amount, transporter.carryCapacity, buffer.store[request.resourceType] || 0);
                //@ts-ignore
				const dt_buffer = newPos.getMultiRoomRangeTo(buffer.pos) * LogisticsNetwork.settings.rangeToPathHeuristic + Pathing.distance(buffer.pos, request.target.pos) + ticksUntilFree;
				choices.push({
								 dQ       : dQ_buffer,
                                 dt       : dt_buffer,
                                 //@ts-ignore
								 targetRef: buffer.ref
							 });
			}
		} else if (amount < 0) { // requestOutput instance, needs pickup
			// Change in resources if transporter goes straight to the output
			const remainingCarryCapacity = transporter.carryCapacity - _.sum(carry);
            const dQ_direct = Math.min(Math.abs(amount), remainingCarryCapacity);
            //@ts-ignore
			const dt_direct = newPos.getMultiRoomRangeTo(request.target.pos)
							* LogisticsNetwork.settings.rangeToPathHeuristic + ticksUntilFree;
			choices.push({
							 dQ       : dQ_direct,
                             dt       : dt_direct,
                             //@ts-ignore
							 targetRef: request.target.ref
						 });
			if (remainingCarryCapacity >= Math.abs(amount) || remainingCarryCapacity == transporter.carryCapacity) {
				return choices; // Return early you have sufficient free space or are empty
			}
			// Change in resources if transporter drops off resources at a buffer first
			for (const buffer of this.buffers) {
				const dQ_buffer = Math.min(Math.abs(amount), transporter.carryCapacity,
                                         buffer.storeCapacity - _.sum(buffer.store));
                //@ts-ignore
				const dt_buffer = newPos.getMultiRoomRangeTo(buffer.pos) * LogisticsNetwork.settings.rangeToPathHeuristic + Pathing.distance(buffer.pos, request.target.pos) + ticksUntilFree;
				choices.push({
								 dQ       : dQ_buffer,
                                 dt       : dt_buffer,
                                 //@ts-ignore
								 targetRef: buffer.ref
							 });
			}
		}
		return choices;
    }

    	/**
	 * Compute the best possible value of |dResource / dt|
	 */
	private resourceChangeRate(transporter: Unit, request: LogisticsRequest): number {
		if (!this.cache.resourceChangeRate[request.id]) {
			this.cache.resourceChangeRate[request.id] = {};
		}
		if (!this.cache.resourceChangeRate[request.id][transporter.name]) {
			const choices = this.bufferChoices(transporter, request);
			const dQ_dt = _.map(choices, choice => request.multiplier * choice.dQ / Math.max(choice.dt, 0.1));
			this.cache.resourceChangeRate[request.id][transporter.name] = _.max(dQ_dt);
		}
		return this.cache.resourceChangeRate[request.id][transporter.name];
	}

    /**
	 * Generate requestor preferences in terms of transporters
	 */
	requestPreferences(request: LogisticsRequest, transporters: Unit[]): Unit[] {
		// Requestors priortize transporters by change in resources per tick until pickup/delivery
		return _.sortBy(transporters, transporter => -1 * this.resourceChangeRate(transporter, request)); // -1 -> desc
    }

    /**
	 * Generate transporter preferences in terms of store structures
	 */
	transporterPreferences(transporter: Unit): LogisticsRequest[] {
		// Transporters prioritize requestors by change in resources per tick until pickup/delivery
		return _.sortBy(this.requests, request => -1 * this.resourceChangeRate(transporter, request)); // -1 -> desc
	}

    /**
	 * Invalidates relevant portions of the cache once a transporter is assigned to a task
	 */
	invalidateCache(transporter: Unit, request: LogisticsRequest): void {
		delete this.cache.nextAvailability[transporter.name];
		delete this.cache.predictedTransporterCarry[transporter.name];
		delete this.cache.resourceChangeRate[request.id][transporter.name];
    }

    	/**
	 * Logs the output of the stable matching result
	 */
	summarizeMatching(): void {
		const requests = this.requests.slice();
		const transporters = _.filter(this.base.getCreepsByRole(Roles.transport), creep => !creep.spawning);
		const unmatchedTransporters = _.remove(transporters,
											 transporter => !_.keys(this._matching).includes(transporter.name));
		const unmatchedRequests = _.remove(requests, request => !_.values(this._matching).includes(request));
		// console.log(`Stable matching for ${this.base.name} at ${Game.time}`);
		for (const transporter of transporters) {
			const transporterStr = transporter.name + ' ' + transporter.pos;
            const request = this._matching![transporter.name]!;
            //@ts-ignore
			const requestStr = request.target.ref + ' ' + request.target.pos.print;
			// console.log(`${transporterStr.padRight(30)} : ${requestStr}`);
		}
		for (const transporter of unmatchedTransporters) {
			const transporterStr = transporter.name + ' ' + transporter.pos;
			// console.log(`${transporterStr.padRight(30)} : ${''}`);
		}
		for (const request of unmatchedRequests) {
            //@ts-ignore
			const requestStr = request.target.ref + ' ' + request.target.pos;
			// console.log(`${''.padRight(30)} : ${requestStr}`);
		}
		// console.log();
    }

    /**
	 * Logs the current state of the logistics group to the console; useful for debugging
	 */
	summarize(): void {
		// console.log(`Summary of logistics group for ${this.colony.name} at time ${Game.time}`);
		let info = [];
		for (const request of this.requests) {
			let targetType: string;
			if (request.target instanceof Resource) {
				targetType = 'resource';
			} else if (request.target instanceof Tombstone) {
				targetType = 'tombstone';
			} else {
				targetType = request.target.structureType;
			}
			let amount = 0;
			if (isResource(request.target)) {
				amount = request.target.amount;
			} else {
				if (request.resourceType == 'all') {
					if (isTombstone(request.target) || isStoreStructure(request.target)) {
						amount = _.sum(request.target.store);
					} else if (isEnergyStructure(request.target)) {
						amount = -0.001;
					}
				} else {
					if (isTombstone(request.target) || isStoreStructure(request.target)) {
						amount = request.target.store[request.resourceType] || 0;
					} else if (isEnergyStructure(request.target)) {
						amount = request.target.energy;
					}
				}

			}
			const targetingTprtrNames = _.map(LogisticsNetwork.targetingTransporters(request.target), c => c.name);
			info.push({
						  target       : targetType,
						  resourceType : request.resourceType,
						  requestAmount: request.amount,
						  currentAmount: amount,
                          targetedBy   : targetingTprtrNames,
                          //@ts-ignore
						  pos          : request.target.pos.print,
					  });
		}
		info = [];
		for (const transporter of this.base.commanders.logistics.transporters) {
			const task = transporter.task ? transporter.task.name : 'none';
			const target = transporter.task ?
						 transporter.task.proto._target.ref + ' ' + transporter.task.targetPos.printPlain : 'none';
			const nextAvailability = this.nextAvailability(transporter);
			info.push({
						  creep       : transporter.name,
						  pos         : transporter.pos.printPlain,
						  task        : task,
                          target      : target,
                          //@ts-ignore
						  availability: `available in ${nextAvailability[0]} ticks at ${nextAvailability[1].print}`,
					  });
		}
	}

    get matching(): { [creepName: string]: LogisticsRequest | undefined } {
		if (!this._matching) {
			this._matching = this.stableMatching(this.base.commanders.logistics.transporters);
		}
		return this._matching;
    }

    	/**
	 * Generate a stable matching of transporters to requests with Gale-Shapley algorithm
	 */
	private stableMatching(transporters: Unit[]): { [creepName: string]: LogisticsRequest | undefined } {
		const tPrefs: { [transporterName: string]: string[] } = {};
		for (const transporter of transporters) {
			tPrefs[transporter.name] = _.map(this.transporterPreferences(transporter), request => request.id);
		}
		const rPrefs: { [requestID: string]: string[] } = {};
		for (const request of this.requests) {
			rPrefs[request.id] = _.map(this.requestPreferences(request, transporters), transporter => transporter.name);
		}
		const stableMatching = new Matcher(tPrefs, rPrefs).match();
		const requestMatch = _.mapValues(stableMatching, reqID => _.find(this.requests, request => request.id == reqID));
		return requestMatch;
	}
}