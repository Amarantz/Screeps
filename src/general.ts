import Directive from "directives/Directive";
import { onPublicServer, hasJustSpawned } from "utils/utils";
import { Notifier } from "directives/Notifier";
import Mem from "memory/memory";
import Commander from "commander/Commander";
import { USE_TRY_CATCH } from "settings";
import Base, { BaseStage } from "Base";
import { Pathing } from "Movement/pathing";
import { Roles } from "creeps/setups/setups";
import { bodyCost } from "creeps/setups/CreepSetups";
import  DirectiveBootstrap  from "directives/situational/bootstrap";

interface GeneralMemory {
    suspsendUntil: {[commanderRef: string]: number;};
}

const defaultGeneralMemory = {
    suspsendUntil: {},
}

export default class General implements IGeneral {
    private memory: GeneralMemory;
    private commanders: Commander[];
    private sorted: boolean;
    private commanderByBase: {[col: string]: Commander[]};
    private directives: Directive[];
    notifier: INotifier;

    static settings = {
        outpostCheckFrequency: onPublicServer() ? 250 : 100,
    }

    constructor() {
        this.memory = Mem.wrap(Memory, 'general', defaultGeneralMemory);
        this.directives = [];
        this.commanders = [];
        this.commanderByBase = {};
        this.sorted = false;
        this.notifier = new Notifier();
    }
    refresh(): void {
        this.memory = Mem.wrap(Memory, 'general', defaultGeneralMemory);
        this.notifier.clear();
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
                Cobal.expections.push(e)
            }
        } else {
            callback();
        }
    }

    private get bases(): Base[]{
        return _.values(Cobal.bases);
    }

    registerDirective(directive: Directive): void {
        this.directives.push(directive);
    }
    removeDirective(directive: Directive): void {
        _.remove(this.directives, dir => dir.name == directive.name);
        for(const name in directive.commanders){
            this.removeCommander(directive.commanders[name]);
        }
    }

    registerCommander(commander: Commander): void {
        this.commanders = [...this.commanders, commander];
        if(!this.commanderByBase[commander.base.name]){
            this.commanderByBase[commander.base.name] = [];
        }
        this.commanderByBase[commander.base.name].push(commander);
    }

    getCommanderForBased(base: Base): Commander[] {
        return this.commanderByBase[base.name];
    }

    private removeCommander(commander: Commander):void {
        _.remove(this.commanders, c => c.ref === commander.ref);
        if(this.commanderByBase[commander.base.name]){
            _.remove(this.commanderByBase[commander.base.name], c => c.ref === commander.ref);
        }
    }

    build(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        for(const direct of this.directives){
            direct.init();
        }
        if(!this.sorted){
            this.commanders.sort((c1, c2) => c1.priority - c2.priority);
            _.forEach(_.keys(this.commanderByBase), baseName => {
                this.commanderByBase[baseName].sort((c1,c2) => c1.priority - c2.priority);
            })
            this.sorted = true;
        }

        for(const commander of this.commanders){
            if(!this.isCommanderSuspended(commander)) {
                commander.preInit();
                this.try(() => commander.init());
            }
        }

        for(const base of this.bases){
            this.registerLogisticsRequest(base);
        }

    }

    isCommanderSuspended(commander: Commander) {
        if(this.memory.suspsendUntil[commander.ref]){
            if(Game.time < this.memory.suspsendUntil[commander.ref]){
                return true;
            } else {
                delete this.memory.suspsendUntil[commander.ref];
                return false;
            }
        }
        return false;
    }

    suspendCommanderFor(commander: Commander, ticks: number): void {
        this.memory.suspsendUntil[commander.ref] = Game.time + ticks;
    }

    suspendCommanderUntil(commander: Commander, untilTick: number): void {
        this.memory.suspsendUntil[commander.ref] = untilTick;
    }

    registerLogisticsRequest(base: Base) {

    }
    run(): void {
        for(const directive of this.directives){
            directive.run();
        }

        for(const commander of this.commanders){
            if(!this.isCommanderSuspended(commander)){
                this.try(() => commander.run())
            }
        }

        for(const base of this.bases){
            this.handleSafeMode(base);
            this.placeDirectives(base);
        }
    }
    placeDirectives(base: Base) {
        this.handleBootstrapping(base);
    }

    // SafeMode handling
    private handleSafeMode(base: Base): void {
        if(base.stage == BaseStage.MCV && onPublicServer()){
            return;
        }

        const criticalStructures = _.compact([...base.spawns, base.storage, base.terminal]) as Structure[];
        for(const structure of criticalStructures){
            if(structure.hits < structure.hitsMax && structure.pos.findInRange(base.room.dangerousPlayerHostiles, 2).length > 0){
                //@ts-ignore
                const ret = base.controller.activateSafeMode();
                //@ts-ignore
                if(ret != OK && !base.controller.safeMode){
                    if(base.terminal){

                    }
                } else {
                    return;
                }
            }
        }
        const firstHostile = _.first(base.room.dangerousPlayerHostiles);
        if(firstHostile && base.spawns[0]){
            const barriers = _.map(base.room.barriers, barrier => barrier.pos);
            if(Pathing.isReachable(firstHostile.pos, base.spawns[0].pos, barriers)){
                //@ts-ignore
                const ret = base.controller.activateSafeMode();
                //@ts-ignore
                if(ret != OK && !base.controller.safeMode){
                    if(base.terminal){

                    }
                } else {
                    return;
                }
            }
        }
    }

    private handleBootstrapping(base: Base): void {
        if(!base.isIncubating){
            const noQueen = base.getCreepsByRole(Roles.queen).length == 0;
            if(noQueen && base.handOfNod){
                const setup = base.handOfNod.commander.queenSetup;
                const energyToMakeQueen = bodyCost(setup.generateBody(base.room.energyCapacityAvailable));
                if(base.room.energyAvailable < energyToMakeQueen || hasJustSpawned()){
                    const result = DirectiveBootstrap.createIfNotPresent(base.handOfNod.pos, 'pos');{
                        if(typeof result === 'string' || result == OK){
                            base.handOfNod.settings.suppressSpawning = true;
                        }
                    }
                }
            }
        }
    }
}
