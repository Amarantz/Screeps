import Directive from "../Directive";
import { Roles } from "creeps/setups/setups";
import Base from "Base";
import { NotifierPriority } from "../Notifier";
import { log } from "console/log";
import BootstrappingCommander from 'commander/situational/bootstrap';


export default class DirectiveBootstrap extends Directive {
    static directiveName = 'bootstrap';
    static color = COLOR_ORANGE;
    static secondaryColor = COLOR_ORANGE;

    base: Base;
    room: Room;
    private needsMiners: boolean;
    private needsManager: boolean;
    private needsQueens: boolean;

    constructor(flag: Flag){
        super(flag);
        this.refresh();
    }
    refresh() {
        super.refresh();
        this.base.bootstraping = true;
        this.needsMiners = (this.base.getCreepsByRole(Roles.drone).length == 0);
        this.needsQueens = (this.base.getCreepsByRole(Roles.queen).length == 0);
        this.needsManager = (this.base.commandCenter != undefined &&
            this.base.commandCenter.overlord != undefined &&
            this.base.getCreepsByRole(Roles.manager).length == 0);
    }

    spawnMoarCommanders(): void {
        this.commanders.bootstrap = new BootstrappingCommander(this);
    }
    init(): void {
        this.alert(`Colony in bootstrap mode!`, NotifierPriority.High);
		if (Game.time % 100 == 0) {
			log.alert(`Colony ${this.room.print} is in emergency recovery mode.`);
		}
    }
    run(): void {
        if (!this.needsQueens && !this.needsMiners && !this.needsManager) {
			log.alert(`Colony ${this.room.print} has recovered from crash; removing bootstrap directive.`);
			// Suicide any fillers so they don't get in the way
			const commander = this.commanders.bootstrap as BootstrappingCommander;
			for (const filler of commander.fillers) {
				filler.suicide();
			}
			// Remove the directive
			this.remove();
		}
    }
}
