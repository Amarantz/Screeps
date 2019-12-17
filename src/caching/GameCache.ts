export default class GameCache implements ICache {
    commander: {[commanderName:string]: {[roleName: string]: string[]}}
    creepsByBase: { [baseName: string]: Creep[]; };
    targets: { [ref: string]: string[]; };
    outpostFlags: Flag[];

    constructor() {
        this.commander = {};
        this.creepsByBase = {};
        this.targets = {};
        this.outpostFlags = [];
    }

    build(): void {
        this.cacheCreepByBase();
        this.cacheCommanders();
        this.cacheTargets();
    }

    refresh(): void {
        this.cacheCreepByBase();
        this.cacheCommanders();
        this.cacheTargets();
    }

    private cacheCreepByBase() {
        this.creepsByBase = _.groupBy(Game.creeps, creep => creep.memory[_MEM.BASE]) as {[baseName:string]: Creep[]}
    }

    private cacheCommanders() {
        this.commander = {};
        const creepNamesByCommander = _.groupBy(Object.keys(Game.creeps), name => Game.creeps[name].memory[_MEM.COMMANDER]);
        Object.keys(creepNamesByCommander).forEach(ref => {
            this.commander[ref] = _.groupBy(creepNamesByCommander[ref], (name) => Game.creeps[name].memory.role)
        })
    }

    private cacheTargets() {
        this.targets = {};
        Object.keys(Game.creeps).forEach(i => {
            const creep = Game.creeps[i];
            let task = creep.memory.task;
            while(task){
                if(!this.targets[task._target.ref]) this.targets[task._target.ref] = [];
                this.targets[task._target.ref].push(creep.name);
                task = task._parent;
            }
        })
    }

}
