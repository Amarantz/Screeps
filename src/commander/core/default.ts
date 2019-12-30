import Commander, { getCommander } from "../Commander";
import { CommanderPriority } from "priorities/priorities_commanders";
import Base from "Base";
import Unit from "unit/Unit";

export default class DefaultCommander extends Commander {
    idleUnit: Unit[];
    constructor(base: Base){
        super(base, 'default', CommanderPriority.default);
        this.idleUnit = [];
    }

    init(){
        const idleCreeps = _.filter(this.base.creeps, creep => !getCommander(creep));
        this.idleUnit = _.map(idleCreeps, creep => Cobal.units[creep.name] || new Unit(creep));
        for (const unit of this.idleUnit) {
            unit.refresh();
        }
    }

    run() {

    }
}
