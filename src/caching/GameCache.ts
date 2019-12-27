export default class GameCache implements ICache {
    outpostFlags: Flag[];
    creepsByBase: { [baseName: string]: Creep[]; };
    targets: {[ref: string]: string[]}
    commanders: { [commanderName: string]: { [roleName: string]: any[]; }; };

    constructor() {
        this.commanders = {};
        this.creepsByBase = {};
        this.targets = {};
        this.outpostFlags = [];
    }
    private cacheCreepsByBase() {
        this.creepsByBase = _.groupBy(Game.creeps, creep => creep.memory[_MEM.BASE]) as {[colName:string]: Creep[]}
    }
    private cacheCommanders() {
        this.commanders = {};
        const creepsNamesByCommander = _.groupBy(Game.creeps, creep => creep.memory[_MEM.COMMANDER]);
        for(const ref in creepsNamesByCommander){
            this.commanders[ref] = _.groupBy(creepsNamesByCommander[ref], creep => creep.memory.role);
        }
    }
    private cacheTargets() {
        this.targets = {};
        _.forEach(Game.creeps, creep => {
            let { task } = creep.memory;
            while(task){
                if(!this.targets[task._target.ref]) this.targets[task._target.ref] = [];
                this.targets[task._target.ref] = [...this.targets[task._target.ref], creep.name];
                task = task._parent;
            }
        })
    }
    build(): void {
        this.cacheCreepsByBase();
        this.cacheCommanders();
        this.cacheTargets();
    }

    refresh(): void {
        this.cacheCreepsByBase();
        this.cacheCommanders();
        this.cacheTargets();
    }


}
