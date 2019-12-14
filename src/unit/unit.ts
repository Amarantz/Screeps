import Cobal from "Cobal";
import {log} from '../console/log'

export default class Unit {
    creep: Creep;
    body: BodyPartDefinition[];
    store: Store<ResourceConstant, false>;
    fatigue: number;
    hits: number;
    hitsMax: number;
    id: string;
    memory: CreepMemory;
    my: boolean;
    name: string;
    owner: Owner;
    saying: string;
    spawning: boolean;
    ticksToLive: number | undefined;
    pos: RoomPosition;
    nextPos: RoomPosition;
    ref: any;
    roleName: string;
    room: Room;
    actionLog: {};
    blockMovement: boolean;
    constructor(creep: Creep, notifyWhenAttacked = true) {
        this.creep = creep;
        this.body = creep.body;
        this.store = creep.store;
        this.fatigue = creep.fatigue;
        this.hits = creep.hits;
        this.hitsMax = creep.hitsMax;
        this.id = creep.id;
        this.memory = creep.memory;
        this.my = creep.my;
        this.name = creep.name;
        this.owner = creep.owner;
        this.saying = creep.saying;
        this.spawning = creep.spawning;
        this.ticksToLive = creep.ticksToLive;
        this.pos = creep.pos;
        this.nextPos = creep.pos;
        this.ref = creep.ref;
        this.roleName = creep.memory.role;
        this.room = creep.room;

        this.actionLog = {};
        this.blockMovement = false;
        global[this.name] = this;
    }

    refresh(): void {
        const creep = Game.creeps[this.name];
        if(creep){
            this.creep = creep;
            this.body = creep.body;
            this.store = creep.store;
            this.fatigue = creep.fatigue;
            this.hits = creep.hits;
            this.hitsMax = creep.hitsMax;
            this.id = creep.id;
            this.memory = creep.memory;
            this.my = creep.my;
            this.name = creep.name;
            this.owner = creep.owner;
            this.saying = creep.saying;
            this.spawning = creep.spawning;
            this.ticksToLive = creep.ticksToLive;
            this.pos = creep.pos;
            this.nextPos = creep.pos;
            this.ref = creep.ref;
            this.roleName = creep.memory.role;
            this.room = creep.room;
            this.actionLog = {};
            this.blockMovement = false;
            global[this.name] = this;
        } else {
            log.debug("deleting from global");
            delete Cobal.unit[this.name];
            delete global[this.name];
        }
    }

    debug(...args: any[]){
        if (this.memory.debug) {
            log.debug(this.print, args);
        }
    }

    get ticksUntilSpawned(): number | undefined {
        if(this.spawning) {
            const spawner = this.pos.lookForStructure(STRUCTURE_SPAWN) as StructureSpawn;
        }
    }
}
