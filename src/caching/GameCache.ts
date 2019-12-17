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
        this.cacheComanders();
        this.cacheTargets();
    }

    refresh(): void {
        this.cacheCreepByBase();
        this.cacheComanders();
        this.cacheTargets();
    }

    private cacheCreepByBase() {
        this.creepsByBase = _.groupBy(Game.creeps, creep => creep.memory[_MEM.BASE]) as {[baseName:string]: Creep[]}
    }

    private cacheComanders() {
        this.commanders = {};
        const creepNamesByCommander = _.groupBy(_.keys(Game.creeps), name => Game.creeps[name].memory[_MEM.COMMANDER]);
        Object.keys(creepNamesByCommander).forEach(name => {
            this.commanders[name] = _.groupBy(creepNamesByCommander[name], name => Game.creeps[name].memory.role)
        })
    }

    private cacheTargets() {
        this.targets = {};
        Object.keys(Game.creeps).forEach(name => {
            const creep = Game.creeps[name];
            let task = creep.memory.task;
            while(task){
                if(!this.targets[task._target.ref]){
                    this.targets[task._target.ref] = []
                    this.targets[task._target.ref].push(creep.name);
                    task = task._parent;
                }
            }
        })
    }

}
