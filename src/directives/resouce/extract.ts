import {log} from '../../console/log';
import {ExtractorCommander} from '../../commander/mining/extractor';
import {CommanderPriority} from '../../priorities/priorities_commanders';
import {Directive} from '../Directive';

/**
 * Mineral extraction directive. Spawns extraction creeps to operate extractors in owned or source keeper rooms
 */
export class DirectiveExtract extends Directive {

	static directiveName = 'extract';
	static color = COLOR_YELLOW;
	static secondaryColor = COLOR_CYAN;

	overlords: {
		extract: ExtractorCommander;
	};

	constructor(flag: Flag) {
		super(flag);
		if (this.base) {
			this.base.destinations.push({pos: this.pos, order: this.memory[_MEM.TICK] || Game.time});
		}
	}

	spawnMoarOverlords() {
		let priority: number;
		if (this.room && this.room.my) {
			if (this.base.level == 8) {
				priority = CommanderPriority.ownedRoom.mineralRCL8;
			} else {
				priority = CommanderPriority.ownedRoom.mineral;
			}
		} else {
			priority = CommanderPriority.remoteSKRoom.mineral;
		}
		this.overlords.extract = new ExtractorCommander(this, priority);
	}

	init() {

	}

	run() {
		if (this.base.level < 6) {
			log.notify(`Removing extraction directive in ${this.pos.roomName}: room RCL insufficient.`);
			this.remove();
		}
	}

}
