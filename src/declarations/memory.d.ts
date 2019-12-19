// memory extension samples
interface RawMemory {
    _parsed: any;
}
interface CreepMemory {
    _go?: MoveData;
    [_MEM.BASE]?: string;
    [_MEM.COMMANDER]?: string;
    role: string;
    data?: {
        origin: string
    }
    source?: string;
    target?: string | undefined;
	debug?: boolean;
	task?: ProtoTask | undefined | null;
}
interface MoveData {
	state: any[];
	path: string;
	roomVisibility: { [roomName: string]: boolean };
	delay?: number;
	fleeWait?: number;
	destination?: ProtoPos;
	priority?: number;
	waypoints?: string[];
	waypointsVisited?: string[];
	portaling?: boolean;
}

interface Memory {
    Cobal: {},
    forman: any;
    bases: {[name:string]: any};
    creeps: {[name:string]: CreepMemory};
    flags: {[name:string]: FlagMemory};
    resetBucket?: boolean;
    haltTick?: number;
    rooms: {[roomName: string]: RoomMemory};
    spawns: {[name:string]: SpawnMemory};
    stats: any;
    constructionSites: {[id:string]: number};
    [otherProperty:string]: any;
}

interface LoggerMemory {
	level: number;
	showSource: boolean;
	showTick: boolean;
}

interface PathingMemory {
	paths: { [originName: string]: { [destinationName: string]: CachedPath; } };
	distances: { [pos1Name: string]: { [pos2Name: string]: number; } };
	weightedDistances: { [pos1Name: string]: { [pos2Name: string]: number; } };
}


interface CachedPath {
	path: RoomPosition[];
	length: number;
	tick: number;
}

declare const enum _MEM {
    TICK = 'T',
    EXPIRATION = 'X',
    BASE = 'B',
    COMMANDER = 'C',
    DISTANCE = 'D',
    OVERLORD = "OVERLORD"
}
declare const enum _RM {
    AVOID = 'a',
    SOURCES = 's',
    CONTROLLER = 'c',
    MINERAL = 'm',
    SKLAIRS = 'k',
    EXPANSION_DATA = 'e',
    INVASION_DATA = 'v',
    HARVEST = 'h',
    CASUALTIES = 'd',
    SAFETY = 'f',
    PREV_POSITIONS = 'p',
    CREEPS_IN_ROOM = 'cr',
    IMPORTANT_STRUCTURES = 'i',
    PORTALS = 'pr',
}

declare const enum _RM_IS {
	TOWERS   = 't',
	SPAWNS   = 'sp',
	STORAGE  = 's',
	TERMINAL = 'e',
	WALLS    = 'w',
	RAMPARTS = 'r',
}

declare const enum _RM_CTRL {
	LEVEL              = 'l',
	OWNER              = 'o',
	RESERVATION        = 'r',
	RES_USERNAME       = 'u',
	RES_TICKSTOEND     = 't',
	SAFEMODE           = 's',
	SAFEMODE_AVAILABLE = 'sa',
	SAFEMODE_COOLDOWN  = 'sc',
	PROGRESS           = 'p',
	PROGRESS_TOTAL     = 'pt',
}

declare const enum _RM_MNRL {
	MINERALTYPE = 't',
	DENSITY     = 'd',
}

declare const enum _ROLLING_STATS {
	AMOUNT  = 'a',
	AVG10K  = 'D',
	AVG100K = 'H',
	AVG1M   = 'M',
}

interface RollingStats {
	[_ROLLING_STATS.AMOUNT]: number;
	[_ROLLING_STATS.AVG10K]: number;
	[_ROLLING_STATS.AVG100K]: number;
	[_ROLLING_STATS.AVG1M]: number;
	[_MEM.TICK]: number;
}

interface ExpansionData {
	score: number;
	bunkerAnchor: string;
	outposts: { [roomName: string]: number };
}

interface RoomMemory {
	[_MEM.EXPIRATION]?: number;
	[_MEM.TICK]?: number;
	[_RM.AVOID]?: boolean;
	[_RM.SOURCES]?: SavedSource[];
	[_RM.CONTROLLER]?: SavedController | undefined;
	[_RM.PORTALS]?: SavedPortal[];
	[_RM.MINERAL]?: SavedMineral | undefined;
	[_RM.SKLAIRS]?: SavedRoomObject[];
	[_RM.IMPORTANT_STRUCTURES]?: {
		// Positions of important structures relevant to sieges
		[_RM_IS.TOWERS]: string[];
		[_RM_IS.SPAWNS]: string[];
		[_RM_IS.STORAGE]: string | undefined;
		[_RM_IS.TERMINAL]: string | undefined;
		[_RM_IS.WALLS]: string[];
		[_RM_IS.RAMPARTS]: string[];
	} | undefined;
	[_RM.EXPANSION_DATA]?: ExpansionData | false;
	[_RM.INVASION_DATA]?: {
		harvested: number;
		lastSeen: number;
	};
	[_RM.HARVEST]?: RollingStats;
	[_RM.CASUALTIES]?: {
		cost: RollingStats
	};
	[_RM.SAFETY]?: SafetyData;
	[_RM.PREV_POSITIONS]?: { [creepID: string]: ProtoPos };
	[_RM.CREEPS_IN_ROOM]?: { [tick: number]: string[] };
}


interface SavedRoomObject {
	c: string; 	// coordinate name
}

interface SavedSource extends SavedRoomObject {
	contnr: string | undefined;
}

interface SavedPortal extends SavedRoomObject {
	dest: string | { shard: string, room: string }; // destination name
	[_MEM.EXPIRATION]: number; // when portal will decay
}

interface SavedController extends SavedRoomObject {
	[_RM_CTRL.LEVEL]: number;
	[_RM_CTRL.OWNER]: string | undefined;
	[_RM_CTRL.RESERVATION]: {
		[_RM_CTRL.RES_USERNAME]: string,
		[_RM_CTRL.RES_TICKSTOEND]: number,
	} | undefined;
	[_RM_CTRL.SAFEMODE]: number | undefined;
	[_RM_CTRL.SAFEMODE_AVAILABLE]: number;
	[_RM_CTRL.SAFEMODE_COOLDOWN]: number | undefined;
	[_RM_CTRL.PROGRESS]: number | undefined;
	[_RM_CTRL.PROGRESS_TOTAL]: number | undefined;
}

interface SavedMineral extends SavedRoomObject {
	[_RM_MNRL.MINERALTYPE]: MineralConstant;
	[_RM_MNRL.DENSITY]: number;
}

interface SafetyData {
	safeFor: number;
	unsafeFor: number;
	safety1k: number;
	safety10k: number;
	tick: number;
}
