import { Base } from '../../Base';
import { log } from '../../console/log';
import { Roles } from '../../creeps/setups/setups';
import { MY_USERNAME } from '../../settings';
import { Cartographer, ROOMTYPE_CONTROLLER } from '../../utils/Cartographer';
import { printRoomName } from '../../utils/utils';
import { Directive } from '../Directive';

export class DirectiveColonize extends Directive {

	static directiveName = 'colonize';
	static color = COLOR_PURPLE;
	static secondaryColor = COLOR_GREY;

	static requiredRCL = 3;

	toColonize: Base | undefined;
	commanders: {
		claim: ClaimingCommander;
		pioneer: PioneerCommander;
	};

	constructor(flag: Flag) {
		super(flag, base => base.level >= DirectiveColonize.requiredRCL
							  && base.name != Directive.getPos(flag).roomName && base.spawns.length > 0);
		// Register incubation status
		this.toColonize = this.room ? Cobal.bases[Cobal.baseMap[this.room.name]] : undefined;
		// Remove if misplaced
		if (Cartographer.roomType(this.pos.roomName) != ROOMTYPE_CONTROLLER) {
			log.warning(`${this.print}: ${printRoomName(this.pos.roomName)} is not a controller room; ` +
						`removing directive!`);
			this.remove(true);
		}
	}

	spawnMoarCommanders() {
		this.commanders.claim = new ClaimingCommander(this);
		this.commanders.pioneer = new PioneerCommander(this);
	}

	init() {
		this.alert(`Colonization in progress`);
	}

	run(verbose = false) {
		if (this.toColonize && this.toColonize.spawns.length > 0) {
			// Reassign all pioneers to be miners and workers
			const miningOverlords = _.map(this.toColonize.miningSites, site => site.commanders.mine);
			for (const pioneer of this.commanders.pioneer.pioneers) {
				const miningOverlord = miningOverlords.shift();
				if (miningOverlord) {
					if (verbose) {
						log.debug(`Reassigning: ${pioneer.print} to mine: ${miningOverlord.print}`);
					}
					pioneer.reassign(miningOverlord, Roles.drone);
				} else {
					if (verbose) {
						log.debug(`Reassigning: ${pioneer.print} to work: ${this.toColonize.commanders.work.print}`);
					}
					pioneer.reassign(this.toColonize.commanders.work, Roles.worker);
				}
			}
			// Remove the directive
			this.remove();
		}
		if (Game.time % 10 == 2 && this.room && !!this.room.owner && this.room.owner != MY_USERNAME) {
			log.notify(`Removing Colonize directive in ${this.pos.roomName}: room already owned by another player.`);
			this.remove();
		}
	}
}
