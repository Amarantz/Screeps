import { Commander } from "commander/Commander";
import { DirectiveHaul } from "directives/resource/haul";
import { Unit } from "unit/Unit";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Roles, Setups } from "creeps/setups/setups";
import { Energetics } from "logistics/Energetics";
import { Pathing } from "movement/Pathing";
import { Tasks } from "tasks/Tasks";
import { isStoreStructure } from "declarations/typeGuards";
import { log } from "console/log";

export class HaulingCommander extends Commander {

	haulers: Unit[];
	directive: DirectiveHaul;

	requiredRCL: 4;

	constructor(directive: DirectiveHaul, priority = directive.hasDrops ? CommanderPriority.collectionUrgent.haul :
													 CommanderPriority.collection.haul) {
		super(directive, 'haul', priority);
		this.directive = directive;
		this.haulers = this.unit(Roles.transport);
	}

	init() {
		if (!this.base.storage || _.sum(this.base.storage.store) > Energetics.settings.storage.total.cap) {
			return;
		}
		// Spawn a number of haulers sufficient to move all resources within a lifetime, up to a max
		const MAX_HAULERS = 5;
		// Calculate total needed amount of hauling power as (resource amount * trip distance)
		const tripDistance = 2 * Pathing.distance((this.base.storage || this.base).pos, this.directive.pos);
		const haulingPowerNeeded = Math.min(this.directive.totalResources,
										  this.base.storage.storeCapacity
										  - _.sum(this.base.storage.store)) * tripDistance;
		// Calculate amount of hauling each hauler provides in a lifetime
		const haulerCarryParts = Setups.transporters.early.getBodyPotential(CARRY, this.base);
		const haulingPowerPerLifetime = CREEP_LIFE_TIME * haulerCarryParts * CARRY_CAPACITY;
		// Calculate number of haulers
		const numHaulers = Math.min(Math.ceil(haulingPowerNeeded / haulingPowerPerLifetime), MAX_HAULERS);
		// Request the haulers
		this.wishList(numHaulers, Setups.transporters.early);
	}

	private handleHauler(hauler: Unit) {
		if (_.sum(hauler.carry) == 0) {
			// Travel to directive and collect resources
			if (hauler.inSameRoomAs(this.directive)) {
				// Pick up drops first
				if (this.directive.hasDrops) {
					const allDrops: Resource[] = _.flatten(_.values(this.directive.drops));
					const drop = allDrops[0];
					if (drop) {
						hauler.task = Tasks.pickup(drop);
						return;
					}
				}
				// Withdraw from store structure
				if (this.directive.storeStructure) {
					let store: { [resourceType: string]: number } = {};
					if (isStoreStructure(this.directive.storeStructure)) {
						store = this.directive.storeStructure.store;
					} else {
						store = {energy: this.directive.storeStructure.energy};
					}
					for (const resourceType in store) {
						if (store[resourceType] > 0) {
							hauler.task = Tasks.withdraw(this.directive.storeStructure, <ResourceConstant>resourceType);
							return;
						}
					}
				}
				// Shouldn't reach here
				log.warning(`${hauler.name} in ${hauler.room.print}: nothing to collect!`);
			} else {
				// hauler.task = Tasks.goTo(this.directive);
				hauler.goTo(this.directive);
			}
		} else {
			// Travel to base room and deposit resources
			if (hauler.inSameRoomAs(this.base)) {
				// Put energy in storage and minerals in terminal if there is one
				for (const resourceType in hauler.carry) {
					if (hauler.carry[<ResourceConstant>resourceType] == 0) continue;
					if (resourceType == RESOURCE_ENERGY) { // prefer to put energy in storage
						if (this.base.storage && _.sum(this.base.storage.store) < STORAGE_CAPACITY) {
							hauler.task = Tasks.transfer(this.base.storage, resourceType);
							return;
						} else if (this.base.terminal && _.sum(this.base.terminal.store) < TERMINAL_CAPACITY) {
							hauler.task = Tasks.transfer(this.base.terminal, resourceType);
							return;
						}
					} else { // prefer to put minerals in terminal
						if (this.base.terminal && _.sum(this.base.terminal.store) < TERMINAL_CAPACITY) {
							hauler.task = Tasks.transfer(this.base.terminal, <ResourceConstant>resourceType);
							return;
						} else if (this.base.storage && _.sum(this.base.storage.store) < STORAGE_CAPACITY) {
							hauler.task = Tasks.transfer(this.base.storage, <ResourceConstant>resourceType);
							return;
						}
					}
				}
				// Shouldn't reach here
				log.warning(`${hauler.name} in ${hauler.room.print}: nowhere to put resources!`);
			} else {
				hauler.task = Tasks.goToRoom(this.base.room.name);
			}
		}
	}

	run() {
		for (const hauler of this.haulers) {
			if (hauler.isIdle) {
				this.handleHauler(hauler);
			}
			hauler.run();
		}
	}
}