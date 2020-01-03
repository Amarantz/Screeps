import { Commander } from "./Commander";
import { Directive } from "directives/Directive";
import { CombatUnit } from "unit/CombatUnit";
import { SpawnGroup } from "logistics/SpawnGroup";

export interface CombatOverlordOptions {

}

/**
 * CombatOverlords extend the base Overlord class to provide additional combat-specific behavior
 */
export abstract class CombatCommander extends Commander {

	directive: Directive;
	spawnGroup: SpawnGroup;
	requiredRCL: number; // default required RCL

	constructor(directive: Directive, name: string, priority: number, requiredRCL: number, maxPathDistance?: number) {
		super(directive, name, priority);
		this.directive = directive;
		this.requiredRCL = requiredRCL;
		this.spawnGroup = new SpawnGroup(this, {requiredRCL: this.requiredRCL, maxPathDistance: maxPathDistance});
	}

	// Standard sequence of actions for running combat creeps
	autoRun(roleCreeps: CombatUnit[], creepHandler: (creep: CombatUnit) => void) {
		for (const creep of roleCreeps) {
			if (creep.hasValidTask) {
				creep.run();
			} else {
				if (this.shouldBoost(creep)) {
					this.handleBoosting(creep);
				} else {
					creepHandler(creep);
				}
			}
		}
	}

}