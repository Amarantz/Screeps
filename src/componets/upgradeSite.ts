import { Component } from "./_componet";
import { $ } from '../caching/GlobalCache';
import { Base, BasesStage } from "Base";
import Mem from "memory/memory";
import { hasMinerals } from '../utils/utils';
import { log } from "console/log";
import { SSL_OP_NETSCAPE_DEMO_CIPHER_CHANGE_BUG } from "constants";
import { Stats } from "fs";

interface UpgradeSiteMemory {
    stats: {downtime:number};
}

export class UpgradeSite extends Component {
    controller: StructureController;
    memory: UpgradeSiteMemory;
    battery: StructureContainer | undefined;
    batteryPos: RoomPosition | undefined;
    commander: undefined;
    upgradePowerNeeded: number;
    link: StructureLink | undefined;
    static settings = {
        energyBuffer: 100000,
        energyPerBodyUnit: 10000,
        minLinkDistance: 10,
        linksRequestBelow: 200,
    }
    constructor(base: Base, controller: StructureController){
        super(base, controller, 'upgradeSite');
        this.controller = controller;
        this.memory = Mem.wrap(this.base.memory, 'upgradeSite');
        this.upgradePowerNeeded = this.getUpgradePowerNeeded();
        //@ts-ignore
        $.set(this, 'battery', () => {
            const allowableContainers = _.filter(this.room.containers, container => container.pos.findInRange(FIND_SOURCES, 1).length == 0);
            return this.pos.findClosestByLimitedRange(allowableContainers, 3);
        });
        this.batteryPos = $.pos(this, 'batteryPos', () => {
            if(this.battery) {
                return this.battery.pos;
            }
            const inputSite = this.findInputConstructionSite();
            if(inputSite){
                return inputSite.pos;
            }
            return this.calculateBatteryPos() || log.alert(`Upgrade site at ${this.pos.print}: no BatteryPos!`);
        });
        if(this.batteryPos) this.base.destinations.push({pos: this.batteryPos, order: 0});
        $.set(this, 'link', () =>  this.pos.findClosestByLimitedRange(base.avaliableLinks, 3));
        // this.base.linkNetwork.claimLInk(this.link);
        this.stats();
    }
    refresh(): void {
        this.memory = Mem.wrap(this.base.memory, 'upgradeSite');
        $.refreshRoom(this);
        //@ts-ignore
        $.refresh(this, 'controller', 'batter', 'link');
    }
    spawnCommander(): void {
        throw new Error("Method not implemented.");
    }

    findInputConstructionSite(): ConstructionSite | undefined {
        const nearbyInputSites = this.pos.findInRange(this.room.constructionSites, 4, {
            filter: (s:ConstructionSite) => s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_LINK
        })
        return _.first(nearbyInputSites);
    }
    init(): void {
        const inThreshold = this.base.stage > BasesStage.MCV ? 0.5 : 0.75;
        if(this.battery) {
            if(this.battery.store.getUsedCapacity() < inThreshold * this.battery.store.getCapacity()){
                const energyPerTick = UPGRADE_CONTROLLER_POWER * this.upgradePowerNeeded;
                // this.base.logisticsNetwork.requestInput(this.battery, {});
            }
            if(hasMinerals(this.battery.store)){
                // this.base.logsiticsNetwork.requestOutputMinerals(this.batter);
            }
        }
    }
    run(): void {
        if(Game.time % 25 == 7 && this.base.level >= 2){
            this.buildBatteryIfMissing();
        }
    }

    private getUpgradePowerNeeded():number {
        return $.number(this, 'upgradePowerNeeded', () => {
            if(this.room.storage) {
                const amountOver = Math.max(this.base.assets.energe - UpgradeSite.settings.energyBuffer, 0);
                let upgradePower = 1 + Math.floor(amountOver / UpgradeSite.settings.energyPerBodyUnit);
                if(amountOver > 800000){
                    upgradePower *= 4;
                } else if (amountOver > 500000) {
                    upgradePower *= 2;
                }
                if(this.controller.level == 8){
                    upgradePower = Math.min(upgradePower, 15);
                }
                return upgradePower;
            } else {
                return 0;
            }
        })
    }

    private calculateBatteryPos(): RoomPosition | undefined {
        let originPos: RoomPosition | undefined;
        if(this.base.storage) {
            originPos = this.base.storage.pos;
        //@ts-ignore
        } else if (this.base.roomPlanner && this.base.roomPlanner.storagePos){
            //@ts-ignore
            originPos = this.base.roomPlanner.storagePos;
        } else {
            return
        }
        let inputLocations: RoomPosition[] = [];
        for(const pos of this.pos.getPositionsAtRange(2)){
            if(pos.isWalkable(true)){
                inputLocations = [...inputLocations, pos]
            }
        }

        const maxNeighors = _.max(_.map(inputLocations, pos => pos.availableNeighbors(true).length));
        inputLocations = _.filter(inputLocations, pos => pos.availableNeighbors(true).length >= maxNeighors);
        const inputPos = originPos && originPos.findClosestByPath(inputLocations);
        if(inputPos) {
            return inputPos;
        }
        return undefined;
    }

    private buildBatteryIfMissing(): void {
        if(!this.battery && !this.findInputConstructionSite()){
            const buildHere = this.batteryPos;
            if(buildHere) {
                const result = buildHere.createConstructionSite(STRUCTURE_CONTAINER);
                if(result == OK){
                    return;
                } else {
                    log.warning(`Upgrade site at ${this.pos.print}: cannot build battery! Result: ${result}`);
                }
            }
        }
    }

    private stats() {
        const defaults = {
            downtime: 0,
        }

        if(!this.memory.stats) this.memory.stats = defaults;
        _.defaults(this.memory.stats, defaults);

        this.memory.stats.downtime = (this.memory.stats.downtime * (CREEP_LIFE_TIME - 1) + (this.battery ? +this.battery.isEmpty : 0)) / CREEP_LIFE_TIME;
        // Stats.log(`bases.${this.base.name}.upgradeSite.downtime`, this.memory.stats.downtime);
    }
}
