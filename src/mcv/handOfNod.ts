import { CreepSetup } from "creeps/setups/CreepSetups";
import $ from '../caching/GlobalCache';
import Commander from "commander/Commander";
import MCV from "./mcv";
import Base from "Base";
import Mem from "memory/memory";

const ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH = -20;
const ERR_SPECIFIED_SPAWN_BUSY = -21;

export interface SpawnRequest {
    setup: CreepSetup;
    commander: Commander;
    priority: number;
    patners?: CreepSetup[];
    options?: SpawnRequestOptions;
}

export interface SpawnRequestOptions {
    spawn?: StructureSpawn;
    directions?: DirectionConstant[];
}

interface SpawnOrder {
    protoCreep: ProtoCreep;
    options: SpawnOptions | undefined;
}

export interface HandOfNodMemory {
    stats: {
        overload: number;
        uptime: number;
        longUptime: number;
    }
}

const HandOfNodMemoryDefaults: HandOfNodMemory = {
    stats: {
        overload: 0,
        uptime: 0,
        longUptime: 0,
    }
}

export default class HandOfNod extends MCV {
    memory: HandOfNodMemory;
    spawns: StructureSpawn[];
    avaliableSpawns: StructureSpawn[];
    extensions: StructureExtension[];
    energyStrctures: (StructureExtension | StructureSpawn)[];
    batteries: StructureContainer[];
    towers: StructureTower[];
    link: StructureLink | undefined;

    commander: any;
    settings: {
        refillTowersBelow: number,
        suppressSpawning: boolean;
    }
    private _nextAvailability: number | undefined;
    private productionPirorities: number[];
    private productionQueue: {
        [priority:number]: SpawnOrder[];
    }
    private isOverloaded: boolean;
    static restrictedRange = 6;
    constructor(base: Base, headSpawn: StructureSpawn){
        super(base, headSpawn, 'handOfNod');
        this.memory = Mem.wrap(this.base.memory, 'handOfNod', HandOfNodMemoryDefaults, true);
        this.spawns = base.spawns;
        this.avaliableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
        this.extensions = base.extentions;
        this.batteries = _.filter(this.room.containers, container => container.pos.findInRange(FIND_MY_SPAWNS, 4));
        $.set(this, 'energyStructures', () => this.computeEnergyStructures());
        this.productionPirorities = [];
        this.productionQueue = {};
        this.link = this.pos.findClosestByLimitedRange(base.availableLinks, 2)
        this.isOverloaded = false;
        this.settings = {
            refillTowersBelow: 750,
            suppressSpawning: false,
        }
    }

    refresh(): void {
        this.memory = Mem.wrap(this.base.memory, 'handOfNod', HandOfNodMemoryDefaults, true);
        $.refreshRoom(this);
        $.refresh(this, 'spawns', 'extensions', 'energyStructures', 'link', 'towers', 'batteries');
        this.avaliableSpawns = _.filter(this.spawns, spawn => !spawn.spawning);
        this.isOverloaded = false;
        this.productionQueue = {};
        this.productionPirorities = [];
    }
    spawnMoreCommanders(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        throw new Error("Method not implemented.");
    }
    run(): void {
        throw new Error("Method not implemented.");
    }
}
