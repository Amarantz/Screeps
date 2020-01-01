import { Commander, DEFAULT_PRESPAWN } from "../Commander";
import HandOfNod from "mcv/handOfNod";
import { CreepSetup } from "creeps/setups/CreepSetups";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Setups, Roles } from "creeps/setups/setups";
import { Tasks } from "tasks/Tasks";
import { Unit } from "unit/Unit";

export class QueenCommander extends Commander {
    handOfNod: HandOfNod;
    queenSetup: CreepSetup;
    queens: Unit[];
    settings: any;

    constructor(handOfNod: HandOfNod, priority = CommanderPriority.core.queen){
        super(handOfNod, 'supply', priority);
        this.handOfNod = handOfNod;
        this.queenSetup = this.base.storage ? Setups.queens.default : Setups.queens.early;
        this.queens = this.unit(Roles.queen);
        this.settings = {
            refillTowerBelow: 500,
        };
    }

    init() {
        const amount = 1;
        const prespawn = this.handOfNod.spawns.length <= 1 ? 100 : DEFAULT_PRESPAWN;
        this.wishList(amount, this.queenSetup, { prespawn: prespawn })
    }

    private supplyActions(queen: Unit){
        const request = this.handOfNod.transportRequests.getPrioritizedClosestRequest(queen.pos, 'supply');
        if(request){
            queen.task = Tasks.transfer(request.target);
        } else {
            this.rechargeActions(queen);
        }
    }

    private idleActions(queen: Unit){
        if(this.handOfNod.link) {

        } else {
            if(this.handOfNod.battery && queen.carry.energy < queen.carryCapacity) {
                queen.task = Tasks.withdraw(this.handOfNod.battery);
            }
        }
    }

    private handleQueen(queen: Unit) {
        if(queen.carry.energy > 0){
            this.supplyActions(queen);
        } else {
            this.rechargeActions(queen);
        }

        if(queen.isIdle){
            this.idleActions(queen);
        }
    }

    private rechargeActions(queen: Unit): void {
        if (this.handOfNod.link && !this.handOfNod.link.isEmpty) {
			queen.task = Tasks.withdraw(this.handOfNod.link);
		} else if (this.handOfNod.battery && this.handOfNod.battery.energy > 0) {
			queen.task = Tasks.withdraw(this.handOfNod.battery);
		} else {
			queen.task = Tasks.recharge();
		}
    }

    run(){
        for(const queen of this.queens){
            this.handleQueen(queen);
            if(queen.hasValidTask){
                queen.run();
            } else {
                if(this.queens.length > 1 ){
                    queen.goTo(this.handOfNod.idlePos, {range: 1});
                } else {
                    queen.goTo(this.handOfNod.idlePos);
                }
            }
        }
    }
}
