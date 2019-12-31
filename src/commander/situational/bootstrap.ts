import Unit from "unit/Unit";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Roles, Setups } from "creeps/setups/setups";
import Commander from "../Commander";
import DirectiveBootstrap from "../../directives/situational/bootstrap";
import { SpawnRequest } from "../../mcv/handOfNod";
import DirectiveHarvest from "../../directives/resource/harvest";
import { Tasks } from "../../tasks/Tasks";
import { BaseStage } from "Base";

export default class BootstrappingCommander extends Commander {

	room: Room; // Definitely has vision
	fillers: Unit[];
	withdrawStructures: (StructureStorage | StructureTerminal | StructureContainer | StructureLink |
		StructureTower | StructureLab | StructurePowerSpawn | StructureNuker)[];
	supplyStructures: (StructureSpawn | StructureExtension)[];

	static settings = {
		spawnBootstrapMinerThreshold: 2500
	};

	constructor(directive: DirectiveBootstrap, priority = CommanderPriority.emergency.bootstrap) {
		super(directive, 'bootstrap', priority);
		this.fillers = this.unit(Roles.filler);
		// Calculate structures fillers can supply / withdraw from
		this.supplyStructures = _.filter([...this.base.spawns, ...this.base.extensions],
										 structure => structure.energy < structure.energyCapacity);
		this.withdrawStructures = _.filter(_.compact([this.base.storage!,
													  this.base.terminal!,
													  this.base.powerSpawn!,
													  ...this.room.containers,
													  ...this.room.links,
													  ...this.room.towers,
													  ...this.room.labs]), structure => structure.energy > 0);
	}

	private spawnBootstrapMiners() {
		// Isolate mining site overlords in the room
		let miningSites = _.filter(_.values(this.base.miningSites),
								   (site: DirectiveHarvest) => site.room == this.base.room) as DirectiveHarvest[];
		if (this.base.spawns[0]) {
			miningSites = _.sortBy(miningSites, site => site.pos.getRangeTo(this.base.spawns[0]));
		}
		const miningCommanders = _.map(miningSites, site => site.commanders.mine);

		// Create a bootstrapMiners and donate them to the miningSite overlords as needed
		for (const commander of miningCommanders) {
			const filteredMiners = this.lifetimeFilter(commander.miners);
			const miningPowerAssigned = _.sum(_.map(this.lifetimeFilter(commander.miners),
												  creep => creep.getActiveBodyparts(WORK)));
			if (miningPowerAssigned < commander.miningPowerNeeded &&
				filteredMiners.length < commander.pos.availableNeighbors().length) {
				if (this.base.handOfNod) {
					const request: SpawnRequest = {
						setup   : Setups.drones.miners.emergency,
						commander: commander,
						priority: this.priority + 1,
					};
					this.base.handOfNod.enqueue(request);
				}
			}
		}
	}

	init() {
		// At early levels, spawn one miner, then a filler, then the rest of the miners
		if (this.base.stage == BaseStage.MCV) {
			if (this.base.getCreepsByRole(Roles.drone).length == 0) {
				this.spawnBootstrapMiners();
				return;
			}
		}
		// Spawn fillers
		if (this.base.getCreepsByRole(Roles.queen).length == 0 && this.base.handOfNod) { // no queen
			const transporter = _.first(this.base.getUnitByRole(Roles.transport));
			if (transporter) {
				// reassign transporter to be queen
				transporter.reassign(this.base.handOfNod.commander, Roles.queen);
			} else {
				// wish for a filler
				this.wishList(1, Setups.filler);
			}
		}
		// Then spawn the rest of the needed miners
		const energyInStructures = _.sum(_.map(this.withdrawStructures, structure => structure.energy));
		const droppedEnergy = _.sum(this.room.droppedEnergy, drop => drop.amount);
		if (energyInStructures + droppedEnergy < BootstrappingCommander.settings.spawnBootstrapMinerThreshold) {
			this.spawnBootstrapMiners();
		}
	}

	private supplyActions(filler: Unit) {
		const target = filler.pos.findClosestByRange(this.supplyStructures);
		if (target) {
			filler.task = Tasks.transfer(target);
		} else {
			this.rechargeActions(filler);
		}
	}

	private rechargeActions(filler: Unit) {
		const target = filler.pos.findClosestByRange(this.withdrawStructures);
		if (target) {
			filler.task = Tasks.withdraw(target);
		} else {
			filler.task = Tasks.recharge();
		}
	}

	private handleFiller(filler: Unit) {
		if (filler.carry.energy > 0) {
			this.supplyActions(filler);
		} else {
			this.rechargeActions(filler);
		}
	}

	run() {
		for (const filler of this.fillers) {
			if (filler.isIdle) {
				this.handleFiller(filler);
			}
			filler.run();
		}
	}
}
