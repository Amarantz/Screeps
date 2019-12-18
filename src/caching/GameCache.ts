export default class GameCache implements ICache {
    creepsByBase: { [baseName: string]: Creep[]; };
    targets: { [ref: string]: string[]; };
    outpostFlags: Flag[];
    commanders: {[commander:string]: {[roleName:string]: string[]}};

    constructor() {
        this.commanders = {};
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
        this.commanders = {};
        const creepNamesByCommander = _.groupBy(Object.keys(Game.creeps), name => Game.creeps[name].memory[_MEM.COMMANDER]);
        Object.keys(creepNamesByCommander).forEach(ref => {
            this.commanders[ref] = _.groupBy(creepNamesByCommander[ref], (name) => Game.creeps[name].memory.role)
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
