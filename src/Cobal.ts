import Mem from "memory/memory";
import Cache from "caching/GameCache";
import { getMaxListeners } from "cluster";
import { Base } from "./Base";
import { NEW_COBAL_INTERVAL } from "~settings";

class Cobal implements ICobal {
    cache: ICache;
    shouldRebuild: boolean;
    expiration: number;
    unit: {[creepName: string]: any; };
    bases: {[baseName:string]: any; };
    baseMap: {[roomName: string]: string};
    exceptions: Error[];

    constructor() {
        this.cache = new Cache();
        this.expiration = Game.time + NEW_COBAL_INTERVAL;
        this.shouldRebuild = false;
        this.unit = {};
        this.bases = {};
        this.baseMap = {};
        this.exceptions = [];
    }

    /**
     * init
     */
    init() {
        try {
            Object.keys(this.bases).forEach(name => this.bases[name].init());
        }catch (error){
            this.exceptions.push(error);
        }
    }
    /**
     * refresh
     */
    refresh() {
        try {
            Object.keys(this.bases).forEach(name => this.bases[name].refresh());
        } catch(error) {
            this.exceptions.push(error);
        }
    }
    /**
     * build
     */
    build(): void {
        try{
            this.cache.build();
            this.wrapCreeps();
            this.registerBases();
            this.registerDirectives();
        } catch(error) {
            this.exceptions.push(error);
        }
    }

    /**
     * run
     */
    run(): void{
        try{
            Object.keys(this.bases).forEach(name => this.bases[name].run());
        } catch(error){
            this.exceptions.push(error);
        }
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
