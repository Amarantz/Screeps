export default class GameCache implements ICache {
    creepsByBase: { [baseName: string]: Creep[]; };
    targets: { [ref: string]: string[]; };
    outpostFlags: Flag[];

    constructor() {
        this.creepsByBase = {};
        this.targets = {};
        this.outpostFlags = [];
    }

    build(): void {
        this.cacheCreepByBase();
    }

    refresh(): void {
        throw new Error("Method not implemented.");
    }

    private cacheCreepByBase() {
        this.creepsByBase = _.groupBy(Game.creeps, creep => creep.memory[_MEM.BASE]) as {[baseName:string]: Creep[]}
    }

}
