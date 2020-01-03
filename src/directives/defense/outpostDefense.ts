import { Directive } from "directives/Directive";
import { NotifierPriority } from "directives/Notifier";
import { OutpostDefenseCommander } from "commander/defense/outpostDefense";

interface DirectiveInvasionDefenseMemory extends FlagMemory {
	persistent?: boolean;
	created: number;
	safeSince: number;
}

/**
 * Defend an outpost against an incoming player invasion
 */
export class DirectiveOutpostDefense extends Directive {

	static directiveName = 'outpostDefense';
	static color = COLOR_BLUE;
	static secondaryColor = COLOR_RED;

	memory: DirectiveInvasionDefenseMemory;
	room: Room | undefined;

	constructor(flag: Flag) {
		super(flag);
	}

	spawnMoarCommanders() {
		this.commanders.outpostDefense = new OutpostDefenseCommander(this);
	}

	init(): void {
		const numHostiles: string = this.room ? this.room.hostiles.length.toString() : '???';
		this.alert(`Outpost defense (hostiles: ${numHostiles})`, NotifierPriority.High);
	}

	run(): void {
		if (!this.room || this.room.hostiles.length > 0) {
			this.memory.safeSince = Game.time;
		}
		// If there are no hostiles left in the room and everyone's healed, then remove the flag
		if (this.room && this.room.hostiles.length == 0 &&
			Game.time - this.memory.safeSince > 100 && this.room.hostileStructures.length == 0) {
			if (_.filter(this.room.creeps, creep => creep.hits < creep.hitsMax).length == 0) {
				this.remove();
			}
		}
	}

}