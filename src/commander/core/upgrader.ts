import Commander from "../Commander";
import UpgradeSite from "mcv/upgradeSite";
import { Roles, Setups } from "creeps/setups/setups";
import { CommanderPriority } from "priorities/priorities_commanders";
import Unit from "unit/Unit";
import { setFlagsFromString } from "v8";
import { Tasks } from "tasks/Tasks";

export class UpgradingCommander extends Commander {

    upgradersNeeded: number;
    upgraders: Unit[];
    upgradeSite: UpgradeSite;
    settings: {[property:string]: number};
    room: Room;

    constructor(upgradeSite: UpgradeSite, priority = CommanderPriority.upgrading.upgrade){
        super(upgradeSite, 'upgrade', priority);
        this.upgradeSite = upgradeSite;
        this.upgraders = this.unit(Roles.upgrader, {
            // boostWishList: [boostResource.upgrade[3]],
        })
    }

    init(){
        if(this.base.level < 3) {
            return;
        }
        if(this.base.assets[RESOURCE_ENERGY] > UpgradeSite.settings.energyBuffer || this.upgradeSite.controller.ticksToDowngrade < 500){
            const setup = this.base.level == 8 ? Setups.upgraders.rcl8 : Setups.upgraders.default;
            if(this.base.level == 8){
                this.wishList(1, setup)
            } else {
                const upgradePowerEach = setup.getBodyPotential(WORK, this.base);
                const upgradersNeeded = Math.ceil(this.upgradeSite.upgradePowerNeeded / upgradePowerEach);
                this.wishList(upgradersNeeded, setup)
            }
        }
    }

    private handleUpgrader(upgrader: Unit){
        if(upgrader.store.energy > 0){
            if(this.upgradeSite.link && this.upgradeSite.link.hits < this.upgradeSite.link.hitsMax){
                upgrader.task = Tasks.repair(this.upgradeSite.link);
                return;
            }

            if(this.upgradeSite.battery && this.upgradeSite.battery.hits < this.upgradeSite.battery.hitsMax){
                upgrader.task = Tasks.repair(this.upgradeSite.battery);
            }
            // Build construction site
			const inputSite = this.upgradeSite.findInputConstructionSite();
			if (inputSite) {
				upgrader.task = Tasks.build(inputSite);
				return;
			}
			// Sign controller if needed
			if (!this.upgradeSite.controller.signedByMe &&
				!this.upgradeSite.controller.signedByScreeps) {
				upgrader.task = Tasks.signController(this.upgradeSite.controller);
				return;
			}
			upgrader.task = Tasks.upgrade(this.upgradeSite.controller);
        } else {
            // Recharge from link or battery
			if (this.upgradeSite.link && this.upgradeSite.link.energy > 0) {
				upgrader.task = Tasks.withdraw(this.upgradeSite.link);
			} else if (this.upgradeSite.battery && this.upgradeSite.battery.energy > 0) {
				upgrader.task = Tasks.withdraw(this.upgradeSite.battery);
			}
			// Find somewhere else to recharge from
			else { // TODO: BUG HERE IF NO UPGRADE CONTAINER
				if (this.upgradeSite.battery && this.upgradeSite.battery.targetBy.length == 0) {
					upgrader.task = Tasks.recharge();
				}
			}
		}
    }

    run() {
        this.autoRun(this.upgraders, upgrader => this.handleUpgrader(upgrader));
    }
}
