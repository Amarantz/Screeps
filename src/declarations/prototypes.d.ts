interface Creep {
    hitsPredicted?: number;
    intel?: {[prperty: string]: number};
    memory: CreepMemory;
    boosts: _ResourceConstantSansEnergy[];
    boostsCounts: {[boostType: string]: number};
    inRampart: boolean;
}

interface ConstructionSite {
    isWalkable: boolean;
}

interface Flag {

}

type Sink = StructureSpawn | StructureExtension
    | StructureLab | StructurePowerSpawn | StructureNuker
    | StructureTower;

type StorageUnit = StructureContainer | StructureTerminal | StructureStorage;

type rechargeObjectType = StructureStorage | StructureTerminal |
    StructureContainer | StructureLink | Tombstone | Resource;

interface Room {
    print:string,
    my: boolean;
    isOutpost: boolean;
    owner: string | undefined;
    reservedByMe: boolean;
    signedByMe: boolean;
    creeps: Creep[];
    sourceKeepers: Creep[];
    hostiles: Creep[];
    dangerousHostiles: Creep[];
    hostileStructures: Structure[];
    structures: Structure[];
    flags: Flag[];
    tombstones: Tombstone[];
    drops: {[resourceType: string]: Resource[]};
    droppedEnergy: Resource[];
    droppedPower: Resource[];
    _refreshStructureCache: void;
    spawn: StructureSpawn[];
    extensions: StructureExtension[];
    roads: StructureRoad[];
    walls: StructureWall[];
    ramparts: StructureRampart[];
    constructedWalls: StructureWall[];
    barriers: (StructureWall | StructureRampart)[];
    storageUnits: StorageUnit[];
    keeperLaiers: StructureKeeperLair[];
    portals: StructurePortal[];
    links: StructureLink[];
    towers: StructureTower[];
    labs: StructureLab[];
    powerBanks: StructurePowerBank[];
    observer: StructureObserver | undefined;
    powerSpawn: StructurePowerSpawn | undefined;
    extractor: StructureExtractor | undefined;
    nuker: StructureNuker | undefined;
    repairables: Structure[];
    rechargeables: rechargeObjectType[];
    sources: Source[];
    mineral: Mineral | undefined;
    constructionSites: ConstructionSite[];
    _creepMatrix: CostMatrix;
    _kitingMatrix: CostMatrix;
}

interface RoomObject {
    ref: string;
    targetedBy: string[];
    serialize(): ProtoRoomObject;
}

interface RoomPosition {
    print: string;
    printPlain: string;
    room: Room | undefined;
    name: string;
    coordName: string;
    lookForStructure(StructureType: StructureConstant): Structure | undefined;
}

interface Structure{
    isWalkable: boolean;
}

interface StructureContainer {
    energy: number;
    isFull: boolean;
    isEmpty: boolean;
}

interface StructureController {
    reservedByMe: boolean;
    signedByMe: boolean;
    signedByScreeps: boolean;

    needReserving(reserveBuffer: number): boolean;
}

interface StructureExtension {
    isFull: boolean;
    isEmpty: boolean;
}

interface StructureLink {
    isFull: boolean;
    isEmpty: boolean;
}


interface StructureSpawn {
    isFull: boolean;
    isEmpty: boolean;

    cost(bodyArray: string[]): number;
}

interface StructureStorage {
    energy: number;
    isFull: boolean;
    isEmpty: boolean;
}

interface StrucutreTerminal {
    energy: any;
    isFull: boolean;
    isEmpty: boolean;
}

interface StructureTower {
    isFull: boolean;
    isEmpty: boolean;
}

interface Tombstone {
    energey: number;
}

interface String {
    padRight(length: number, char?: string): string;
    padLeft(length: number, char?: string): string;
}

interface Number{
    toPresent(deceimals?: number): string;
    truncate(deceimals: number): string;
}
