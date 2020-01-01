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
import { basename } from "path";

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
            if(baseName && baseOutpost[baseName].length){
                const outpostName = flag.pos.name
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
                base.init()
            });
    }

    run(): void {
            this.general.run();
            _.forEach(this.bases, base => base.run());

    }

    refresh(): void {
        this.cache.refresh();
        this.general.refresh();
        for(const name in this.units){
            this.units[name].refresh();
        }
        for(const base in this.baseMap){
            this.bases[base].refresh();
        }
        for(const commander in this.commanders){
            this.commanders[commander].refresh();
        }
    }

    postRun(): void {
        Visualizer.visuals();
        this.general.visuals();
        this.general.notifier.visuals();
        for(const e of this.expections){
            log.error(e);
        }
        for(const base in this.baseMap){
            this.bases[base].visuals()
        }
        RoomIntel.run();
    }

}
