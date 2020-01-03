import { Directive } from "directives/Directive";
import { DefenseNPCCommander } from "commander/defense/npcDefence";

interface DirectiveGuardMemory extends FlagMemory {
	safeTick?: number;
	enhanced?: boolean;
}

export class DirectiveGuard extends Directive {
	static directiveName = 'guard';
	static color = COLOR_BLUE;
	static secondaryColor = COLOR_BLUE;

	memory: DirectiveGuardMemory;

	constructor(flag: Flag) {
		super(flag);
	}

	spawnMoarCommanders() {
		if (this.base.level >= DefenseNPCCommander.requiredRCL) {
			// if (this.memory.enhanced || this.name.includes('enhanced')) {
			// 	this.overlords.guardPair = new GuardPairOverlord(this);
			// } else {
			this.commanders.guard = new DefenseNPCCommander(this);
			// }
		} else {
			// this.commanders.swarmGuard = new GuardSwarmOverlord(this);
		}
	}

	init(): void {

	}

	run(): void {
		// If there are no hostiles left in the room...
		if (this.room && this.room.hostiles.length == 0 && this.room.hostileStructures.length == 0) {
			// If everyone's healed up, mark as safe
			if (_.filter(this.room.creeps, creep => creep.hits < creep.hitsMax).length == 0 && !this.memory.safeTick) {
				this.memory.safeTick = Game.time;
			}
			// If has been safe for more than 100 ticks, remove directive
			if (this.memory.safeTick && Game.time - this.memory.safeTick > 100) {
				this.remove();
			}
		} else {
			if (this.memory.safeTick) {
				delete this.memory.safeTick;
			}
		}
	}
}