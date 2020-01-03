
import {Directive} from '../Directive';
import General from 'general';
import { CombatCommander } from 'commander/CombatCommander';

export abstract class DefenseDirective extends Directive {

	overlord: CombatCommander;
	overlords: {};

	constructor(flag: Flag) {
		super(flag);
		(<General>Cobal.general).combatPlanner.directives.push(this);
	}


}