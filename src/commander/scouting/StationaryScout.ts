import { Commander } from 'commander/Commander';
import { Roles, Setups } from '../../creeps/setups/setups';
import { Directive } from '../../directives/Directive';
import { CommanderPriority } from '../../priorities/priorities_commanders';
import { Unit } from '../../unit/Unit';

export class StationaryScoutCommander extends Commander {

	scouts: Unit[];

	constructor(directive: Directive, priority = CommanderPriority.scouting.stationary) {
		super(directive, 'scout', priority);
		this.scouts = this.unit(Roles.scout, {notifyWhenAttacked: false});
	}

	init() {
		this.wishList(1, Setups.scout);
	}

	run() {
		for (const scout of this.scouts) {
			if (this.pos.roomName == scout.room.name) {
				const enemyConstructionSites = scout.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);
				const squashTarget = _.first(enemyConstructionSites);
				if (squashTarget) {
					scout.goTo(squashTarget);
					return;
				}
			}

			if (!(scout.pos.inRangeTo(this.pos, 3) && !scout.pos.isEdge)) {
				scout.goTo(this.pos, {range: 3});
			}
		}
	}
}
