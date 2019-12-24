import {Base, BasesStage} from './Base';
import {log} from './console/log';
import {bodyCost} from './creeps/setups/CreepSetups';
import {Roles} from './creeps/setups/setups';
import {DirectiveClearRoom} from './directives/colony/clearRoom';
import {DirectiveColonize} from './directives/colony/colonize';
import {DirectiveOutpost} from './directives/colony/outpost';
import {DirectiveGuard} from './directives/defense/guard';
import {DirectiveInvasionDefense} from './directives/defense/invasionDefense';
import {DirectiveOutpostDefense} from './directives/defense/outpostDefense';
import {Directive} from './directives/Directive';
import {Notifier} from './directives/Notifier';
import {DirectiveBootstrap} from './directives/situational/bootstrap';
import {DirectiveNukeResponse} from './directives/situational/nukeResponse';
import {DirectiveTerminalEvacuateState} from './directives/terminalState/terminalState_evacuate';
import {RoomIntel} from './intel/RoomIntel';
import {LogisticsNetwork} from './logistics/LogisticsNetwork';
import Mem from './memory/Memory';
import {Pathing} from './movement/Pathing';
import {Commander} from './commander/Commander';
import {CombatPlanner} from './strategy/CombatPlanner';
import {Cartographer, ROOMTYPE_CONTROLLER, ROOMTYPE_SOURCEKEEPER} from './utils/Cartographer';
import {derefCoords, hasJustSpawned, minBy, onPublicsServer} from './utils/utils';
import {USE_TRY_CATCH} from './~settings';


// export const DIRECTIVE_CHECK_FREQUENCY = 2;

interface OverseerMemory {
	suspendUntil: { [overlordRef: string]: number }; // overlords are suspended until tick
}

const defaultOverseerMemory: OverseerMemory = {
	suspendUntil: {},
};

/**
 * The Overseer object acts as a scheduler, running directives and overlords for all colonies each tick. It is also
 * in charge of starting new "processes" (directives) to respond to various situations.
 */
export class General implements IGeneral {

	private memory: OverseerMemory;
	private commanders: Commander[];								// Overlords sorted by priority
	private sorted: boolean;
	private commandersByBase: { [base: string]: Commander[] };	// Overlords grouped by colony
	private directives: Directive[];							// Directives across the colony

	combatPlanner: CombatPlanner;
	notifier: Notifier;

	static settings = {
		outpostCheckFrequency: onPublicsServer() ? 250 : 100
	};

	constructor() {
		this.memory = Mem.wrap(Memory, 'overseer', defaultOverseerMemory);
		this.directives = [];
		this.commanders = [];
		this.commandersByBase = {};
		this.sorted = false;
		this.notifier = new Notifier();
		this.combatPlanner = new CombatPlanner();
	}

	refresh() {
		this.memory = Mem.wrap(Memory, 'overseer', defaultOverseerMemory);
		this.notifier.clear();
	}

	private try(callback: () => any, identifier?: string): void {
		if (USE_TRY_CATCH) {
			try {
				callback();
			} catch (e) {
				if (identifier) {
					e.name = `Caught unhandled exception at ${'' + callback} (identifier: ${identifier}): \n`
							 + e.name + '\n' + e.stack;
				} else {
					e.name = `Caught unhandled exception at ${'' + callback}: \n` + e.name + '\n' + e.stack;
				}
				global.Cobal.exceptions.push(e);
			}
		} else {
			callback();
		}
	}

	private get bases(): Base[] {
		return _.values(global.Cobal.bases);
	}

	registerDirective(directive: Directive): void {
		this.directives.push(directive);
	}

	removeDirective(directive: Directive): void {
		_.remove(this.directives, dir => dir.name == directive.name);
		for (const name in directive.commanders) {
			this.removeCommander(directive.commanders[name]);
		}
	}

	registerCommander(commander: Commander): void {
		this.commanders.push(commander);
		if (!this.commandersByBase[commander.base.name]) {
			this.commandersByBase[commander.base.name] = [];
		}
		this.commandersByBase[commander.base.name].push(commander);
	}

	getCommandersForBase(base: Base): Commander[] {
		return this.commandersByBase[base.name];
	}

	private removeCommander(commander: Commander): void {
		_.remove(this.commanders, o => o.ref == commander.ref);
		if (this.commandersByBase[commander.base.name]) {
			_.remove(this.commandersByBase[commander.base.name], o => o.ref == commander.ref);
		}
	}

	isCommanderSuspended(commander: Commander): boolean {
		if (this.memory.suspendUntil[commander.ref]) {
			if (Game.time < this.memory.suspendUntil[commander.ref]) {
				return true;
			} else {
				delete this.memory.suspendUntil[commander.ref];
				return false;
			}
		}
		return false;
	}

	suspendCommanderFor(commander: Commander, ticks: number): void {
		this.memory.suspendUntil[commander.ref] = Game.time + ticks;
	}

	suspendCommanderUntil(commander: Commander, untilTick: number): void {
		this.memory.suspendUntil[commander.ref] = untilTick;
	}

	private registerLogisticsRequests(base: Base): void {
		// Register logistics requests for all dropped resources and tombstones
		for (const room of base.rooms) {
			// Pick up all nontrivial dropped resources
			for (const resourceType in room.drops) {
				for (const drop of room.drops[resourceType]) {
					if (drop.amount > LogisticsNetwork.settings.droppedEnergyThreshold
						|| drop.resourceType != RESOURCE_ENERGY) {
                            base.logisticsNetwork.requestOutput(drop);
					}
				}
			}
		}
		// Place a logistics request directive for every tombstone with non-empty store that isn't on a container
		for (const tombstone of base.tombstones) {
			if (_.sum(tombstone.store) > LogisticsNetwork.settings.droppedEnergyThreshold
				|| _.sum(tombstone.store) > tombstone.store.energy) {
				if (base.bunker && tombstone.pos.isEqualTo(base.bunker.anchor)) continue;
				base.logisticsNetwork.requestOutput(tombstone, {resourceType: 'all'});
			}
		}
	}

	private handleBootstrapping(base: Base) {
		// Bootstrap directive: in the event of catastrophic room crash, enter emergency spawn mode.
		// Doesn't apply to incubating colonies.
		if (!base.isIncubating) {
			const noQueen = base.getCreepsByRole(Roles.queen).length == 0;
			if (noQueen && base.handOfNod && !base.spawnGroup) {
				const setup = base.handOfNod.commander.queenSetup;
				const energyToMakeQueen = bodyCost(setup.generateBody(base.room.energyCapacityAvailable));
				if (base.room.energyAvailable < energyToMakeQueen || hasJustSpawned()) {
					const result = DirectiveBootstrap.createIfNotPresent(base.handOfNod.pos, 'pos');
					if (typeof result == 'string' || result == OK) { // successfully made flag
						base.handOfNod.settings.suppressSpawning = true;
					}
				}
			}
		}
	}

	private handleOutpostDefense(base: Base) {
		// Guard directive: defend your outposts and all rooms of colonies that you are incubating
		for (const room of base.outposts) {
			// Handle player defense
			if (room.dangerousPlayerHostiles.length > 0) {
				DirectiveOutpostDefense.createIfNotPresent(Pathing.findPathablePosition(room.name), 'room');
				return;
			}
			// Handle NPC invasion directives
			if (Cartographer.roomType(room.name) != ROOMTYPE_SOURCEKEEPER) { // SK rooms can fend for themselves
				const defenseFlags = _.filter(room.flags, flag => DirectiveGuard.filter(flag) ||
																  DirectiveOutpostDefense.filter(flag));
				if (room.dangerousHostiles.length > 0 && defenseFlags.length == 0) {
					DirectiveGuard.create(room.dangerousHostiles[0].pos);
				}
			}
		}
	}

	private handleBaseInvasions(base: Base) {
		// Defend against invasions in owned rooms
		if (base.room) {

			// See if invasion is big enough to warrant creep defenses
			const effectiveInvaderCount = _.sum(_.map(base.room.hostiles,
													invader => invader.boosts.length > 0 ? 2 : 1));
			const needsDefending = effectiveInvaderCount >= 3 || base.room.dangerousPlayerHostiles.length > 0;

			if (needsDefending) {
				// Place defensive directive after hostiles have been present for a long enough time
				const safetyData = RoomIntel.getSafetyData(base.room.name);
				const invasionIsPersistent = safetyData.unsafeFor > 20;
				if (invasionIsPersistent) {
					DirectiveInvasionDefense.createIfNotPresent(base.controller.pos, 'room');
				}
			}
		}
	}

	private handleNukeResponse(base: Base) {
		// Place nuke response directive if there is a nuke present in colony room
		if (base.room && base.level >= DirectiveNukeResponse.requiredRCL) {
			for (const nuke of base.room.find(FIND_NUKES)) {
				DirectiveNukeResponse.createIfNotPresent(nuke.pos, 'pos');
			}
		}
	}

	private computePossibleOutposts(base: Base, depth = 3): string[] {
		return _.filter(Cartographer.findRoomsInRange(base.room.name, depth), roomName => {
			if (Cartographer.roomType(roomName) != ROOMTYPE_CONTROLLER) {
				return false;
			}
			const alreadyAnOutpost = _.any(global.Cobal.cache.outpostFlags,
										 flag => (flag.memory.setPosition || flag.pos).roomName == roomName);
			const alreadyAColony = !!global.Cobal.bases[roomName];
			if (alreadyAColony || alreadyAnOutpost) {
				return false;
			}
			const alreadyOwned = RoomIntel.roomOwnedBy(roomName);
			const alreadyReserved = RoomIntel.roomReservedBy(roomName);
			const disregardReservations = !onPublicsServer();
			if (alreadyOwned || (alreadyReserved && !disregardReservations)) {
				return false;
			}
			const neighboringRooms = _.values(Game.map.describeExits(roomName)) as string[];
			const isReachableFromColony = _.any(neighboringRooms, r => base.roomNames.includes(r));
			return isReachableFromColony && Game.map.isRoomAvailable(roomName);
		});
	}

	private handleNewOutposts(base: Base) {
		const numSources = _.sum(base.roomNames,
							   roomName => Memory.rooms[roomName] && Memory.rooms[roomName][_RM.SOURCES]
										   ? Memory.rooms[roomName][_RM.SOURCES]!.length
										   : 0);
		const numRemotes = numSources - base.room.sources.length;
		if (numRemotes < Base.settings.remoteSourcesByLevel[base.level]) {

			const possibleOutposts = this.computePossibleOutposts(base);

			const origin = base.pos;
			const bestOutpost = minBy(possibleOutposts, function(roomName) {
				if (!Memory.rooms[roomName]) return false;
				const sourceCoords = Memory.rooms[roomName][_RM.SOURCES] as SavedSource[] | undefined;
				if (!sourceCoords) return false;
				const sourcePositions = _.map(sourceCoords, src => derefCoords(src.c, roomName));
				const sourceDistances = _.map(sourcePositions, pos => Pathing.distance(origin, pos));
				if (_.any(sourceDistances, dist => dist == undefined || dist > Base.settings.maxSourceDistance)) {
					return false;
				}
				return _.sum(sourceDistances) / sourceDistances.length;
			});

			if (bestOutpost) {
				const pos = Pathing.findPathablePosition(bestOutpost);
				log.info(`Colony ${base.room.print} now remote mining from ${pos.print}`);
				DirectiveOutpost.createIfNotPresent(pos, 'room', {memory: {[_MEM.BASE]: base.name}});
			}
		}
	}

	/* Place new event-driven flags where needed to be instantiated on the next tick */
	private placeDirectives(base: Base): void {
		this.handleBootstrapping(base);
		this.handleOutpostDefense(base);
		this.handleBaseInvasions(base);
		this.handleNukeResponse(base);
		if (true) {
			if (Game.time % General.settings.outpostCheckFrequency == 2 * base.id) {
				this.handleNewOutposts(base);
			}
			// Place pioneer directives in case the colony doesn't have a spawn for some reason
			if (Game.time % 25 == 0 && base.spawns.length == 0 &&
				!DirectiveClearRoom.isPresent(base.pos, 'room')) {
				// verify that there are no spawns (not just a caching glitch)
				const spawns = Game.rooms[base.name]!.find(FIND_MY_SPAWNS);
				if (spawns.length == 0) {
					const pos = Pathing.findPathablePosition(base.room.name);
					DirectiveColonize.createIfNotPresent(pos, 'room');
				}
			}
		}
	}


	// Safe mode condition =============================================================================================

	private handleSafeMode(base: Base): void {
		if (base.stage == BasesStage.MCV && onPublicsServer()) {
			return;
		}
		// Safe mode activates when there are dangerous player hostiles that can reach the spawn
		const criticalStructures = _.compact([...base.spawns,
            base.storage,
            base.terminal]) as Structure[];
		for (const structure of criticalStructures) {
			if (structure.hits < structure.hitsMax &&
				structure.pos.findInRange(base.room.dangerousPlayerHostiles, 2).length > 0) {
				const ret = base.controller.activateSafeMode();
				if (ret != OK && !base.controller.safeMode) {
					if (base.terminal) {
						DirectiveTerminalEvacuateState.createIfNotPresent(base.terminal.pos, 'room');
					}
				} else {
					return;
				}
			}
		}
		const firstHostile = _.first(base.room.dangerousPlayerHostiles);
		if (firstHostile && base.spawns[0]) {
			const barriers = _.map(base.room.barriers, barrier => barrier.pos);
			if (Pathing.isReachable(firstHostile.pos, base.spawns[0].pos, barriers)) {
				const ret = base.controller.activateSafeMode();
				if (ret != OK && !base.controller.safeMode) {
					if (base.terminal) {
						DirectiveTerminalEvacuateState.createIfNotPresent(base.terminal.pos, 'room');
					}
				} else {
					return;
				}
			}
		}
	}

	// Initialization ==================================================================================================

	init(): void {
		// Initialize directives
		for (const directive of this.directives) {
			directive.init();
		}
		// Sort overlords by priority if needed (assumes priority does not change after constructor phase
		if (!this.sorted) {
			this.commanders.sort((o1, o2) => o1.priority - o2.priority);
			for (const colName in this.commandersByBase) {
				this.commandersByBase[colName].sort((o1, o2) => o1.priority - o2.priority);
			}
			this.sorted = true;
		}
		// Initialize overlords
		for (const commander of this.commanders) {
			if (!this.isCommanderSuspended(commander)) {
				commander.preInit();
				this.try(() => commander.init());
			}
		}
		// Register cleanup requests to logistics network
		for (const base of this.bases) {
			this.registerLogisticsRequests(base);
		}
	}

	// Operation =======================================================================================================

	run(): void {
		for (const directive of this.directives) {
			directive.run();
		}
		for (const commander of this.commanders) {
			if (!this.isCommanderSuspended(commander)) {
				this.try(() => commander.run());
			}
		}
		for (const base of this.bases) {
			this.handleSafeMode(base);
			this.placeDirectives(base);
		}
	}

	getCreepReport(base: Base): string[][] {
		const spoopyBugFix = false;
		const roleOccupancy: { [role: string]: [number, number] } = {};

		for (const overlord of this.commandersByBase[base.name]) {
			for (const role in overlord.creepUsageReport) {
				const report = overlord.creepUsageReport[role];
				if (report == undefined) {
					if (Game.time % 100 == 0) {
						log.info(`Role ${role} is not reported by ${overlord.ref}!`);
					}
				} else {
					if (roleOccupancy[role] == undefined) {
						roleOccupancy[role] = [0, 0];
					}
					roleOccupancy[role][0] += report[0];
					roleOccupancy[role][1] += report[1];
					if (spoopyBugFix) { // bizzarely, if you comment these lines out, the creep report is incorrect
						log.debug(`report: ${JSON.stringify(report)}`);
						log.debug(`occupancy: ${JSON.stringify(roleOccupancy)}`);
					}
				}
			}
		}


		// let padLength = _.max(_.map(_.keys(roleOccupancy), str => str.length)) + 2;
		const roledata: string[][] = [];
		for (const role in roleOccupancy) {
			const [current, needed] = roleOccupancy[role];
			// if (needed > 0) {
			// 	stringReport.push('| ' + `${role}:`.padRight(padLength) +
			// 					  `${Math.floor(100 * current / needed)}%`.padLeft(4));
			// }
			roledata.push([role, `${current}/${needed}`]);
		}
		return roledata;
	}
}
