import Mem from "memory/memory";
import { $ } from "caching/GlobalCache";
import { StoreStructure, isStoreStructure } from './declarations/typeGuards';
import { spawn } from "child_process";
import { mergeSum } from "utils/utils";
import { Cartographer, ROOMTYPE_CONTROLLER } from "utils/Cartographer";
import { UpgradeSite } from "componets/upgradeSite";
import { HandOfNod } from "componets/HandOfNod";
import { Oblisk } from "componets/Oblisk";

export enum BasesStage {
    MCV = 0,
    HAND_OF_NOD = 1,
    WAR_FACTOR = 2,

}

export enum DEFCON {
    safe = 0,
    invasionNPC = 1,
    boostedInvasionNPC = 2,
    playerInvasion = 2,
    bigPlayerInvasion = 3,
}

export interface BaseMemory {
    defcon: {
        level: number,
        tick: number,
    };
    expansionData: {
        possibleExpansions: {[roomName: string]: number | boolean },
        expiration: number,
    };
    suspend?: boolean;
};

const defaultBaseMemory: BaseMemory = {
    defcon: {
        level: DEFCON.safe,
        tick: -Infinity
    },
    expansionData: {
        possibleExpansions: {},
        expiration: 0,
    }
}

export const getAllBases = (): Base[] => (
    _.values(Cobal.bases)
);

export class Base {
    id: number;
    name: string;
    ref: string;
    memory: BaseMemory;

    static settings = {
        remoteSourcesByLevel: [0,1,2,3,4,5,6,7,9],
        maxSourceDistance: 100,
    }
    room: any;
    roomNames: string[];
    outposts: Room[];
    rooms: any[];
    miningSites: {};
    extractionSites: {};
    creeps: Creep[];
    creepsByRole: {[roleName:string]: Creep[]};
    flags: Flag[];
    destinations: { pos: RoomPosition, order: number }[];
    spawns: StructureSpawn[];
    sources: Source[];
    extension:StructureExtension[];
    controller: any;
    extentions: any;
    links: any;
    avaliableLinks: any;
    towers: any;
    powerSpawn: any;
    nuker: any;
    observer: any;
    terminal: undefined;
    storage: StructureStorage | undefined;
    pos: any;
    labs: StructureLab[];
    repairables: Structure[];
    drops: {[resourceType:string]: Resource[]};
    assets: {[resourceType:string]: number};
    rechargeables: rechargeObjectType[];
    extractors: StructureExtractor[];
    constructionSites: ConstructionSite[];
    tombstones: Tombstone[];
    stage: BasesStage;
    isIncubating: boolean;
    bootstrapping: boolean;
    level: number;
    defcon: number;
    breached: boolean;
    terminalState: undefined;
    hiveClusters: any[];
    commandCenter: undefined;
    handOfNod: any;
    upgradeSite: any;
    Oblisk: Oblisk;
    linkNetwork: undefined;
    transportRequest: undefined;
    roomPlanner: undefined;
    roadLogistics: undefined;
    logisticsnetwork: undefined;
    spawnGroup: any;
    constructor(id: number, roomName:string, outposts: string[]) {
        this.id = id;
        this.name = roomName;
        this.ref = roomName;
        this.memory = Mem.wrap(Memory.bases, roomName, defaultBaseMemory, true)
        global[this.name] = this;
        global[this.name.toLowerCase()] = this;
        this.build(roomName, outposts);
    }
    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.room.name}">[${this.name}]</a>`
    }
    build(roomName: string, outposts: string[]): void {
        this.roomNames = [roomName].concat(outposts);
        this.room = Game.rooms[roomName];
        this.outposts = _.compact(_.map(outposts, outpost => Game.rooms[outpost]));
        this.rooms = [this.room].concat(this.outposts);
        this.miningSites = {};
        this.extractionSites = {};
        this.creeps = Cobal.cache.creepsByBase[this.name] || [];
        this.creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
        this.registerRoomObjects_cache();
        this.registerOperationalState();
        this.registerUtilities();
        this.registerHiveClusters();
    }
    registerHiveClusters() {
        this.hiveClusters = [];
        if(this.stage > BasesStage.MCV){
            this.commandCenter = undefined;
        }

        if(this.spawns[0]){
            this.handOfNod = new HandOfNod(this, this.spawns[0]);
        }
        this.upgradeSite = new UpgradeSite(this, this.controller);
        if (this.towers[0]){
            this.Oblisk = new Oblisk(this, this.towers[0]);
        }

        this.hiveClusters.reverse();
    }

    registerUtilities() {
        this.linkNetwork = undefined;
        this.logisticsnetwork = undefined;
        this.transportRequest = undefined;
        this.roomPlanner = undefined;
        this.roadLogistics = undefined;
    }

    refresh(): void {
        this.memory = Mem.wrap(Memory.colonies, this.room.name, defaultBaseMemory, true);
		// Refresh rooms
		this.room = Game.rooms[this.room.name];
		this.outposts = _.compact(_.map(this.outposts, outpost => Game.rooms[outpost.name]));
		this.rooms = [this.room].concat(this.outposts);
		// refresh creeps
		this.creeps = Cobal.cache.creepsByBase[this.name] || [];
		this.creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
		// Register the rest of the colony components; the order in which these are called is important!
		this.refreshRoomObjects();
		this.registerOperationalState();
		this.refreshUtilities();
		this.refreshHiveClusters();
    }
    refreshHiveClusters() {
        throw new Error("Method not implemented.");
    }
    refreshUtilities() {

    }
    refreshRoomObjects() {
        //@ts-ignore
        $.refresh(this, 'controller', 'extentions', 'links', 'towers', 'powerSpawn', 'nuker',
        'observer', 'spawns', 'storage', 'terminal', 'labs', 'sources', 'extractors', 'constructionSites', 'repairables');
        $.set(this, 'constructionSites', () => _.flatten(_.map(this.rooms, room => room.constructionSites)), 10);
        $.set(this, 'tombstones', () => _.flatten(_.map(this.rooms, room => room.tombstone)), 5);
        this.drops = _.merge(_.map(this.rooms, room => room.drops));
        this.assets = this.getAllAssets();
    }

    init():void {

    }

    run():void {

    }

    private registerRoomObjects_cache(){
        this.flags = [];
        this.destinations = [];
        this.controller = this.room.controller;
        this.extension = this.room.extension;
        this.links = this.room.links;
        this.avaliableLinks = _.clone(this.room.links);
        this.towers = this.room.towers;
        this.powerSpawn = this.room.powerSpawn;
        this.nuker = this.room.nuker;
        this.observer = this.room.observer;
        //@ts-ignore
        $.set(this, 'spawns', () => _.sortBy(
            _.filter(this.room.spawns, spawn => spawn.my && spawn.isActive()),
            spawn => spawn.ref
        ));
        $.set(this, 'storage', () => (this.room.storage && this.room.storage.isActive() && this.room.storage || undefined));
        $.set(this, 'terminal', () => (this.room.terminal && this.room.terminal.isActive() && this.room.terminal || undefined));
        this.pos = (this.storage || this.terminal || this.spawns[0] || this.controller.pos);
        $.set(this, 'sources', () => (
            _.sortBy(_.flatten(_.map(this.rooms, room => room.sources)), source => source.pos.getMultiRoomRangeTo(this.pos))
        ));
        // need to handle the directive here. after sources are set
        $.set(this, 'extractors', () => _(this.rooms).map(room => room.extractor).compact()
            .filter(e => (e!.my && e!.room.my) || Cartographer.roomType(e!.room.name) != ROOMTYPE_CONTROLLER)
            .sortBy(e=> e!.pos.getMultiRoomRangeTo(this.pos))
            .value() as StructureExtractor[]);
        if(this.controller.level >= 6) {
            _.forEach(this.extractors, extractor => {
                // add directive for extractors
            });
        }
        $.set(this, 'repairables', () => _.flatten(_.map(this.rooms, room => room.repairables)));
        $.set(this, 'rechargeables', () => _.flatten(_.map(this.rooms, room => room.rechargeables)));
        $.set(this, 'constructionSites', () => _.flatten(_.map(this.rooms, room => room.constructionSites)), 10);
        $.set(this, 'tombstones', () => _.flatten(_.map(this.rooms, room => room.tombstone)), 5);

        this.drops = _.merge(_.map(this.rooms, room => room.drops));
        this.assets = this.getAllAssets();
    }

    private getAllAssets(): {[resourceType:string]: number} {
        const stores = _.map(<StoreStructure[]>_.compact([this.storage, this.terminal]), s => s.store);
        const creepCarriesToInclude = _.map(this.creeps, creep => creep.store) as {[resourceType:string]:number}[];
        const LabContentsToInclude = _.map(_.filter(this.labs, lab => !!lab.mineralType), lab => (
            {[<string>lab.mineralType]: lab.mineralAmount}
        )) as {[resourceType:string]: number}[];
        const allAssets: {[ResourceType:string]: number} = mergeSum([
            ...stores,
            ...creepCarriesToInclude,
            ...LabContentsToInclude,
        ]);
        return allAssets;
    }

    private registerOperationalState() {
        this.level = this.controller.level as 1|2|3|4|5|6|7|8;
        this.bootstrapping = false;
        this.isIncubating = false;
        if (this.storage && this.spawns[0]) {
            if(this.controller.level === 8) {
                this.stage = BasesStage.WAR_FACTOR
            } else {
                this.stage = BasesStage.HAND_OF_NOD
            }
        } else {
            this.stage = BasesStage.MCV;
        }
        // this.lowPowerMode = Energetics.lowPowerMode(this);
        let defcon = DEFCON.safe;
        const defconDecaytime = 200;
        if(this.room.dangerouseHostiles.length > 0 && !this.controller.safeMode){
            //@ts-ignore
            const effectiveHostileCount = _.sum(_.map(this.room.dangerousHostiles, hostile => hostile.boosts.length > 0 ? 2 : 1));
            if(effectiveHostileCount >= 3) {
                defcon = DEFCON.boostedInvasionNPC;
            } else {
                defcon = DEFCON.invasionNPC;
            }

            if(this.memory.defcon) {
                if(defcon < this.memory.defcon.level){
                    if(this.memory.defcon.tick + defconDecaytime < Game.time){
                        this.memory.defcon.level = defcon;
                        this.memory.defcon.tick = Game.time;
                    }
                } else if (defcon > this.memory.defcon.level ){
                    this.memory.defcon.level = defcon;
                    this.memory.defcon.tick = Game.time;
                }
            } else {
                this.memory.defcon = {
                    level: defcon,
                    tick: Game.time,
                };
            }
        }

        this.defcon = this.memory.defcon.level;
        this.breached = (this.room.dangerousHostiles.length > 0 &&
            this.creeps.length == 0 &&
            !this.controller.safeMode);
        this.terminalState = undefined;
    }
}
