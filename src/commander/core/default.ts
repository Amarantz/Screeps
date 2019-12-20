import { Commander, getCommander } from "commander/Commander";
import Unit from "unit/unit";
import { Base } from "Base";
import { CommanderPriority } from "priorities/priorities_commanders";

export class DefaultCommander extends Commander {
    idleUnit: Unit[];

    constructor(base: Base) {
        super(base, 'default', CommanderPriority.default);
        this.idleUnit = [];
    }

    init(): void {
        const idleCreeps = _.filter(this.base.creeps, creep => !getCommander(creep));
        this.idleUnit = _.map(idleCreeps, creep => global.Cobal.unit[creep.name] || new Unit(creep));
        for(const unit of this.idleUnit){
            unit.refresh();
        }
    }
    run(): void {

    }
}
