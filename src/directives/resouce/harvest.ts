import {Pathing} from '../../movement/Pathing';
import {MiningCommander} from '../../commander/mining/miner';
import {CommanderPriority} from '../../priorities/priorities_commanders';
import {Cartographer, ROOMTYPE_SOURCEKEEPER} from '../../utils/Cartographer';
import {exponentialMovingAverage, getCacheExpiration} from '../../utils/utils';
import {Directive} from '../Directive';


// Because harvest directives are the most common, they have special shortened memory keys to minimize memory impact
export const _HARVEST_MEM_PATHING = 'P';
export const _HARVEST_MEM_USAGE = 'u';
export const _HARVEST_MEM_DOWNTIME = 'd';

interface DirectiveHarvestMemory extends FlagMemory {
	[_HARVEST_MEM_PATHING]?: {
		[_MEM.DISTANCE]: number,
		[_MEM.EXPIRATION]: number
	};
	[_HARVEST_MEM_USAGE]: number;
	[_HARVEST_MEM_DOWNTIME]: number;
}

const defaultDirectiveHarvestMemory: DirectiveHarvestMemory = {
	[_HARVEST_MEM_USAGE]   : 1,
	[_HARVEST_MEM_DOWNTIME]: 0,
};

/**
 * Standard mining directive. Mines from an owned, remote, or source keeper room
 */
export class DirectiveHarvest extends Directive {

	static directiveName = 'harvest';
	static color = COLOR_YELLOW;
	static secondaryColor = COLOR_YELLOW;

	memory: DirectiveHarvestMemory;
	overlords: {
		mine: MiningCommander;
	};

	constructor(flag: Flag) {
		super(flag);
		if (this.base) {
			this.base.miningSites[this.name] = this;
			this.base.destinations.push({pos: this.pos, order: this.memory[_MEM.TICK] || Game.time});
		}
		_.defaultsDeep(this.memory, defaultDirectiveHarvestMemory);
	}

	// Hauling distance
	get distance(): number {
		if (!this.memory[_HARVEST_MEM_PATHING] || Game.time >= this.memory[_HARVEST_MEM_PATHING]![_MEM.EXPIRATION]) {
			const distance = Pathing.distance(this.base.pos, this.pos);
			const expiration = getCacheExpiration(this.base.storage ? 5000 : 1000);
			this.memory[_HARVEST_MEM_PATHING] = {
				[_MEM.DISTANCE]  : distance,
				[_MEM.EXPIRATION]: expiration
			};
		}
		return this.memory[_HARVEST_MEM_PATHING]![_MEM.DISTANCE];
	}

	spawnMoarOverlords() {
		// Create a mining overlord for this
		let priority = CommanderPriority.ownedRoom.mine;
		if (!(this.room && this.room.my)) {
			priority = Cartographer.roomType(this.pos.roomName) == ROOMTYPE_SOURCEKEEPER ?
                CommanderPriority.remoteSKRoom.mine : CommanderPriority.remoteRoom.mine;
		}
		this.overlords.mine = new MiningCommander(this, priority);
	}

	init() {

	}

	run() {
		// this.computeStats();
	}

	// private computeStats() {
	// 	const source = this.commanders.mine.source;
	// 	if (source && source.ticksToRegeneration == 1) {
	// 		this.memory[_HARVEST_MEM_USAGE] = (source.energyCapacity - source.energy) / source.energyCapacity;
	// 	}
	// 	const container = this.commanders.mine.container;
	// 	this.memory[_HARVEST_MEM_DOWNTIME] = +(exponentialMovingAverage(container ? +container.isFull : 0,
	// 																	this.memory[_HARVEST_MEM_DOWNTIME],
	// 																	CREEP_LIFE_TIME)).toFixed(5);
	// }

}
