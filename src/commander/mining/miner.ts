import { bodyCost, CreepSetup } from "creeps/setups/CreepSetups";

import { Setups, Roles } from "creeps/setups/setups";
import Commander from "commander/Commander";
import DirectiveHavest from "directives/resource/harvest";
import Unit from "unit/Unit";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Cartographer, ROOMTYPE_SOURCEKEEPER } from "utils/Cartographer";

export const StandardMinerSetupCost = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));
export const DoubleMinerSetupCost = bodyCost(Setups.drones.miners.double.generateBody(Infinity));

const BUILD_OUTPUT_FREQUENCY = 15;
const SUICIDE_CHECK_FREQUENCY = 3;
const MINER_SUICIDE_THRESHOLD = 200;

export default class MiningCommander extends Commander {
    populateStructures() {
        throw new Error("Method not implemented.");
    }
    calculateContainerPos(): RoomPosition | undefined {
        throw new Error("Method not implemented.");
    }
    directive: DirectiveHavest;
    room: Room | undefined;
    source: Source | undefined;
    container: StructureContainer | undefined;
    link: StructureLink | undefined;
    constructionSite: ConstructionSite | undefined;
    harvestPos: RoomPosition | undefined;
    miners: Unit[];
    energyPerTick: number;
    miningPowerNeeded: number;
    mode: 'early' | 'SK' | 'link' | 'standard' | 'double';
    setup: CreepSetup;
    minersNeeded: number;
    allowDropMinig: boolean;
    static settings = {
        minLinkDistance: 10,
        dropMineUntilRCL: 3,
    }
    constructor(directive: DirectiveHavest, priority: number){
        super(directive, 'mine', priority)
        this.directive = directive;
        this.priority += this.outpostIndex * CommanderPriority.remoteRoom.roomIncrement;
        this.miners = this.unit(Roles.drone);
        this.populateStructures();
        if(Cartographer.roomType(this.pos.roomName) == ROOMTYPE_SOURCEKEEPER) {
            this.energyPerTick = SOURCE_ENERGY_KEEPER_CAPACITY /ENERGY_REGEN_TIME;
        } else if(this.base.level >= 3) {
            this.energyPerTick = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME
        } else {
            this.energyPerTick = SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME;
        }

        this.miningPowerNeeded = Math.ceil(this.energyPerTick / HARVEST_POWER) +1;
        if (Cartographer.roomType(this.pos.roomName) == ROOMTYPE_SOURCEKEEPER) {
			this.mode = 'SK';
			this.setup = Setups.drones.miners.sourceKeeper;
		} else if (this.base.room.energyCapacityAvailable < StandardMinerSetupCost) {
			this.mode = 'early';
			this.setup = Setups.drones.miners.default;
		} else if (this.link) {
			this.mode = 'link';
			this.setup = Setups.drones.miners.default;
		} else {
			this.mode = 'standard';
			this.setup = Setups.drones.miners.standard;
			// todo: double miner condition
        }

        const miningPowerEach = this.setup.getBodyPotential(WORK, this.base);
		this.minersNeeded = Math.min(Math.ceil(this.miningPowerNeeded / miningPowerEach),
									 this.pos.availableNeighbors(true).length);
		// Allow drop mining at low levels
		this.allowDropMinig = this.base.level < MiningCommander.settings.dropMineUntilRCL;
		if (this.mode != 'early' && !this.allowDropMinig) {
			if (this.container) {
				this.harvestPos = this.container.pos;
			} else if (this.link) {
				this.harvestPos = _.find(this.link.pos.availableNeighbors(true),
										 pos => pos.getRangeTo(this) == 1)!;
			} else {
				this.harvestPos = this.calculateContainerPos();
			}
		}
    }
    run(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        throw new Error("Method not implemented.");
    }
}
