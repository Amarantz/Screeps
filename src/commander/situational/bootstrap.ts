import { Commander } from "commander/Commander"
import { DirectiveBootstrap } from "directives/situational/bootstrap";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Roles, Setups } from "creeps/setups/setups";
import Unit from "unit/unit";
import { SpawnRequest } from "componets/HandOfNod";
import { BasesStage } from "Base";
import { Tasks } from "Task/Tasks";

export default class BootstrappingCommander extends Commander {
    room: Room;
    fillers: Unit[];
    withdrawStructures: (StructureStorage | StructureTerminal | StructureContainer | StructureLink | StructureTower | StructureLab | StructurePowerSpawn | StructureNuker)[];
    supplyStructures: (StructureSpawn | StructureExtension)[];
    static settings = {
        spawnBootstrapMinerThreshold: 2500,
    }
    constructor(directive: DirectiveBootstrap, priority = CommanderPriority.emergency.bootstrap){
        super(directive, 'bootstrap', priority);
        this.fillers = this.unit(Roles.filler);
        this.supplyStructures = _.filter([...this.base.spawns, ...this.base.extension], structure => structure.store.getUsedCompacity() < structure.store.getCompacity())
    }
    private spawnBootstrapMiner() {
        let miningSites = _.filter(_.values(this.base.miningSites),(site: DirectiveHarvest) => site.room == this.base.room) as DirectiveHarvest[];
        if(this.base.spawns[0]){
            miningSites = _.sortBy(miningSites, site => site.pos.getRangeTo(this.base.spawns[0]));
        }
        const miningCommanders = _.map(miningSites, site => site.commanders.mine);
        for (const commander of miningCommanders){
            const filteredMiners = this.lifetimeFilter(commander.miners);
            const miningPowerAssigned = _.sum(_.map(this.lifetimeFilter(commander.miners), creep => creep.getActiveBodyparts(WORK)));
            if(miningPowerAssigned < Commander.miningPowerNeed && filteredMiners.length < commander.pos.availableNeighbors().lenght){
                if(this.base.handOfNod){
                    const request: SpawnRequest = {
                        setup: Setups.drones.miners.emergency,
                        commander: commander,
                        priority: this.priority + 1,
                    }
                    this.base.handOfNod.enqueue(request);
                }
            }
        }
    }
    init(): void {
        		// At early levels, spawn one miner, then a filler, then the rest of the miners
		if (this.base.stage == BasesStage.MCV) {
			if (this.base.getCreepsByRole(Roles.drone).length == 0) {
				this.spawnBootstrapMiner();
				return;
			}
		}
		// Spawn fillers
		if (this.base.getCreepsByRole(Roles.queen).length == 0 && this.base.handOfNod) { // no queen
			const transporter = _.first(this.base.getUnitsByRole(Roles.transport));
			if (transporter) {
				// reassign transporter to be queen
				transporter.reassign(this.base.handOfNod.overlord, Roles.queen);
			} else {
				// wish for a filler
				this.wishlist(1, Setups.filler);
			}
		}
		// Then spawn the rest of the needed miners
		const energyInStructures = _.sum(_.map(this.withdrawStructures, structure => structure.energy));
		const droppedEnergy = _.sum(this.room.droppedEnergy, drop => drop.amount);
		if (energyInStructures + droppedEnergy < BootstrappingCommander.settings.spawnBootstrapMinerThreshold) {
			this.spawnBootstrapMiner();
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
		if (filler.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
			this.supplyActions(filler);
		} else {
			this.rechargeActions(filler);
		}
	}



    run(): void {
        for (const filler of this.fillers) {
            if(filler.isIdle){
                this.handleFiller(filler);
            }
            filler.run();
        }
    }
}
