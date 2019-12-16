interface Creep {
    hitsPredicted?: number;
	intel?: { [property: string]: number };
	memory: CreepMemory;
	boosts: _ResourceConstantSansEnergy[];
	boostCounts: { [boostType: string]: number };
	inRampart: boolean;
}

interface ConstructionSite {
    isWalkable: boolean;
}

interface Flag {

}

type Sink = StructureSpawn |
    StructureExtension |
    StructureLab |
    StructurePowerSpawn |
    StructureNuker |
    StructureTower;

type StorageUnit = StructureContainer | StructureTerminal | StructureStorage;

type rechargeObjectType = StructureStorage
        | StructureTerminal
        | StructureContainer
        | StructureLink
        | Tombstone
        | Resource;

interface Room {
    print: string;
	my: boolean;
	isOutpost: boolean;
	owner: string | undefined;
	reservedByMe: boolean;
	signedByMe: boolean;
	creeps: Creep[];
	sourceKeepers: Creep[];
	hostiles: Creep[];
	dangerousHostiles: Creep[];
	playerHostiles: Creep[];
	invaders: Creep[];
	dangerousPlayerHostiles: Creep[];
	fleeDefaults: HasPos[];
	hostileStructures: Structure[];
	structures: Structure[];
	flags: Flag[];
	// Cached structures
	tombstones: Tombstone[];
	drops: { [resourceType: string]: Resource[] };
	droppedEnergy: Resource[];
	droppedPower: Resource[];
	// Room structures
	_refreshStructureCache;
	// Multiple structures
	spawns: StructureSpawn[];
	extensions: StructureExtension[];
	roads: StructureRoad[];
	walls: StructureWall[];
	constructedWalls: StructureWall[];
	ramparts: StructureRampart[];
	walkableRamparts: StructureRampart[];
	barriers: (StructureWall | StructureRampart)[];
	storageUnits: StorageUnit[];
	keeperLairs: StructureKeeperLair[];
	portals: StructurePortal[];
	links: StructureLink[];
	towers: StructureTower[];
	labs: StructureLab[];
	containers: StructureContainer[];
	powerBanks: StructurePowerBank[];
	// Single structures
	observer: StructureObserver | undefined;
	powerSpawn: StructurePowerSpawn | undefined;
	extractor: StructureExtractor | undefined;
	nuker: StructureNuker | undefined;
	repairables: Structure[];
	rechargeables: rechargeObjectType[];
	sources: Source[];
	mineral: Mineral | undefined;
	constructionSites: ConstructionSite[];
	// Used by movement library
	// _defaultMatrix: CostMatrix;
	// _directMatrix: CostMatrix;
	_creepMatrix: CostMatrix;
	// _priorityMatrices: { [priority: number]: CostMatrix };
	// _skMatrix: CostMatrix;
	_kitingMatrix: CostMatrix;
}

interface RoomPosition {
    print: string;
    printPlain: string;
    room: Room | undefined;
    name: string;
    coorName: string;
    isEdge: boolean;
    isVisible: boolean;
    rangeToEdge: number;
    roomCoords: Coord;
    neighbors: RoomPosition[];

    inRangeToPos(pos: RoomPosition, range: number): boolean;
    inRangeToXY(x:number, y: number, range: number): boolean;
    getRangeToYX(x:number, y: number): number;
    getPositionsAtRange(range: number, includesWalls?: boolean, includeEdges?: boolean): RoomPosition[];
    getPositionsInRange(range: number, includesWalls?: boolean, includeEdges?: boolean): RoomPosition[];
    getOffsetPos(dx:number, dy:number): RoomPosition;
    lookFor<T extends keyof AllLookAtTypes>(StructureTypes: T): Array<AllLookAtTypes[T]>;
    lookForStructure(structureType: StructureConstant): Structure | undefined;
    isWalkable(ignoreCreeps?: boolean):boolean;
    availableNeighbors(ignoreCreeps?: boolean): boolean;
    getPositionAtDirection(direction: DirectionConstant, range?: number): RoomPosition;
    getMultiRoomRangeTo(pos: RoomPosition):number;
    findClosestByLimitedRange<T>(objects: T[] | RoomPosition[], rangeLimit: number,
        opts?: {filter: any | string; }): T | undefined;
    findClosestByMultiRoomRange<T extends _HasRoomPosition>(objects: T[]): T | undefined;
    findClosestByRangeThenPath<T extends _HasRoomPosition>(objects: T[]): T | undefined;
}


interface Structure {
    isWalkable: boolean;
}

interface StructureContainer {
	energy: number;
	isFull: boolean;
	isEmpty: boolean;
}

interface StructureTower {
	isFull: boolean;
	isEmpty: boolean;
}

interface StructureSpawn {
	isFull: boolean;
	isEmpty: boolean;

	cost(bodyArray: string[]): number;
}

interface StructureController {
	reservedByMe: boolean;
	signedByMe: boolean;
	signedByScreeps: boolean;

	needsReserving(reserveBuffer: number): boolean;
}

interface StructureExtension {
	isFull: boolean;
	isEmpty: boolean;
}

interface StructureLink {
	isFull: boolean;
	isEmpty: boolean;
}

interface StructureStorage {
	energy: number;
	isFull: boolean;
	isEmpty: boolean;
}

interface StructureTerminal {
	energy: any;
	isFull: boolean;
	isEmpty: boolean;
}

interface Tombstone {
	energy: number;
}

interface String {
	padRight(length: number, char?: string): string;

	padLeft(length: number, char?: string): string;
}

interface Number {
	toPercent(decimals?: number): string;

	truncate(decimals: number): number;
}
