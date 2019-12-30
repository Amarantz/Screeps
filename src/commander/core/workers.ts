import Commander, { UnitOptions } from "../Commander";
import Unit from "unit/Unit";
import { CommanderPriority } from "priorities/priorities_commanders";
import Base, { BaseStage, DEFCON } from "Base";
import { Roles, Setups } from "creeps/setups/setups";
import $ from "caching/GlobalCache";
import { Tasks } from "tasks/Tasks";

export default class WorkerCommander extends Commander {
    workers: Unit[];
    room: Room;
    repairStructures: Structure[];
    dismantalStrutures: Structure[];
    fortifyBarriers: (StructureWall | StructureRampart)[];
    criticalBarriers: (StructureWall | StructureRampart)[];

    constructor(base: Base, priority = CommanderPriority.ownedRoom.work){
        super(base, 'worker', priority);
        const opts: UnitOptions = {};
        this.workers = this.unit(Roles.worker, opts);
    }

    init() {
        const setup = this.base.level === 1 ? Setups.workers.early : Setups.workers.default;
        const workPartsPerWorker = setup.getBodyPotential(WORK, this.base);
        let numWorkers: number = 0;
        if(this.base.stage == BaseStage.MCV){
            numWorkers = $.number(this, 'numWorkers', () => {
                const MAX_WORKERS = 10; // Maximum number of workers to spawn
				const energyMinedPerTick = _.sum(_.map(this.base.miningSites, function(site) {
					const commanders = site.commanders.mine;
					const miningPowerAssigned = _.sum(commanders.miners, miner => miner.getActiveBodyparts(WORK));
					const saturation = Math.min(miningPowerAssigned / commanders.miningPowerNeeded, 1);
					return commanders.energyPerTick * saturation;
				}));
				const energyPerTickPerWorker = 1.1 * workPartsPerWorker; // Average energy per tick when working
				const workerUptime = 0.8;
				const numWorkers = Math.ceil(energyMinedPerTick / (energyPerTickPerWorker * workerUptime));
				return Math.min(numWorkers, MAX_WORKERS);
            });
        }
        this.wishList(numWorkers, setup);
    }

    private upgradeActions(worker: Unit): boolean {
        if((this.base.controller.signedByMe && !this.base.controller.signedByScreeps)){
            worker.task = Tasks.signController(this.base.controller);
            return true;
        };
        worker.task = Tasks.upgrade(this.room.controller!);
        return true;
    }

    private handleWorker(worker: Unit){
        if(worker.store.energy > 0){
            if (this.base.controller.ticksToDowngrade <= (this.base.level >= 4 ? 10000 : 2000)) {
				if (this.upgradeActions(worker)) return;
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
