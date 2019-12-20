import { Directive } from "directives/Directive";
import { Base } from "Base";
import { Roles } from "creeps/setups/setups";
import { log } from "console/log";

export class DirectiveBootstrap extends Directive {
    static directiveName = 'bootstrap';
    static color = COLOR_ORANGE;
    static secondaryColor = COLOR_ORANGE;

    base: Base;
    room: Room;
    private needsMiners: boolean;
    private needsManager: boolean;
    private needsQueen: boolean;

    constructor(flag: Flag) {
        super(flag);
        this.refresh();
    }

    refresh(): void{
        super.refresh();
        this.base.bootstrapping = true;
        this.needsMiner = (this.base.getCreepsByRole(Roles.drone).length == 0);
        this.needsManger = (this.base.commandCenter && this.base.commandCenter.commander && this.base.getCreepsByRole(Roles.manager).length == 0);
        this.needsQueen = (this.base.getCreepsByRole(Roles.queen).length == 0);
    }
    spawnMoarOverlords(): void {
        this.commanders.bootstrap = new BootstrappingCommander(this);
    }
    init(): void {
        this.alert(`Base in bootstrap mode!`, NotifierPriority.High);
        if(Game.time % 100 == 0){
            log.alert(`Colony ${this.room.print} is in emergency recovery mode`);
        }
    }
    run(): void {
        if (!this.needsQueen && !this.needsMiner && !this.needsManager) {
			log.alert(`Base ${this.room.print} has recovered from crash; removing bootstrap directive.`);
			// Suicide any fillers so they don't get in the way
			const overlord = this.commanders.bootstrap as BootstrappingOverlord;
			for (const filler of overlord.fillers) {
				filler.suicide();
			}
			// Remove the directive
			this.remove();
		}
    }


}
