import { Commander } from 'commander/Commander';
import { CommanderPriority } from 'priorities/priorities_commanders';
import { Base}  from '../../Base';
import { Roles, Setups } from '../../creeps/setups/setups';
import { Tasks } from '../../tasks/Tasks';
import { Unit } from '../../unit/Unit';

const DEFAULT_NUM_SCOUTS = 3;
export default class RandomWalkingScoutCommander extends Commander {
	scouts: Unit[];

	constructor(base: Base, priority = CommanderPriority.scouting.randomWalker) {
		super(base, 'scout', priority);
		this.scouts = this.unit(Roles.scout, {notifyWhenAttacked: false});
	}

	private handleScout(scout: Unit) {
				// Stomp on enemy construction sites
		const enemyConstructionSites = scout.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);
		if (enemyConstructionSites.length > 0 && enemyConstructionSites[0].pos.isWalkable(true)) {
			scout.goTo(enemyConstructionSites[0].pos);
			return;
		}
		// Check if room might be connected to newbie/respawn zone
		const indestructibleWalls = _.filter(scout.room.walls, wall => wall.hits == undefined);
		if (indestructibleWalls.length > 0) { // go back to origin colony if you find a room near newbie zone
			scout.task = Tasks.goToRoom(this.base.room.name); // todo: make this more precise
		} else {
			// Pick a new room
			const neighboringRooms = _.values(Game.map.describeExits(scout.pos.roomName)) as string[];
			const roomName = _.sample(neighboringRooms);
			if (Game.map.isRoomAvailable(roomName)) {
				scout.task = Tasks.goToRoom(roomName);
			}
		}
	}

	run(): void {
		this.autoRun(this.scouts, scout => this.handleScout(scout));
	}
	init(): void {
		this.wishList(DEFAULT_NUM_SCOUTS, Setups.scout);
	}


}
