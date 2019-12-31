import Commander, { UnitOptions } from "../Commander";
import Unit from "unit/Unit";
import { CommanderPriority } from "priorities/priorities_commanders";
import Base, { BaseStage, DEFCON } from "Base";
import { Roles, Setups } from "creeps/setups/setups";
import $ from "caching/GlobalCache";
import { Tasks } from "tasks/Tasks";
import { Cartographer, ROOMTYPE_CONTROLLER } from "../../utils/Cartographer";
import { Task } from "../../tasks/Task";
import { minBy } from "../../utils/utils";
import { FortifyPriorities, BuildPriorities } from "../../priorities/priorities_structures";
import { boostResources } from "../../resources/map_resources";
import { TERMINAL_STATE_REBUILD } from "directives/terminalState/DirectiveTerminalRebuil";

export default class WorkerCommander extends Commander {

	workers: Unit[];
	room: Room;
	repairStructures: Structure[];
	dismantleStructures: Structure[];
	fortifyBarriers: (StructureWall | StructureRampart)[];
	criticalBarriers: (StructureWall | StructureRampart)[];
	constructionSites: ConstructionSite[];
	nukeDefenseRamparts: StructureRampart[];
	nukeDefenseHitsRemaining: { [id: string]: number };

	static settings = {
		barrierHits         : {			// What HP to fortify barriers to at each RCL
			critical: 2500,
			1       : 3e+3,
			2       : 3e+3,
			3       : 1e+4,
			4       : 5e+4,
			5       : 1e+5,
			6       : 5e+5,
			7       : 1e+6,
			8       : 2e+7,
		},
		hitTolerance        : 100000, 	// allowable spread in HP
		fortifyDutyThreshold: 500000,	// ignore fortify duties until this amount of energy is present in the room
	};

	constructor(base: Base, priority = CommanderPriority.ownedRoom.work) {
		super(base, 'worker', priority);
		// Compute barriers needing fortification or critical attention
		this.fortifyBarriers = $.structures(this, 'fortifyBarriers', () =>
			_.sortBy(_.filter(this.room.barriers, s =>
				s.hits < WorkerCommander.settings.barrierHits[this.base.level]
				&& this.base.roomPlanner.barrierPlanner.barrierShouldBeHere(s.pos)
			), s => s.hits), 25);
		this.criticalBarriers = $.structures(this, 'criticalBarriers', () =>
			_.filter(this.fortifyBarriers,
					 barrier => barrier.hits < WorkerCommander.settings.barrierHits.critical), 10);
		// Generate a list of structures needing repairing (different from fortifying except in critical case)
		this.repairStructures = $.structures(this, 'repairStructures', () =>
			_.filter(this.base.repairables, structure => {
				if (structure.structureType == STRUCTURE_CONTAINER) {
					// only repair containers in owned room
					if (structure.pos.roomName == this.base.name) {
						return structure.hits < 0.5 * structure.hitsMax;
					} else {
						return false;
					}
				} else {
					return structure.hits < structure.hitsMax;
				}
			}));
		this.dismantleStructures = [];

		const homeRoomName = this.base.room.name;
		const defcon = this.base.defcon;
		// Filter constructionSites to only build valid ones
		const room = this.base.room as any;
		const level = this.base.controller.level;
		this.constructionSites = _.filter(this.base.constructionSites, function(site) {
			// If site will be more than max amount of a structure at current level, ignore (happens after downgrade)
			const structureAmount = room[site.structureType + 's'] ? room[site.structureType + 's'].length :
									(room[site.structureType] ? 1 : 0);
			if (structureAmount >= CONTROLLER_STRUCTURES[site.structureType][level]) {
				return false;
			}
			if (defcon > DEFCON.safe) {
				// Only build non-road, non-container sites in the home room if defcon is unsafe
				return site.pos.roomName == homeRoomName &&
					   site.structureType != STRUCTURE_CONTAINER &&
					   site.structureType != STRUCTURE_ROAD;
			} else {
				// Build all non-container sites in outpost and all sites in room if defcon is safe
				if (site.pos.roomName != homeRoomName
					&& Cartographer.roomType(site.pos.roomName) == ROOMTYPE_CONTROLLER) {
					return site.structureType != STRUCTURE_CONTAINER &&
						   !(site.room && site.room.dangerousHostiles.length > 0);
				} else {
					return true;
				}
			}
		});

		// Nuke defense ramparts needing fortification
		this.nukeDefenseRamparts = [];
		this.nukeDefenseHitsRemaining = {};
		if (this.room.find(FIND_NUKES).length > 0) {
			for (const rampart of this.base.room.ramparts) {
				const neededHits = this.neededRampartHits(rampart);
				if (rampart.hits < neededHits) {
					this.nukeDefenseRamparts.push(rampart);
					this.nukeDefenseHitsRemaining[rampart.id] = neededHits - rampart.hits;
				}
			}
		}

		// Spawn boosted workers if there is significant fortifying which needs to be done
		const opts: UnitOptions = {};
		const totalNukeDefenseHitsRemaining = _.sum(_.values(this.nukeDefenseHitsRemaining));
		const approximateRepairPowerPerLifetime = REPAIR_POWER * 50 / 3 * CREEP_LIFE_TIME;
		if (totalNukeDefenseHitsRemaining > 3 * approximateRepairPowerPerLifetime) {
			opts.boostWishList = [boostResources.construct[3]];
		}

		// Register workers
		this.workers = this.unit(Roles.worker, opts);
	}

	private neededRampartHits(rampart: StructureRampart): number {
		let neededHits = WorkerCommander.settings.barrierHits[this.base.level];
		for (const nuke of rampart.pos.lookFor(LOOK_NUKES)) {
			neededHits += 10e6;
		}
		for (const nuke of rampart.pos.findInRange(FIND_NUKES, 3)) {
			if (nuke.pos != rampart.pos) {
				neededHits += 5e6;
			}
		}
		return neededHits;
	}

	refresh() {
		super.refresh();
		$.refresh(this, 'repairStructures', 'dismantleStructures', 'fortifyBarriers', 'criticalBarriers',
				  'constructionSites', 'nukeDefenseRamparts');
	}

	init() {
		const setup = this.base.level == 1 ? Setups.workers.early : Setups.workers.default;
		const workPartsPerWorker = setup.getBodyPotential(WORK, this.base);
		let numWorkers: number;
		if (this.base.stage == BaseStage.MCV) {
			numWorkers = $.number(this, 'numWorkers', () => {
				// At lower levels, try to saturate the energy throughput of the base
				const MAX_WORKERS = 10; // Maximum number of workers to spawn
				const energyMinedPerTick = _.sum(_.map(this.base.miningSites, function(site) {
					const overlord = site.commanders.mine;
					const miningPowerAssigned = _.sum(overlord.miners, miner => miner.getActiveBodyparts(WORK));
					const saturation = Math.min(miningPowerAssigned / overlord.miningPowerNeeded, 1);
					return overlord.energyPerTick * saturation;
				}));
				const energyPerTickPerWorker = 1.1 * workPartsPerWorker; // Average energy per tick when working
				const workerUptime = 0.8;
				const numWorkers = Math.ceil(energyMinedPerTick / (energyPerTickPerWorker * workerUptime));
				return Math.min(numWorkers, MAX_WORKERS);
			});
		} else {
			if (this.base.roomPlanner.memory.relocating) {
				// If relocating, maintain a maximum of workers
				numWorkers = 5;
			} else {
				numWorkers = $.number(this, 'numWorkers', () => {
					// At higher levels, spawn workers based on construction and repair that needs to be done
					const MAX_WORKERS = 5; // Maximum number of workers to spawn
					if (this.nukeDefenseRamparts.length > 0) {
						return MAX_WORKERS;
					}
					const buildTicks = _.sum(this.constructionSites,
										   site => Math.max(site.progressTotal - site.progress, 0)) / BUILD_POWER;
					const repairTicks = _.sum(this.repairStructures,
											structure => structure.hitsMax - structure.hits) / REPAIR_POWER;
					const paveTicks = _.sum(this.base.rooms,
										  room => this.base.roadLogistics.energyToRepave(room)) / 1; // repairCost=1
					let fortifyTicks = 0;
					if (this.base.assets.energy > WorkerCommander.settings.fortifyDutyThreshold) {
						fortifyTicks = 0.25 * _.sum(this.fortifyBarriers, barrier =>
							Math.max(0, WorkerCommander.settings.barrierHits[this.base.level]
										- barrier.hits)) / REPAIR_POWER;
					}
					// max constructionTicks for private server manually setting progress
					let numWorkers = Math.ceil(2 * (5 * buildTicks + repairTicks + paveTicks + fortifyTicks) /
											   (workPartsPerWorker * CREEP_LIFE_TIME));
					numWorkers = Math.min(numWorkers, MAX_WORKERS);
					if (this.base.controller.ticksToDowngrade <= (this.base.level >= 4 ? 10000 : 2000)) {
						numWorkers = Math.max(numWorkers, 1);
					}
					return numWorkers;
				});
			}
		}
		this.wishList(numWorkers, setup);
	}

	private repairActions(worker: Unit): boolean {
		const target = worker.pos.findClosestByMultiRoomRange(this.repairStructures);
		if (target) {
			worker.task = Tasks.repair(target);
			return true;
		} else {
			return false;
		}
	}

	private buildActions(worker: Unit): boolean {
		const groupedSites = _.groupBy(this.constructionSites, site => site.structureType);
		for (const structureType of BuildPriorities) {
			if (groupedSites[structureType]) {
				const target = worker.pos.findClosestByMultiRoomRange(groupedSites[structureType]);
				if (target) {
					worker.task = Tasks.build(target);
					return true;
				}
			}
		}
		return false;
	}

	private dismantleActions(worker: Unit): boolean {
		const targets = _.filter(this.dismantleStructures, s => (s.targetBy || []).length < 3);
		const target = worker.pos.findClosestByMultiRoomRange(targets);
		if (target) {
			_.remove(this.dismantleStructures, s => s == target);
			worker.task = Tasks.dismantle(target);
			return true;
		} else {
			return false;
		}
	}

	// Find a suitable repair ordering of roads with a depth first search
	private buildPavingManifest(worker: Unit, room: Room): Task | null {
		let energy = worker.carry.energy;
		const targetRefs: { [ref: string]: boolean } = {};
		const tasks: Task[] = [];
		let target: StructureRoad | undefined;
		let previousPos: RoomPosition | undefined;
		while (true) {
			if (energy <= 0) break;
			if (previousPos) {
				target = _.find(this.base.roadLogistics.repairableRoads(room),
								road => road.hits < road.hitsMax && !targetRefs[road.id]
										&& road.pos.getRangeTo(previousPos!) <= 1);
			} else {
				target = _.find(this.base.roadLogistics.repairableRoads(room),
								road => road.hits < road.hitsMax && !targetRefs[road.id]);
			}
			if (target) {
				previousPos = target.pos;
				targetRefs[target.id] = true;
				energy -= (target.hitsMax - target.hits) / REPAIR_POWER;
				tasks.push(Tasks.repair(target));
			} else {
				break;
			}
		}
		return Tasks.chain(tasks);
	}

	private pavingActions(worker: Unit): boolean {
		const roomToRepave = this.base.roadLogistics.workerShouldRepave(worker)!;
		this.base.roadLogistics.registerWorkerAssignment(worker, roomToRepave);
		// Build a paving manifest
		const task = this.buildPavingManifest(worker, roomToRepave);
		if (task) {
			worker.task = task;
			return true;
		} else {
			return false;
		}
	}

	private fortifyActions(worker: Unit, fortifyStructures = this.fortifyBarriers): boolean {
		let lowBarriers: (StructureWall | StructureRampart)[];
		const highestBarrierHits = _.max(_.map(fortifyStructures, structure => structure.hits));
		if (highestBarrierHits > WorkerCommander.settings.hitTolerance) {
			// At high barrier HP, fortify only structures that are within a threshold of the lowest
			const lowestBarrierHits = _.min(_.map(fortifyStructures, structure => structure.hits));
			lowBarriers = _.filter(fortifyStructures, structure => structure.hits <= lowestBarrierHits +
                WorkerCommander.settings.hitTolerance);
		} else {
			// Otherwise fortify the lowest N structures
			const numBarriersToConsider = 5; // Choose the closest barrier of the N barriers with lowest hits
			lowBarriers = _.take(fortifyStructures, numBarriersToConsider);
		}
		const target = worker.pos.findClosestByMultiRoomRange(lowBarriers);
		if (target) {
			worker.task = Tasks.fortify(target);
			return true;
		} else {
			return false;
		}
	}

	private nukeFortifyActions(worker: Unit, fortifyStructures = this.nukeDefenseRamparts): boolean {
		const target = minBy(fortifyStructures, rampart => {
			const structuresUnderRampart = rampart.pos.lookFor(LOOK_STRUCTURES);
			return _.min(_.map(structuresUnderRampart, structure => {
				const priority = _.findIndex(FortifyPriorities, sType => sType == structure.structureType);
				if (priority >= 0) { // if found
					return priority;
				} else { // not found
					return 999;
				}
			}));
		});
		if (target) {
			worker.task = Tasks.fortify(target);
			return true;
		} else {
			return false;
		}
	}

	private upgradeActions(worker: Unit): boolean {
		// Sign controller if needed
		if ((!this.base.controller.signedByMe && !this.base.controller.signedByScreeps)) {
			worker.task = Tasks.signController(this.base.controller);
			return true;
		}
		worker.task = Tasks.upgrade(this.room.controller!);
		return true;
	}

	private handleWorker(worker: Unit) {
		if (worker.carry.energy > 0) {
			// Upgrade controller if close to downgrade
			if (this.base.controller.ticksToDowngrade <= (this.base.level >= 4 ? 10000 : 2000)) {
				if (this.upgradeActions(worker)) return;
			}
			// Repair damaged non-road non-barrier structures
			if (this.repairStructures.length > 0 && this.base.defcon == DEFCON.safe) {
				if (this.repairActions(worker)) return;
			}
			// Fortify critical barriers
			if (this.criticalBarriers.length > 0) {
				if (this.fortifyActions(worker, this.criticalBarriers)) return;
			}
			// Build new structures
			if (this.constructionSites.length > 0) {
				if (this.buildActions(worker)) return;
			}
			// Build ramparts to block incoming nuke
			if (this.nukeDefenseRamparts.length > 0 && this.base.terminalState != TERMINAL_STATE_REBUILD) {
				if (this.nukeFortifyActions(worker, this.nukeDefenseRamparts)) return;
			}
			// Build and maintain roads
			if (this.base.roadLogistics.workerShouldRepave(worker) && this.base.defcon == DEFCON.safe) {
				if (this.pavingActions(worker)) return;
			}
			// Dismantle marked structures
			if (this.dismantleStructures.length > 0 && this.base.defcon == DEFCON.safe) {
				if (this.dismantleActions(worker)) return;
			}
			// Fortify walls and ramparts
			if (this.fortifyBarriers.length > 0) {
				if (this.fortifyActions(worker, this.fortifyBarriers)) return;
			}
			// Upgrade controller if less than RCL8 or no upgraders
			if ((this.base.level < 8 || this.base.upgradeSite.commander.upgraders.length == 0)
				&& this.base.defcon == DEFCON.safe) {
				if (this.upgradeActions(worker)) return;
			}
		} else {
			// Acquire more energy
			const workerWithdrawLimit = this.base.stage == BaseStage.MCV ? 750 : 100;
			worker.task = Tasks.recharge(workerWithdrawLimit);
		}
	}

	run() {
		this.autoRun(this.workers, worker => this.handleWorker(worker),
					 worker => worker.flee(worker.room.fleeDefaults, {invalidateTask: true}));
    }
}
