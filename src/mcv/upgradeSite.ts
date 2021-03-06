import Stats from "../stats/stats";
import { MCV } from "./mcv";
import { UpgradingCommander } from "../commander/core/upgrader";
import { Base, BaseStage } from "../Base";
import Mem from "memory/memory";
import { $ } from "../caching/GlobalCache";
import { hasMinerals } from "../utils/utils";
import { log } from "../console/log";
import { Visualizer } from "../Visualizer";


interface UpgradeSiteMemory {
	stats: { downtime: number };
}

export default class UpgradeSite extends MCV {

	memory: UpgradeSiteMemory;
	controller: StructureController;						// The controller for the site
	upgradePowerNeeded: number;
	link: StructureLink | undefined;						// The primary object receiving energy for the site
	battery: StructureContainer | undefined; 				// The container to provide an energy buffer
	batteryPos: RoomPosition | undefined;
	commander: UpgradingCommander;
	// energyPerTick: number;

	static settings = {
		energyBuffer     : 100000,	// Number of upgrader parts scales with energy - this value
		energyPerBodyUnit: 10000,	// Scaling factor: this much excess energy adds one extra body repetition
		minLinkDistance  : 10,		// Required distance to build link
		linksRequestBelow: 200,		// Links request energy when less than this amount
	};

	constructor(base: Base, controller: StructureController) {
		super(base, controller, 'upgradeSite');
		this.controller = controller;
		this.memory = Mem.wrap(this.base.memory, 'upgradeSite');
		this.upgradePowerNeeded = this.getUpgradePowerNeeded();
		// Register bettery
		$.set(this, 'battery', () => {
			const allowableContainers = _.filter(this.room.containers, container =>
				container.pos.findInRange(FIND_SOURCES, 1).length == 0); // only count containers that aren't near sources
			return this.pos.findClosestByLimitedRange(allowableContainers, 3);
		});
		this.batteryPos = $.pos(this, 'batteryPos', () => {
			if (this.battery) {
				return this.battery.pos;
			}
			const inputSite = this.findInputConstructionSite();
			if (inputSite) {
				return inputSite.pos;
			}
			return this.calculateBatteryPos() || log.alert(`Upgrade site at ${this.pos.print}: no batteryPos!`);
		});
		if (this.batteryPos) this.base.destinations.push({pos: this.batteryPos, order: 0});
		// Register link
		$.set(this, 'link', () => this.pos.findClosestByLimitedRange(base.availableLinks, 3));
		this.base.linkNetwork.claimLink(this.link);
		// Energy per tick is sum of upgrader body parts and nearby worker body parts
		// this.energyPerTick = $.number(this, 'energyPerTick', () =>
		// 	_.sum(this.commander.upgraders, upgrader => upgrader.getActiveBodyparts(WORK)) +
		// 	_.sum(_.filter(this.base.getCreepsByRole(WorkerSetup.role), worker =>
		// 			  worker.pos.inRangeTo((this.link || this.battery || this).pos, 2)),
		// 		  worker => worker.getActiveBodyparts(WORK)));
		// Compute stats
		this.stats();
	}

	refresh() {
		this.memory = Mem.wrap(this.base.memory, 'upgradeSite');
		$.refreshRoom(this);
		$.refresh(this, 'controller', 'battery', 'link');
	}

	spawnMoreCommanders() {
		// Register overlord
		this.commander = new UpgradingCommander(this);
	}

	findInputConstructionSite(): ConstructionSite | undefined {
		const nearbyInputSites = this.pos.findInRange(this.room.constructionSites, 4, {
			filter: (s: ConstructionSite) => s.structureType == STRUCTURE_CONTAINER ||
											 s.structureType == STRUCTURE_LINK,
		});
		return _.first(nearbyInputSites);
	}

	private getUpgradePowerNeeded(): number {
		return $.number(this, 'upgradePowerNeeded', () => {
			if (this.room.storage) { // Workers perform upgrading until storage is set up
				const amountOver = Math.max(this.base.assets.energy - UpgradeSite.settings.energyBuffer, 0);
				let upgradePower = 1 + Math.floor(amountOver / UpgradeSite.settings.energyPerBodyUnit);
				if (amountOver > 800000) {
					upgradePower *= 4; // double upgrade power if we have lots of surplus energy
				} else if (amountOver > 500000) {
					upgradePower *= 2;
				}
				if (this.controller.level == 8) {
					upgradePower = Math.min(upgradePower, 15); // don't go above 15 work parts at RCL 8
				}
				return upgradePower;
			} else {
				return 0;
			}
		});
	}

	init(): void {
		// Register energy requests
		if (this.link && this.link.energy < UpgradeSite.settings.linksRequestBelow) {
			this.base.linkNetwork.requestReceive(this.link);
		}
		const inThreshold = this.base.stage > BaseStage.MCV ? 0.5 : 0.75;
		if (this.battery) {
			if (this.battery.energy < inThreshold * this.battery.storeCapacity) {
				const energyPerTick = UPGRADE_CONTROLLER_POWER * this.upgradePowerNeeded;
				this.base.logisticsNetwork.requestInput(this.battery, {dAmountdt: energyPerTick});
			}
			if (hasMinerals(this.battery.store)) { // get rid of any minerals in the container if present
				this.base.logisticsNetwork.requestOutputMinerals(this.battery);
			}
		}
	}

	/* Calculate where the input will be built for this site */
	private calculateBatteryPos(): RoomPosition | undefined {
		let originPos: RoomPosition | undefined;
		if (this.base.storage) {
			originPos = this.base.storage.pos;
		} else if (this.base.roomPlanner.storagePos) {
			originPos = this.base.roomPlanner.storagePos;
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
		const inputPos = originPos!.findClosestByPath(inputLocations);
		if (inputPos) {
			return inputPos;
		}
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

	private stats() {
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

	run(): void {
		if (Game.time % 25 == 7 && this.base.level >= 2) {
			this.buildBatteryIfMissing();
        }
	}

	visuals() {
		// let info = [];
		// if (this.controller.level != 8) {
		// 	let progress = `${Math.floor(this.controller.progress / 1000)}K`;
		// 	let progressTotal = `${Math.floor(this.controller.progressTotal / 1000)}K`;
		// 	let percent = `${Math.floor(100 * this.controller.progress / this.controller.progressTotal)}`;
		// 	info.push(`Progress: ${progress}/${progressTotal} (${percent}%)`);

		// }
		// info.push(`Downtime: ${this.memory.stats.downtime.toPercent()}`);
		// Visualizer.showInfo(info, this);
	}
}
