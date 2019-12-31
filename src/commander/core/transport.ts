import { CommanderPriority } from 'priorities/priorities_commanders';
import Base from '../../Base';
import {log} from '../../console/log';
import {Roles, Setups} from '../../creeps/setups/setups';
import {isResource, isStoreStructure, isTombstone} from '../../declarations/typeGuards';
import {ALL_RESOURCE_TYPE_ERROR, BufferTarget, LogisticsRequest} from '../../logistics/LogisticsNetwork';
import {Pathing} from '../../movement/Pathing';
import {Tasks} from '../../tasks/Tasks';
import Unit from '../../unit/Unit';
import Commander from '../commander';

/**
 * The transport overlord handles energy transport throughout a colony
 */
export default class TransportOverlord extends Commander {

	transporters: Unit[];

	constructor(colony: Base, priority = CommanderPriority.ownedRoom.transport) {
		super(colony, 'logistics', priority);
		this.transporters = this.unit(Roles.transport);
	}

	private neededTransportPower(): number {

		if (!this.base.storage
			&& !(this.base.handOfNod && this.base.handOfNod.battery)
			&& !this.base.upgradeSite.battery) {
			return 0;
		}

		let transportPower = 0;
		const scaling = 2; // this.colony.stage == ColonyStage.Larva ? 1.5 : 2.0; // aggregate round-trip multiplier

		// Add contributions to transport power from hauling energy from mining sites
		for (const flagName in this.base.miningSites) {
			const o = this.base.miningSites[flagName].commanders.mine;
			if (!o.isSuspended && o.miners.length > 0) {
				// Only count sites which have a container output and which have at least one miner present
				// (this helps in difficult "rebooting" situations)
				if ((o.container && !o.link) || o.allowDropMining) {
					transportPower += o.energyPerTick * scaling * o.distance;
				}
			}
		}

		// Add transport power needed to move to upgradeSite
		if (this.base.upgradeSite.battery) {
			transportPower += UPGRADE_CONTROLLER_POWER * this.base.upgradeSite.upgradePowerNeeded * scaling *
							  Pathing.distance(this.base.pos, this.base.upgradeSite.battery.pos);
		}


		if (this.base.lowPowerMode) {
			// Reduce needed transporters when colony is in low power mode
			transportPower *= 0.5;
		}

		return transportPower / CARRY_CAPACITY;
	}

	init() {
		const ROAD_COVERAGE_THRESHOLD = 0.75; // switch from 1:1 to 2:1 transporters above this coverage threshold
		const setup = this.base.roomPlanner.roadPlanner.roadCoverage < ROAD_COVERAGE_THRESHOLD
					? Setups.transporters.early : Setups.transporters.default;

		const transportPowerEach = setup.getBodyPotential(CARRY, this.base);
		const neededTransportPower = this.neededTransportPower();
		const numTransporters = Math.ceil(neededTransportPower / transportPowerEach);

		if (this.transporters.length == 0) {
			this.wishList(numTransporters, setup, {priority: CommanderPriority.ownedRoom.firstTransport});
		} else {
			this.wishList(numTransporters, setup);
		}
	}

	private handleTransporter(transporter: Unit, request: LogisticsRequest | null | undefined) {
		if (request) {
			const choices = this.base.logisticsNetwork.bufferChoices(transporter, request);
			const bestChoice = _.last(_.sortBy(choices, choice => request.multiplier * choice.dQ
																/ Math.max(choice.dt, 0.1)));
			let task = null;
			const amount = this.base.logisticsNetwork.predictedRequestAmount(transporter, request);
			// Target is requesting input
			if (amount > 0) {
				if (isResource(request.target) || isTombstone(request.target)) {
					log.warning(`Improper logistics request: should not request input for resource or tombstone!`);
					return;
				} else if (request.resourceType == 'all') {
					log.error(`${this.print}: cannot request 'all' as input!`);
					return;
				} else {
					task = Tasks.transfer(request.target, request.resourceType);
				}
				if (bestChoice.targetRef != request.target.ref) {
					// If we need to go to a buffer first to get more stuff
					const buffer = deref(bestChoice.targetRef) as BufferTarget;
					const withdrawAmount = Math.min(buffer.store[request.resourceType] || 0,
												  transporter.carryCapacity - _.sum(transporter.carry), amount);
					task = task.fork(Tasks.withdraw(buffer, request.resourceType, withdrawAmount));
					if (transporter.hasMineralsInCarry && request.resourceType == RESOURCE_ENERGY) {
						task = task.fork(Tasks.transferAll(buffer));
					}
				}
			}
			// Target is requesting output
			else if (amount < 0) {
				if (isResource(request.target)) {
					task = Tasks.pickup(request.target);
				} else {
					if (request.resourceType == 'all') {
						if (!isStoreStructure(request.target) && !isTombstone(request.target)) {
							log.error(`TransportOverlord: ` + ALL_RESOURCE_TYPE_ERROR);
							return;
						}
						task = Tasks.withdrawAll(request.target);
					} else {
						task = Tasks.withdraw(request.target, request.resourceType);
					}
				}
				if (task && bestChoice.targetRef != request.target.ref) {
					// If we need to go to a buffer first to deposit stuff
					const buffer = deref(bestChoice.targetRef) as BufferTarget;
					task = task.fork(Tasks.transferAll(buffer));
				}
			} else {
				// console.log(`${transporter.name} chooses a store with 0 amount!`);
				transporter.park();
			}
			// Assign the task to the transporter
			transporter.task = task;
			this.base.logisticsNetwork.invalidateCache(transporter, request);
		} else {
			// If nothing to do, put everything in a store structure
			if (_.sum(transporter.carry) > 0) {
				if (transporter.hasMineralsInCarry) {
					const target = this.base.terminal || this.base.storage;
					if (target) {
						transporter.task = Tasks.transferAll(target);
					}
				} else {
					const dropoffPoints: (StructureLink | StructureStorage)[] = _.compact([this.base.storage!]);
					// , ...this.colony.dropoffLinks]);

					// let bestDropoffPoint = minBy(dropoffPoints, function(dropoff: StructureLink | StructureStorage) {
					// 	let range = transporter.pos.getMultiRoomRangeTo(dropoff.pos);
					// 	if (dropoff instanceof StructureLink) {
					// 		return Math.max(range, this.colony.linkNetwork.getDropoffAvailability(dropoff));
					// 	} else {
					// 		return range;
					// 	}
					// });

					const bestDropoffPoint = transporter.pos.findClosestByMultiRoomRange(dropoffPoints);

					if (bestDropoffPoint) transporter.task = Tasks.transfer(bestDropoffPoint);
				}
			} else {
				let parkingSpot = transporter.pos;
				if (this.base.storage) {
					parkingSpot = this.base.storage.pos;
				} else if (this.base.roomPlanner.storagePos) {
					parkingSpot = this.base.roomPlanner.storagePos;
				}
				transporter.park(parkingSpot);
			}
		}
		// console.log(JSON.stringify(transporter.memory.task));
	}

	private handleBigTransporter(bigTransporter: Unit) {
		const bestRequestViaStableMatching = this.base.logisticsNetwork.matching[bigTransporter.name];
		this.handleTransporter(bigTransporter, bestRequestViaStableMatching);
	}

	/* Handles small transporters, which don't do well with the logisticsNetwork's stable matching system */
	private handleSmolTransporter(smolTransporter: Unit) {
		// Just perform a single-sided greedy selection of all requests
		const bestRequestViaGreedy = _.first(this.base.logisticsNetwork.transporterPreferences(smolTransporter));
		this.handleTransporter(smolTransporter, bestRequestViaGreedy);
	}

	private pickupDroppedResources(transporter: Unit) {
		const droppedResource = transporter.pos.lookFor(LOOK_RESOURCES)[0];
		if (droppedResource) {
			transporter.pickup(droppedResource);
			return;
		}
		const tombstone = transporter.pos.lookFor(LOOK_TOMBSTONES)[0];
		if (tombstone) {
			const resourceType = _.last(_.sortBy(_.keys(tombstone.store),
											   resourceType => (tombstone.store[<ResourceConstant>resourceType] || 0)));
			transporter.withdraw(tombstone, <ResourceConstant>resourceType);
		}
	}

	run() {
		this.autoRun(this.transporters, transporter => this.handleSmolTransporter(transporter));
	}
}
