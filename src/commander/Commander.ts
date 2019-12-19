import { Base } from "Base";
import { SpawnRequestOptions, SpawnRequest } from "componets/HandOfNod";
import { CreepSetup } from "creeps/setups/CreepSetups";
import { log } from "console";
import Unit, { getCommander, setCommander } from "unit/unit";
import { Pathing } from "movement/Pathing";
import { spawn } from "child_process";
import { formatWithOptions } from "util";
import { request } from "http";

export interface CommanderInitializer {
    ref: string;
    room: Room | undefined;
    pos: RoomPosition;
    base: Base;
    memory: any;
    waypoints?: RoomPosition[];
}

export const hasColony = (initializer: CommanderInitializer | Base): initializer is CommanderInitializer => {
    return (<CommanderInitializer>initializer).base != undefined;
}

export const DEFAULT_PRESPAWN = 50;
export const MAX_SPAWN_REQUESTS = 100;

export interface CreepRequestOptions {
    ressignIdle?: boolean;
    noLifetimeFilter?: boolean;
    prespawn?: number;
    priortiy?: number;
    partners?: CreepSetup[];
    options?: SpawnRequestOptions;
}

export interface UnitOptions {
    notifyWhenAttacked?: boolean;
    boostWishlist?: _ResourceConstantSansEnergy[] | undefined;
}

export interface CommanderMemory {
    suspendUntil?: number;
}

const CommanderMemoryDefaults: CommanderMemory = {};

export abstract class Commander {
    protected initializer: CommanderInitializer | Base;
    room: Room | undefined;
    priority: number;
    name: string;
    ref: string;
    pos: RoomPosition;
    base: Base;
    spawnGroup: undefined;
    private _unit: {[roleName:string]: Unit[]};
    private _combatunit: {[roleName:string]: any[]};
    private boosts: {[roleName:string]: _ResourceConstantSansEnergy[] | undefined};
    creepUsageReport: any;
    private _creeps: {[roleName:string]: Creep[]};
    constructor(initializer: CommanderInitializer | Base, name: string, priortiy: number) {
        this.initializer = initializer;
        this.room = initializer.room;
        this.priority = priortiy;
        this.name = name;
        this.ref = initializer.ref + '>' + name;
        this.pos = initializer.pos;
        this.base = hasBase(initializer) ? initializer.base : initializer;
        this.spawnGroup = undefined;
        this._unit = {};
        this._combatUnit = {};
        this.recalculateCreeps();
        this.creepUsageReport = _.mapValues(this._creeps, creep => undefined);
        this.boosts = _.mapValues(this._creeps, creep => undefined);
        Cobal.commanders[this.ref] = this;
        Cobal.general.registerCommander();
    }

    get isSuspended(): boolean {
        return global.Cobal.general.isCommanderSuspended(this);
    }

    suspendFor(ticks: number){
        return global.Cobal.general.suspendCommanderFor(this, ticks);
    }

    suspendUntil(untilTick: number) {
        return global.Cobal.general.suspendOverlordUntil(this, untilTick);
    }

    refresh(): void {
        this.room = Game.rooms[this.pos.roomName];
        this.recalculateCreeps();
        for(const role in this._creeps){
            for(const creep of this._creeps[role]){
                if(global.Cobal.unit[creep.name]){
                    global.Cobal.unit[creep.name].refresh();
                } else {
                    log.warning(`${this.print}: could not find and refresh unit with name ${creep.name}`)
                }
            }
        }
    }

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}">[${this.ref}]</a>`;
    }

    recalculateCreeps(): void {
        this._creeps = _.mapValues(global.Cobal.cache.commanders[this.ref],
            creepsOfRole => _.map(creepsOfRole, creepName => Game.creeps[creepName]));

        for(const role in this._unit){
            this.synchronizeUnit(role);
        }
    }

    protected unit(role: string, opts: UnitOptions = {}): Unit[] {
        if(!this._unit[role]){
            this._unit[role] = [];
            this.synchronizeUnit(role, opts.notifyWhenAttacked);
        }
        if (opts.boostWishlist){
            this.boosts[role] = opts.boostWishlist;
            return this._unit[role];
        }
        return [];
    }

    private synchronizeUnit(role: string, notifyWhenAttacked?: boolean): void {
        const unitNames = _.zipObject(_.map(this._unit[role] || [],
            unit => [unit.name, true])) as {[name:string]: boolean};
        const creepsNames = _.zipObject(_.map(this._creeps[role] || [],
            creep => [creep.name, true])) as {[name:string]: boolean};
        for (const creep of this._creeps[role] || []){
            if(!unitNames[creep.name]){
                this._unit[role].push(global.Cobal.unit[creep.name] || new Unit(creep, notifyWhenAttacked));
            }
        }
        for (const unit of this._unit[role]) {
            if(!creepsNames[unit.name]){
                _.remove(this._unit[role], z => z.name == unit.name)
            }
        }
    }

    get outpostIndex(): number {
        return _.findIndex(this.base.roomNames, roomName => roomName == this.pos.roomName);
    }

    protected reassignIdleCreeps(role: string): void {
        const idleCreeps = _.filter(this.base.getCreepsByRole(role), creep => !getCommander(creep));
        for (const creep of idleCreeps){
            setCommander(creep, this);
        }
    }

    protected creepReport(role: string, currentAmt: number, neededAmt: number){
        this.creepUsageReport[role] = [currentAmt, neededAmt];
    }

    lifetimeFilter(creeps: (Creep | Unit)[], prespawn = DEFAULT_PRESPAWN, spawnDistance?: number): (Creep | Unit)[] {
        if(!spawnDistance) {
            spawnDistance = 0;
            if(this.spawnGroup){
                const distances = _.take(_.sortBy(this.spawnGroup.memory.disatances), 2);
                spawnDistance = (_.sum(distances) / distances.length) || 0;
            } else if (this.base.handOfNod){
                spawnDistance = Pathing.distance(this.pos, this.base.handOfNod.pos);
            }

            if(this.base.isIncubating && this.base.spawnGroup) {
                spawnDistance += this.base.spawnGroup.stats.avgDistance;
            }
        }

        return _.filter(creeps, creep => creep.ticksToLive! > CREEP_SPAWN_TIME * creep.body.length + spawnDistance! + prespawn || creep.spawning || (!creep.spawning && !creep.ticksToLive))
    }

    protected requestCreep(setup: CreepSetup, opts = {} as CreepRequestOptions) {
        _.defaults(opts, {priority: this.priority, prespawn: DEFAULT_PRESPAWN});
        const spawner = this.spawnGroup || this.base.spawnGroup || this.base.handOfNod;
        if(spawner){
            const request: SpawnRequest = {
                setup,
                commander: this,
                priority: opts.priortiy!,
            }
            if(opts.partners) {
                request.partners = opts.partners;
            }
            if(opts.options){
                request.options = opts.options;
            }
            spawner.enqueue(request);
        } else {
            if(Game.time % 100 == 0) {
                log.warning(`Commander ${this.ref} @ ${this.pos.print}: no spawner object`);
            }
        }
    }

    preInit(): 

}


