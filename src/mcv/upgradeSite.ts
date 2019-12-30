import MCV from "./mcv";
import Base from "Base";
import Mem from "memory/memory";
import $ from "caching/GlobalCache";
import { log } from "../console/log";
import { UpgradingCommander } from "commander/core/upgrader";
import Stats from "stats/stats";

interface UpgradeSiteMemory {
    stats: { downtime: number };
}

export default class UpgradeSite extends MCV {
    memory: UpgradeSiteMemory;
    controller: StructureController;
    upgradePowerNeeded: number;
    link: StructureLink | undefined;
    battery: StructureContainer | undefined;
    batteryPos: RoomPosition | undefined;
    commander: UpgradingCommander;

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
        $.set(this, 'battery', () => {
            const allowableContainers = _.filter(this.room.containers, container => {
                container.pos.findInRange(FIND_SOURCES, 1).length == 0
            });
            return this.pos.findClosestByLimitedRange(allowableContainers, 3);
        });
        this.batteryPos = $.pos(this, 'batteryPos', () => {
            if(this.battery){
                return this.battery.pos;
            };
            const inputSite = this.findInputConstructionSite();
            if(inputSite){
                return inputSite.pos;
            }
            return this.calculateBatteryPos() || log.alert(`Upgrade site at ${this.pos.print}: no BatteryPos`);
        });
        if(this.batteryPos) this.base.destinations.push({pos: this.batteryPos, order: 0});
        $.set(this, 'link', () => this.pos.findClosestByLimitedRange(base.availableLinks, 3));
        this.stats();
    }

    refresh(): void {
        this.memory = Mem.wrap(this.base.memory, 'upgradeSite');
        $.refreshRoom(this);
        $.refresh(this, 'controller', 'battery', 'link');
    }

    findInputConstructionSite(): ConstructionSite | undefined {
        const nearbyInputSites = this.pos.findInRange(this.room.constructionSites,4, {
            filter: (s: ConstructionSite) => s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_LINK
        });
        return _.first(nearbyInputSites);
    }

    private getUpgradePowerNeeded(): number {
        return $.number(this, 'upgradePowerNeeded', () => {
            if(this.room.storage){
                const amountOver = Math.max(this.base.assets.energy - UpgradeSite.settings.energyBuffer, 0);
                let upgradePower = 1 + Math.floor(amountOver / UpgradeSite.settings.energyPerBodyUnit);
                if(amountOver > 800000) {
                    upgradePower *= 4;
                } else if (amountOver > 500000){
                    upgradePower *= 2;
                }
                if(this.controller.level == 8){
                    upgradePower = Math.min(upgradePower, 15);
                }
                return upgradePower;
            } else {
                return 0
            }
        });
    }
    spawnMoreCommanders(): void {
        this.commander = new UpgradingCommander(this);
    }
    init(): void {
        
    }
    run(): void {
        if (Game.time % 25 == 7 && this.base.level >= 2) {
			this.buildBatteryIfMissing();
		}
    }

    private calculateBatteryPos(): any {
        let originPos: RoomPosition | undefined;
		if (this.base.storage) {
			originPos = this.base.storage.pos;
		// } else if (this.base.roomPlanner.storagePos) {
		// 	originPos = this.base.roomPlanner.storagePos;
		} else {
			return;
		}
		// Find all positions at range 2 from controller
		let inputLocations: RoomPosition[] = [];
		for (const pos of this.pos.getPositionsAtRange(2)) {
			if (pos.isWalkable(true)) {
				inputLocations.push(pos);
			}
		}
		// Try to find locations where there is maximal standing room
		const maxNeighbors = _.max(_.map(inputLocations, pos => pos.availableNeighbors(true).length));
		inputLocations = _.filter(inputLocations,
								  pos => pos.availableNeighbors(true).length >= maxNeighbors);
		// Return location closest to storage by path
		const inputPos = originPos.findClosestByPath(inputLocations);
		if (inputPos) {
			return inputPos;
		}
    }
    private stats(): any {
        const defaults = {
			downtime: 0,
		};
		if (!this.memory.stats) this.memory.stats = defaults;
		_.defaults(this.memory.stats, defaults);
		// Compute downtime
		this.memory.stats.downtime = (this.memory.stats.downtime * (CREEP_LIFE_TIME - 1) +
									  (this.battery ? +this.battery.isEmpty : 0)) / CREEP_LIFE_TIME;
		Stats.log(`colonies.${this.base.name}.upgradeSite.downtime`, this.memory.stats.downtime);
    }

    	/* Build a container output at the optimal location */
	private buildBatteryIfMissing(): void {
		if (!this.battery && !this.findInputConstructionSite()) {
			const buildHere = this.batteryPos;
			if (buildHere) {
				const result = buildHere.createConstructionSite(STRUCTURE_CONTAINER);
				if (result == OK) {
					return;
				} else {
					log.warning(`Upgrade site at ${this.pos.print}: cannot build battery! Result: ${result}`);
				}
			}
		}
	}
}
