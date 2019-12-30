import Commander from "commander/Commander";
import DirectiveBootstrap  from "directives/situational/bootstrap";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Roles, Setups } from "creeps/setups/setups";
import { BaseStage } from "Base";
import { SpawnRequest } from "mcv/handOfNod";
import DirectiveHarvest from 'directives/resource/harvest';
import Unit from "unit/Unit";

export default class BoostrappingCommander extends Commander {
    room: Room;
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
		this.supplyStructures = _.filter([...this.base.spawns, ...this.base.extentions],
										 structure => structure.energy < structure.energyCapacity);
		this.withdrawStructures = _.filter(_.compact([this.base.storage!,
													  this.base.terminal!,
													//   this.base.powerSpawn!,
													  ...this.room.containers,
													  ...this.room.links,
													  ...this.room.towers,
													  ...this.room.labs]), structure => structure.energy > 0);
	}

    run(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        		// At early levels, spawn one miner, then a filler, then the rest of the miners
		if (this.base.stage == BaseStage.MCV) {
			if (this.base.getCreepsByRole(Roles.drone).length == 0) {
				this.spawnBootstrapMiners();
				return;
			}
        }
    }

    private spawnBootstrapMiners() {
		// Isolate mining site overlords in the room
		let miningSites = _.filter(_.values(this.base.miningSites),
								   (site: DirectiveHarvest) => site.room == this.base.room) as DirectiveHarvest[];
		if (this.base.spawns[0]) {
			miningSites = _.sortBy(miningSites, site => site.pos.getRangeTo(this.base.spawns[0]));
		}
		const miningCommander = _.map(miningSites, site => site.commanders.mine);

		// Create a bootstrapMiners and donate them to the miningSite overlords as needed
		for (const commander of miningCommander) {
			const filteredMiners = this.lifetimeFilter(commander.miners);
			const miningPowerAssigned = _.sum(_.map(this.lifetimeFilter(commander.miners),
												  creep => creep.getActiveBodyparts(WORK)));
			if (miningPowerAssigned < commander.miningPowerNeeded &&
				filteredMiners.length < commander.pos.availableNeighbors().length) {
				if (this.base.handOfNod) {
					const request: SpawnRequest = {
						setup   : Setups.drones.miners.emergency,
						commander,
						priority: this.priority + 1,
					};
					this.base.handOfNod.enqueue(request);
				}
			}
		}
	}


}
