import { CombatCommander } from "commander/CombatCommander";
import { CombatUnit } from "unit/CombatUnit";
import { DirectiveInvasionDefense } from "directives/defense/invasionDefense";
import { CommanderPriority } from "priorities/priorities_commanders";
import { boostResources } from "resources/map_resources";
import { Roles, CombatSetups } from "creeps/setups/setups";
import { CreepSetup } from "creeps/setups/CreepSetups";
import { CombatIntel } from "intel/CombatIntel";

export class MeleeDefenseCommander extends CombatCommander {

	zerglings: CombatUnit[];
	room: Room;

	static settings = {
		retreatHitsPercent : 0.75,
		reengageHitsPercent: 0.95,
	};

	constructor(directive: DirectiveInvasionDefense, boosted = false, priority = CommanderPriority.defense.meleeDefense) {
		super(directive, 'meleeDefense', priority, 1);
		this.zerglings = this.combatUnit(Roles.melee, {
            //@ts-ignore
			boostWishlist: boosted ? [boostResources.tough[3], boostResources.attack[3], boostResources.move[3]]
								   : undefined
		});
	}

	private handleDefender(zergling: CombatUnit): void {
		if (zergling.room.hostiles.length > 0) {
			zergling.autoCombat(zergling.room.name);
		}
	}

	private computeNeededZerglingAmount(setup: CreepSetup, boostMultiplier: number): number {
		const healAmount = CombatIntel.maxHealingByCreeps(this.room.hostiles);
		const zerglingDamage = ATTACK_POWER * boostMultiplier * setup.getBodyPotential(ATTACK, this.base);
		const towerDamage = this.room.hostiles[0] ? CombatIntel.towerDamageAtPos(this.room.hostiles[0].pos) || 0 : 0;
		const worstDamageMultiplier = _.min(_.map(this.room.hostiles,
												creep => CombatIntel.minimumDamageTakenMultiplier(creep)));
		return Math.ceil(.5 + 1.5 * healAmount / (worstDamageMultiplier * (zerglingDamage + towerDamage + 1)));
	}

	init() {
		this.reassignIdleCreeps(Roles.melee);
		if (this.canBoostSetup(CombatSetups.zerglings.boosted_T3_defense)) {
			const setup = CombatSetups.zerglings.boosted_T3_defense;
			this.wishList(this.computeNeededZerglingAmount(setup, BOOSTS.attack.XUH2O.attack), setup);
		} else {
			const setup = CombatSetups.zerglings.default;
			this.wishList(this.computeNeededZerglingAmount(setup, 1), setup);
		}
	}

	run() {
		this.autoRun(this.zerglings, zergling => this.handleDefender(zergling));
	}
}