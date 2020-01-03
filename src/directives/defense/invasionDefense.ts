import { NotifierPriority } from "directives/Notifier";
import { Directive } from "directives/Directive";
import { CombatIntel } from "intel/CombatIntel";
import { BaseStage } from "Base";
import { RangedDefenseCommander } from "../../commander/defense/rangedDefense";
import { MeleeDefenseCommander } from "commander/defense/meleeDefense";
import { BunkerDefenseCommander } from "commander/defense/bunkerDefense";

interface DirectiveInvasionDefenseMemory extends FlagMemory {
	persistent?: boolean;
	created: number;
	safeSince: number;
}

/**
 * Defend an owned room against an incoming player invasion
 */
export class DirectiveInvasionDefense extends Directive {

	static directiveName = 'invasionDefense';
	static color = COLOR_BLUE;
	static secondaryColor = COLOR_PURPLE;

	memory: DirectiveInvasionDefenseMemory;
	room: Room | undefined;

	private relocateFrequency: number;

	constructor(flag: Flag) {
		super(flag, base => base.level >= 1 && base.spawns.length > 0);
	}

	spawnMoarCommanders() {

		if (!this.room) {
			return;
		}
		const expectedDamage = CombatIntel.maxDamageByCreeps(this.room.dangerousPlayerHostiles);
		const expectedHealing = CombatIntel.maxHealingByCreeps(this.room.dangerousPlayerHostiles);
		const useBoosts = (expectedDamage > ATTACK_POWER * 50) || (expectedHealing > RANGED_ATTACK_POWER * 100)
						&& !!this.base.terminal
						&& !!this.base.evolutionChamber;
		const percentWalls = _.filter(this.room.barriers, s => s.structureType == STRUCTURE_WALL).length /
							 this.room.barriers.length;
		const meleeHostiles = _.filter(this.room.hostiles, hostile => hostile.getActiveBodyparts(ATTACK) > 0 ||
																	  hostile.getActiveBodyparts(WORK) > 0);
		const rangedHostiles = _.filter(this.room.hostiles, hostile => hostile.getActiveBodyparts(RANGED_ATTACK) > 0);
		if (this.base.stage > BaseStage.MCV) {
			this.commanders.rangedDefense = new RangedDefenseCommander(this, useBoosts);
		} else {
			this.commanders.meleeDefense = new MeleeDefenseCommander(this, useBoosts);
		}
		// If serious bunker busting attempt, spawn lurkers
		// TODO understand dismantlers damage output
		if (meleeHostiles.length > 0 && (expectedDamage > ATTACK_POWER * 70)) {
			this.commanders.bunkerDefense = new BunkerDefenseCommander(this, false);
		}

	}

	init(): void {
		const numHostiles: string = this.room ? this.room.hostiles.length.toString() : '???';
		this.alert(`Invasion (hostiles: ${numHostiles})`, NotifierPriority.Critical);
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