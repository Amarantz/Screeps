import { bodyCost } from "creeps/setups/CreepSetups";
import {Roles, Setups} from 'creeps/setups/setups'
import { Commander } from "commander/Commander";

export const StandardMinerSetupCost = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));
export const DoubleMinerCost = bodyCost(Setups.drones.miners.double.generateBody(Infinity));

const BUILD_OUTPUT_FREQUENCY = 15;
const SUICIDE_CHECK_FREQUENCY = 3;
const MINER_SUICIDE_THRSHOLD = 200;

export class MiningCommander extends Commander {
    static settings = {
        minLinkDistance: 10,
        dropMineUntilRCL: 3,
    }

    constructor(directive: DirectiveHarvest, priority: number){
        super(directive, 'mine', priority);
        
    }
}
