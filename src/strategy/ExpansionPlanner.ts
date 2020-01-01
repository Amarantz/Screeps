import { Base,  getAllBases } from '../Base';
import { MIN_EXPANSION_DISTANCE } from 'strategy/ExpansionEvaluator';
import { log } from '../console/log';
import { DirectiveColonize } from '../directives/colony/colonize';
import Mem from '../memory/memory';
import { Pathing } from '../movement/Pathing';
import { MAX_OWNED_ROOMS, SHARD3_MAX_OWNED_ROOMS } from '../settings';
import { Cartographer } from '../utils/Cartographer';
import { maxBy } from '../utils/utils';

const CHECK_EXPANSION_FREQUENCY = 1000;

const UNOWNED_MINERAL_BONUS = 100;
const CATALYST_BONUS = 75;
const MAX_SCORE_BONUS = _.sum([UNOWNED_MINERAL_BONUS, CATALYST_BONUS]);

const TOO_CLOSE_PENALTY = 100;

interface ExpansionPlannerMemory {

}

const defaultExpansionPlannerMemory: ExpansionPlannerMemory = {};
export class ExpansionPlanner implements IExpansionPlanner {

	memory: ExpansionPlannerMemory;

	constructor() {
		this.memory = Mem.wrap(Memory, 'expansionPlanner', defaultExpansionPlannerMemory);
	}

	refresh() {
		this.memory = Mem.wrap(Memory, 'expansionPlanner', defaultExpansionPlannerMemory);
	}

	private handleExpansion(): void {
		const allColonies = getAllBases();
		// If you already have max number of colonies, ignore
		if (allColonies.length >= Math.min(Game.gcl.level, MAX_OWNED_ROOMS)) {
			return;
		}
		// If you are on shard3, limit to 3 owned rooms // TODO: use CPU-based limiting metric
		if (Game.shard.name == 'shard3') {
			if (allColonies.length >= SHARD3_MAX_OWNED_ROOMS) {
				return;
			}
		}

		const roomName = this.chooseNextColonyRoom();
		if (roomName) {
			const pos = Pathing.findPathablePosition(roomName);
			DirectiveColonize.createIfNotPresent(pos, 'room');
			log.notify(`Room ${roomName} selected as next base! Creating colonization directive.`);
		}
	}

	private chooseNextColonyRoom(): string | undefined {
		// Generate a list of possible colonies to expand from based on level and whether they are already expanding
		// let possibleIncubators: Colony[] = []; // TODO: support incubation
		const possibleColonizers: Base[] = [];
		for (const base of getAllBases()) {
			// if (base.level >= DirectiveIncubate.requiredRCL
			// 	&& _.filter(base.flags, flag => DirectiveIncubate.filter(flag)).length == 0) {
			// 	possibleIncubators.push(base);
			// }
			if (base.level >= DirectiveColonize.requiredRCL
				&& _.filter(base.flags, flag => DirectiveColonize.filter(flag)).length == 0) {
				possibleColonizers.push(base);
			}
		}
		const possibleBestExpansions = _.compact(_.map(possibleColonizers, col => this.getBestExpansionRoomFor(col)));
		log.debug(JSON.stringify(possibleBestExpansions));
		const bestExpansion = maxBy(possibleBestExpansions, choice => choice!.score);
		if (bestExpansion) {
			log.alert(`Next expansion chosen: ${bestExpansion.roomName} with score ${bestExpansion.score}`);
			return bestExpansion.roomName;
		} else {
			log.alert(`No viable expansion rooms found!`);
		}
	}

	private getBestExpansionRoomFor(base: Base): { roomName: string, score: number } | undefined {
		const allColonyRooms = _.zipObject(_.map(getAllBases(),
											   col => [col.room.name, true])) as { [roomName: string]: boolean };
		const allOwnedMinerals = _.map(getAllBases(), col => col.room.mineral!.mineralType) as MineralConstant[];
		let bestRoom: string = '';
		let bestScore: number = -Infinity;
		for (const roomName in base.memory.expansionData.possibleExpansions) {
			let score = base.memory.expansionData.possibleExpansions[roomName] as number | boolean;
			if (typeof score != 'number') continue;
			// Compute modified score
			if (score + MAX_SCORE_BONUS > bestScore) {
				// Is the room too close to an existing base?
				const range2Rooms = Cartographer.findRoomsInRange(roomName, MIN_EXPANSION_DISTANCE);
				if (_.any(range2Rooms, roomName => allColonyRooms[roomName])) {
					continue; // too close to another base
				}
				const range3Rooms = Cartographer.findRoomsInRange(roomName, MIN_EXPANSION_DISTANCE + 1);
				if (_.any(range3Rooms, roomName => allColonyRooms[roomName])) {
					score -= TOO_CLOSE_PENALTY;
				}
				// Are there powerful hostile rooms nearby?
				const adjacentRooms = Cartographer.findRoomsInRange(roomName, 1);
				if (_.any(adjacentRooms, roomName => Memory.rooms[roomName][_RM.AVOID])) {
					continue;
				}
				// Reward new minerals and catalyst rooms
				const mineralType = Memory.rooms[roomName][_RM.MINERAL]
								  ? Memory.rooms[roomName][_RM.MINERAL]![_RM_MNRL.MINERALTYPE]
								  : undefined;
				if (mineralType) {
					if (!allOwnedMinerals.includes(mineralType)) {
						score += UNOWNED_MINERAL_BONUS;
					}
					if (mineralType == RESOURCE_CATALYST) {
						score += CATALYST_BONUS;
					}
				}
				// Update best choices
				if (score > bestScore && Game.map.isRoomAvailable(roomName)) {
					bestScore = score;
					bestRoom = roomName;
				}
			}
		}
		if (bestRoom != '') {
			return {roomName: bestRoom, score: bestScore};
		}
	}

	init(): void {

	}

	run(): void {
		if (Game.time % CHECK_EXPANSION_FREQUENCY == 17) {
			this.handleExpansion();
		}
	}

}
