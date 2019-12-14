import Cobal from "Cobal";
import {log} from '../console/log'
import { Traveler } from "traveler/traveler";

const actionPiplines: string[][] = [
    ['harvest', 'attack' , 'build', 'repair', 'dismantle', 'attackController', 'rangeHeal', 'heal'],
    ['rangedAttack', 'rangedMassAttack', 'build', 'repair', 'rangeHeal'],
]

export const toCreep = (creep: Unit | Creep): Creep => (isUnit(creep) ? creep.creep : creep));

export const nomrlizeUnit = (creep: Unit | Creep): Unit | Creep => (Cobal.unit[creep.name] || creep)

interface ParkingOptions {
    range: number;
    exportRange: boolean;
    offroad: boolean;
}

interface FleeOptions {
    dropEnerge?: boolean;
    invalidateTask?: boolean;
}

const RANGES = {
    BUILD: 3,
    REPAIR: 3,
    TRANSFER: 1,
    WITHDRAW: 1,
    HARVEST: 1,
    DROP: 0,
}
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

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.pos.roomName}">['${this.name}']</a>`;
    }

    attackController(controller: StructureController){
        const result = this.creep.attackController(controller);
        if(!this.actionLog.attackController) {
            this.actionLog.attackController = (result == OK);
        }
    }

    build(target: ConstructionSite){
        const result = this.creep.build(target)
            if(!this.actionLog.build) this.actionLog.build = (result == OK)
    }

    goBuild(target: ConstructionSite){
        if(this.pos.inRangeToPos(target.pos, RANGES.BUILD)){
            return this.build(target);
        } else {
            this.goTo(target);
        }
    }

    //Movement and location
    goTo(destination: RoomPosition | HasPos, options: MoveOptions = {}){
        return Traveler.travelTo(this, destination, options);
    }

    goToRoom(roomane: string, options: MoveOptions = {}){
        return Traveler.
    }
}
