import { onPublicServer } from "utils/utils";
import { GameCache } from './caching/GameCache';
import General from './general';
import { Unit } from "unit/Unit";
import { Directive } from "directives/Directive";
import { DirectiveWrapper } from "directives/initializer";
import { log } from "./console/log";
import { TraderJoe } from "logistics/TradeNetwork";
import { TerminalNetwork } from "logistics/TerminalNetwork";
import { RoomIntel } from "intel/RoomIntel";
import { Visualizer } from "Visualizer";
import { Base } from "./Base";
import { USE_TRY_CATCH } from "./settings";

export const NEW_COBAL_INTERVAL = onPublicServer() ? 20 : 5;

export class Cobal implements ICobal{
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
    tradeNetwork: TraderJoe;
    terminalNetwork: TerminalNetwork;

    constructor(){
        this.shouldBuild = false;
        this.expiration = Game.time + NEW_COBAL_INTERVAL;
        this.cache = new GameCache();
        this.general = new General();
        this.units = {};
        this.bases = {};
        this.directives = {};
        this.commanders = {};
        this.spawnGroups = {};
        this.baseMap = {};
        this.expections = [];
        this.tradeNetwork = new TraderJoe();
    }

    build(): void {
            this.cache.build();
            this.registerBases();
            this.wrapCreeps();
            this.registerDirectives();
            this.registerTermainals();
    }

    private registerBases(){
        let baseOutpost: {[roomName:string]: string[]} = {};
        for(let name in Game.rooms){
            if(Game.rooms[name].my) {
                baseOutpost[name] = [];
                this.baseMap[name] = name;
            }
        }
        for(const flag of this.cache.outpostFlags){
            if(!flag.memory[_MEM.BASE]){
                continue;
            }
            let baseName = flag.memory[_MEM.BASE];
            if(baseName && baseOutpost[baseName]){
                const outpostName = flag.pos.roomName
                this.baseMap[outpostName] = baseName;
                baseOutpost[baseName].push(outpostName)
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

    private registerTermainals(){
        let terminals: StructureTerminal[] = [];
        for(const base in this.bases){
            if(this.bases[base].terminal!){
                terminals.push(this.bases[base].terminal!);
            }
        }
        this.terminalNetwork = new TerminalNetwork(terminals);
    }

    init(): void {
            this.general.init();
            _.forEach(this.bases, base => {
                this.try(() => base.init());
            });
            this.try(() => this.terminalNetwork.init());
    }

    run(): void {
            this.general.run();
            _.forEach(this.bases, base => base.run());

    }

    refresh(): void {
        this.cache.refresh();
        this.try(() => this.general.refresh());
        for(const name in this.units){
            this.try(() => this.units[name].refresh());
        }
        for(const base in this.baseMap){
            this.try(() => this.bases[base].refresh());
        }
        for(const commander in this.commanders){
            this.try(()=>this.commanders[commander].refresh());
        }
    }

    postRun(): void {
        for(const e of this.expections){
            log.debug(e);
        }
        RoomIntel.run();
    }


    private try(callback: ()=> any, identifier?:string): void {
        if((USE_TRY_CATCH)){
            try{
                callback();
            } catch(e){
                if(identifier){
                    e.name = `Caught unhandle exception at ${'' + callback} (identifier: ${identifier}): \n ${e.name} \n ${e.stack}`;
                } else {
                    e.name = `Caught unhandle exception at ${'' + callback}: \n ${e.name} \n ${e.stack}`;
                }
                this.expections.push(e)
            }
        } else {
            callback();
        }
    }
    visuals() {
        Visualizer.visuals();
        this.general.notifier.visuals();
        _.forEach(this.bases, base => base.visuals());
    }

}
