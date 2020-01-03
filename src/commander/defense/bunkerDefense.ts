import { CombatCommander } from "commander/CombatCommander";
import { CombatUnit } from "unit/CombatUnit";
import { DirectiveInvasionDefense } from "directives/defense/invasionDefense";
import { CommanderPriority } from "priorities/priorities_commanders";
import { boostResources } from "resources/map_resources";
import { Roles, CombatSetups } from "creeps/setups/setups";
import { log } from "console/log";

export class BunkerDefenseCommander extends CombatCommander {

	lurkers: CombatUnit[];
	room: Room;

	static settings = {
		retreatHitsPercent : 0.85,
		reengageHitsPercent: 0.95,
	};

	constructor(directive: DirectiveInvasionDefense, boosted = false, priority = CommanderPriority.defense.meleeDefense) {
		// Only spawn inside room
		super(directive, 'bunkerDefense', priority, 1, 30);
		this.lurkers = this.combatUnit(Roles.bunkerGuard, {
            //@ts-ignore
			boostWishlist: boosted ? [boostResources.attack[3], boostResources.move[3]]
								   : undefined
		});
	}

	private handleDefender(lurker: CombatUnit): void {
		log.debug(`Running BunkerDefender in room ${this.room.print}`);
		if (!lurker.inRampart) {
			const nearRampart = _.find(lurker.room.walkableRamparts, rampart => rampart.pos.getRangeTo(lurker) < 5);
			if (nearRampart) {
				lurker.goTo(nearRampart);
			}
		}
		if (lurker.room.hostiles.length > 0) {
			lurker.autoBunkerCombat(lurker.room.name);
		} else {
			// go out of way in bunker
		}
	}

	init() {
		this.reassignIdleCreeps(Roles.bunkerGuard);
		if (this.canBoostSetup(CombatSetups.bunkerGuard.boosted_T3)) {
			const setup = CombatSetups.bunkerGuard.boosted_T3;
			this.wishList(1, setup);
		} else {
			const setup = CombatSetups.bunkerGuard.halfMove;
			this.wishList(1, setup);
		}
	}

	run() {
		this.autoRun(this.lurkers, lurkers => this.handleDefender(lurkers));
	}
}