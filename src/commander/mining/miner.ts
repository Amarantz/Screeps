import { bodyCost, CreepSetup } from "creeps/setups/CreepSetups";

import { Setups, Roles } from "../../creeps/setups/setups";
import { Commander } from "../../commander/Commander";
import DirectiveHavest from "../../directives/resource/harvest";
import { Unit } from "../../unit/Unit";
import { CommanderPriority } from "../../priorities/priorities_commanders";
import { Cartographer, ROOMTYPE_SOURCEKEEPER } from "../../utils/Cartographer";
import { log } from "../../console/log";
import { maxBy, minBy } from "../../utils/utils";
import { Pathing } from "../../movement/Pathing";
import {$} from "../../caching/GlobalCache";
import { BaseStage } from "../../Base";

export const StandardMinerSetupCost = bodyCost(Setups.drones.miners.standard.generateBody(Infinity));
export const DoubleMinerSetupCost = bodyCost(Setups.drones.miners.double.generateBody(Infinity));

const BUILD_OUTPUT_FREQUENCY = 15;
const SUICIDE_CHECK_FREQUENCY = 3;
const MINER_SUICIDE_THRESHOLD = 200;

export default class MiningCommander extends Commander {
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
    allowDropMining: boolean;
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
		this.allowDropMining = this.base.level < MiningCommander.settings.dropMineUntilRCL;
		if (this.mode != 'early' && !this.allowDropMining) {
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
        for (const miner of this.miners){
            this.handleMiner(miner);
        }
        if (this.room && Game.time % BUILD_OUTPUT_FREQUENCY == 1) {
            this.addRemoveContainer();
        }
        if(Game.time % SUICIDE_CHECK_FREQUENCY) {
            this.suicideOldMiners();
        }
    }
    init(): void {
        this.wishList(this.minersNeeded, this.setup);
        this.registerEnergyRequest();
    }
    get distance(): number {
		return this.directive.distance;
	}

    private handleMiner(miner: Unit) {
    //@ts-ignore
        if(miner.flee(miner.room.fleeDefaults, { dropEnergey: true })){
            return;
        }

        if(this.mode == 'early' || !this.harvestPos){
            if(!miner.pos.inRangeToPos(this.pos, 1)){
                return miner.goTo(this);
            }
        }

        switch(this.mode){
            case 'early':
                return this.earlyMiningActions(miner);
            case 'standard':
                return this.standardMiningAction(miner);
            case 'link':
                return this.linkMiningActions(miner);
            case 'double':
                return this.standardMiningAction(miner);
            default:
                log.error(`UNHANDLED MINER STATE FOR ${miner.print} (MODE: ${this.mode})`)
        }
    }

    private addRemoveContainer(): void {
        if(this.allowDropMining) {
            return;
        }

        if(!this.container && !this.constructionSite && !this.link){
            const containerPos = this.calculateContainerPos();
            const container = containerPos.lookForStructure(STRUCTURE_CONTAINER) as StructureContainer | undefined;
            if(container) {
                log.warning(`${this.print}: this.container out of sync at ${containerPos.print}`);
                this.container = container;
                return;
            }
            log.info(`${this.print}: building container at ${containerPos.print}`);
            const result = containerPos.createConstructionSite(STRUCTURE_CONTAINER);
            if(result != OK){
                log.error(`${this.print}: Cannont build container at ${containerPos.print}`);
            }
            return;
        }

        if(this.container && this.link) {
            if(this.base.handOfNod && this.container.pos.getRangeTo(this.base.handOfNod) > 2
            ) {
                this.container.destroy()
            }
        }
    }
    private suicideOldMiners(): boolean {
        if(this.miners.length > this.minersNeeded && this.source){
            const targetPos = this.harvestPos || this.source.pos;
            const minersNearSource = _.filter(this.miners, miner => miner.pos.getRangeTo(targetPos) <= SUICIDE_CHECK_FREQUENCY);
            if (minersNearSource.length > this.minersNeeded){
                const oldestMiner = minBy(minersNearSource, miner => miner.ticksToLive || 9999);
                if(oldestMiner && (oldestMiner.ticksToLive || 9999) < MINER_SUICIDE_THRESHOLD) {
                    oldestMiner.suicide();
                    return true;
                }
            }
        }
        return false;
    }

    private standardMiningAction(miner: Unit) {
        if(this.goToMiningSite(miner)) return;
        if(this.container) {
            if(this.container.hits < this.container.hitsMax
            && miner.carry.energy >= Math.min(miner.carryCapacity, REPAIR_POWER * miner.getActiveBodyparts(WORK))){
                    return miner.repair(this.container);
            } else {
                    return miner.harvest(this.source!);
            }
        }

        if(this.constructionSite){
            if(miner.carry.energy >= Math.min(miner.carryCapacity, BUILD_POWER * miner.getActiveBodyparts(WORK))){
                return miner.build(this.constructionSite);
            } else {
                return miner.harvest(this.source!);
            }
        }

        if(this.allowDropMining) {
            miner.harvest(this.source!)
            if(miner.carry.energy > .8 * miner.carryCapacity){
                const drop = maxBy(miner.pos.findInRange(miner.room.droppedEnergy, 1), drop => drop.amount);
                if(drop) {
                    miner.goTo(drop);
                }
            }
            if (miner.carry.energy == miner.carryCapacity){
                miner.drop(RESOURCE_ENERGY);
            }
            return;
        }
    }
    	/**
	 * Actions for handling link mining
	 */
	private linkMiningActions(miner: Unit) {

		// Approach mining site
		if (this.goToMiningSite(miner)) return;

		// Link mining
		if (this.link) {
			miner.harvest(this.source!);
			if (miner.carry.energy > 0.9 * miner.carryCapacity) {
				miner.transfer(this.link, RESOURCE_ENERGY);
			}
			return;
		} else {
			log.warning(`Link miner ${miner.print} has no link!`);
		}
	}

    private goToMiningSite(miner: Unit): boolean {
        if(this.harvestPos){
            if(!miner.pos.inRangeToPos(this.harvestPos, 0)){
                miner.goTo(this.harvestPos);
                return true;
            }
        } else {
            if(!miner.pos.inRangeToPos(this.pos, 1)) {
                miner.goTo(this);
                return true;
            }
        }
        return false;
    }

    private registerEnergyRequest(){
        if (this.container) {
			const transportCapacity = 200 * this.base.level;
			const threshold = this.base.stage > BaseStage.MCV ? 0.8 : 0.5;
			if (_.sum(this.container.store) > threshold * transportCapacity) {
				this.base.logisticsNetwork.requestOutput(this.container, {
					resourceType: 'all',
					dAmountdt   : this.energyPerTick
				});
			}
		}
		if (this.link) {
			// If the link will be full with next deposit from the miner
			const minerCapacity = 150;
			if (this.link.energy + minerCapacity > this.link.energyCapacity) {
				this.base.linkNetwork.requestTransmit(this.link);
			}
		}
    }

    private populateStructures() {
        if(Game.rooms[this.pos.roomName]){
            this.source = _.first(this.pos.lookFor(LOOK_SOURCES));
            this.constructionSite = _.first(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2));
            this.container = this.pos.findClosestByLimitedRange(Game.rooms[this.pos.roomName].containers, 1);
            this.link = this.pos.findClosestByLimitedRange(this.base.availableLinks,2);
        }
    }
    calculateContainerPos(): RoomPosition {
        let originPos: RoomPosition | undefined;
        if(this.base.storage){
            originPos = this.base.storage.pos;
        } else  {
            originPos = this.base.spawns[0].pos;
        }
        if(originPos){
            const path = Pathing.findShortestPath(this.pos, originPos).path;
            const pos = _.find(path, pos => pos.getRangeTo(this) == 1);
            if(pos) return pos;
        }
        return _.first(this.pos.availableNeighbors(true));
    }

    refresh(){
        if (!this.room && Game.rooms[this.pos.roomName]){
            this.populateStructures();
        }

        super.refresh();
        $.refresh(this, 'source', 'container', 'link', 'constructionSite');
    }

    private earlyMiningActions(miner: Unit){
        if (miner.room != this.room){
            return miner.goToRoom(this.pos.roomName);
        }

        if(this.container) {
            if(this.container.hits < this.container.hitsMax && miner.carry.energy >= Math.min(miner.carryCapacity, REPAIR_POWER * miner.getActiveBodyparts(WORK))){
                return miner.goRepair(this.container);
            } else {
                if(_.sum(miner.carry) < miner.carryCapacity) {
                    return miner.goHarvest(this.source!);
                } else {
                    return miner.goTransfer(this.container);
                }
            }
        }

        		// Build output site
		if (this.constructionSite) {
			if (miner.carry.energy >= Math.min(miner.carryCapacity, BUILD_POWER * miner.getActiveBodyparts(WORK))) {
				return miner.goBuild(this.constructionSite);
			} else {
				return miner.goHarvest(this.source!);
			}
		}

		// Drop mining
		if (this.allowDropMining) {
			miner.goHarvest(this.source!);
			if (miner.carry.energy > 0.8 * miner.carryCapacity) { // try to drop on top of largest drop if full
				const biggestDrop = maxBy(miner.pos.findInRange(miner.room.droppedEnergy, 1), drop => drop.amount);
				if (biggestDrop) {
					miner.goDrop(biggestDrop.pos, RESOURCE_ENERGY);
				}
			}
			return;
		}
    }
}
