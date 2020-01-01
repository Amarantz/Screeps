import { ReservingCommander } from '../../commander/colonization/reserver';
import { StationaryScoutCommander } from '../../commander/scouting/StationaryScout';
import { log } from '../../console/log';
import { RoomIntel } from '../../intel/RoomIntel';
import { Cartographer, ROOMTYPE_CONTROLLER } from '../../utils/Cartographer';
import { Directive } from '../Directive';

export default class DirectiveOutpost extends Directive {

	static directiveName = 'outpost';
	static color = COLOR_PURPLE;
	static secondaryColor = COLOR_PURPLE;

	static settings = {
		canSpawnReserversAtRCL: 3,
	};

	spawnMoarCommanders() {
		if (this.base.level >= DirectiveOutpost.settings.canSpawnReserversAtRCL) {
			if (Cartographer.roomType(this.pos.roomName) == ROOMTYPE_CONTROLLER) {
				this.commanders.reserve = new ReservingCommander(this);
			}
		} else {
			this.commanders.scout = new StationaryScoutCommander(this);
		}
	}

	init(): void {

	}

	run(): void {
		if (RoomIntel.roomOwnedBy(this.pos.roomName)) {
			log.warning(`Removing ${this.print} since room is owned!`);
			this.remove();
		}
		if (Game.time % 10 == 3 && this.room && this.room.controller
			&& !this.pos.isEqualTo(this.room.controller.pos) && !this.memory.setPosition) {
			this.setPosition(this.room.controller.pos);
		}
	}
}
