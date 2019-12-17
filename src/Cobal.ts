import Mem from "memory/memory";
import Cache from "caching/GameCache";
import { getMaxListeners } from "cluster";
import { Base } from "./Base";

class Cobal implements ICobal {
    cache: ICache;
    shouldRebuild: boolean;
    expiration: number;
    unit: {[creepName: string]: any; };
    bases: {[baseName:string]: any; };
    baseMap: {[roomName: string]: string};

    constructor() {
        this.cache = new Cache();
        this.expiration = Game.time + 5;
        this.shouldRebuild = false;
        this.unit = {};
        this.bases = {};
        this.baseMap = {};
    }

    /**
     * init
     */
    init() {
        Object.keys(this.bases).forEach(name => this.bases[name].init());
    }
    /**
     * refresh
     */
    refresh() {
        Object.keys(this.bases).forEach(name => this.bases[name].refresh());
    }
    /**
     * build
     */
    build(): void {
        this.cache.build();
        this.wrapCreeps();
        this.registerBases();
        this.registerDirectives();
    }

    /**
     * run
     */
    run(): void{
        Object.keys(this.bases).forEach(name => this.bases[name].run());
    }

    postRun(): void {

    }

    private registerBases():void {
        let baseOutpost: {[roomName:string]: string[]} = {};
        for(const name in Game.rooms) {
            if(Game.rooms[name].my){
                baseOutpost[name] = [];
                this.baseMap[name] = name;
            }
        }

        Object.keys(baseOutpost).forEach((name, index) => (this.bases[name] = new Base(index, name, baseOutpost[name])));
    }

    private wrapCreeps(){

    }

    private registerDirectives(){

    }

}

export default Cobal;
