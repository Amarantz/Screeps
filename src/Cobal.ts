import { onPublicServer } from "utils/utils";
import cache from './caching/GameCache';
import General from './general';
import Base from "Base";
import Unit from "unit/Unit";
import Directive from "directives/Directive";
import { timingSafeEqual } from "crypto";
import { DirectiveWrapper } from "directives/initializer";

export const NEW_COBAL_INTERVAL = onPublicServer() ? 20 : 10;

export default class Cobal implements ICobal{
    shouldBuild: boolean;    expiration: number;
    general: IGeneral;
    units: { [creepName: string]: any; };
    bases: { [baseName: string]: Base; };
    commanders: { [commanderName: string]: any; };
    directives: {[directiveName: string]: Directive};
    spawnGroups: { [ref: string]: any; };
    baseMap: {[roomName:string]: string};
    cache: ICache;
    memory: ICobalMemory;
    expections: Error[];

    constructor(){
        this.shouldBuild = false;
        this.expiration = Game.time + NEW_COBAL_INTERVAL;
        this.cache = new cache();
        this.general = new General();
        this.units = {};
        this.bases = {};
        this.directives = {};
        this.commanders = {};
        this.spawnGroups = {};
        this.baseMap = {};
        this.expections = [];
    }

    build(): void {
        this.cache.build();
        this.registerBases();
        this.wrapCreeps();
        this.registerDirectives();
    }

    private registerBases(){
        let baseOutpost: {[roomName:string]: string[]} = {};
        for(let name in Game.rooms){
            if(Game.rooms[name].my) {
                baseOutpost[name] = [];
                this.baseMap[name] = name;
            }
        }

        let id = 0;
        for(const baseName in baseOutpost){
            this.bases[baseName] = new Base(id, baseName, baseOutpost[baseName]);
            this.bases[baseName].spawnMoreCommanders();
            id++;
        }
    }

    private registerDirectives(){
        for(const flag in Game.flags){
            const directive = DirectiveWrapper(Game.flags[flag]);
            directive && directive.spawnMoarCommanders();
        }
    }

    private wrapCreeps(): void{
        this.units = {};
        for(const name in Game.creeps){
            this.units[name] = new Unit(Game.creeps[name]);
        }
    }

    init(): void {
        this.general.init();
        _.forEach(this.bases, base => base.init());

    }
    run(): void {
        this.general.run();
        _.forEach(this.bases, base => base.run());

    }
    refresh(): void {
        this.cache.refresh();
        this.general.refresh();
    }

    postRun(): void {
    }


}
