import Commander from 'commander/Commander';
import DirectiveOutpost from 'directives/colony/outpost';
import { Roles, Setups } from '../../creeps/setups/setups';
import { RoomIntel } from '../../intel/RoomIntel';
import { CommanderPriority } from '../../priorities/priorities_commanders';
import { MY_USERNAME } from '../../settings';
import { Tasks } from '../../tasks/Tasks';
import Unit from '../../unit/Unit';

export class ReservingCommander extends Commander {

	reservers: Unit[];
	reserveBuffer: number;

	constructor(directive: DirectiveOutpost, priority = CommanderPriority.remoteRoom.reserve) {
		super(directive, 'reserve', priority);
		// Change priority to operate per-outpost
		this.priority += this.outpostIndex * CommanderPriority.remoteRoom.roomIncrement;
		this.reserveBuffer = 2000;
		this.reservers = this.unit(Roles.claim);
	}

	init() {
		let amount = 0;
		if (this.room) {
			if (this.room.controller!.needsReserving(this.reserveBuffer)) {
				amount = 1;
			}
		} else if (RoomIntel.roomReservedBy(this.pos.roomName) == MY_USERNAME &&
				   RoomIntel.roomReservationRemaining(this.pos.roomName) < 1000) {
			amount = 1;
		}
		this.wishList(amount, Setups.engineers.reserve);
	}

	private handleReserver(reserver: Unit): void {
		if (reserver.room == this.room && !reserver.pos.isEdge) {
			// If reserver is in the room and not on exit tile
			if (!this.room.controller!.signedByMe) {
				// Takes care of an edge case where planned newbie zone signs prevents signing until room is reserved
				if (!this.room.my && this.room.controller!.signedByScreeps) {
					reserver.task = Tasks.reserve(this.room.controller!);
				} else {
					reserver.task = Tasks.signController(this.room.controller!);
				}
			} else {
				reserver.task = Tasks.reserve(this.room.controller!);
			}
		} else {
			// reserver.task = Tasks.goTo(this.pos);
			reserver.goTo(this.pos);
		}
	}

	run() {
		this.autoRun(this.reservers, reserver => this.handleReserver(reserver));
	}
}
