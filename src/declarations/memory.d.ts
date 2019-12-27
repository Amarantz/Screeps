interface RawMemory {
    _parsed: any;
}

interface CreepMemory {
    talkative?: boolean;
    debug?: boolean;
    _go?: any;
    [_MEM.BASE]?: string;
    [_MEM.COMMANDER]?: string;
    role: string;
    source?: string;
    target?: string;
    task?: ProtoTask;
    [resource:name]: any;
}

interface Memory {
    creeps: {[creepName:string]: CreepMemory};
    flags: {[flagName:string]: FlagMemory};
    constructionSites: {[id:string]: number}
    resetBucket?: boolean;
    haltTick?: number;
    Cobal: {};
    General: any;
    rooms: {[name: string]: RoomMemory};
    spawns: {[name: string]: SpawnMemory};
    stats: any;
    settings: {
        signature: string;
        log: LoggerMemory;
    }
    pathing: PathingMemory;
    [otherProperty:string]: any;
}

interface PathingMemory {
	paths: { [originName: string]: { [destinationName: string]: CachedPath; } };
	distances: { [pos1Name: string]: { [pos2Name: string]: number; } };
	weightedDistances: { [pos1Name: string]: { [pos2Name: string]: number; } };
}

interface FlagMemory {
	[_MEM.TICK]?: number;
	[_MEM.EXPIRATION]?: number;
	[_MEM.BASE]?: string;
	suspendUntil?: number;
	amount?: number;
	persistent?: boolean;
	setPosition?: ProtoPos;
	rotation?: number;
	parent?: string;
	maxPathLength?: number;
	maxLinearRange?: number;
	keepStorageStructures?: boolean;
	keepRoads?: boolean;
	keepContainers?: boolean;
	waypoints?: string[];
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

interface statsMemory {
    cpu: {
        getUsed: number;
        limit: number;
        bucket: number;
        usage: {
            [baseName:string]: {
                init: number;
                run: number;
            }
        }
    };
    gcl: {
        progress: number;
        progressTotal: number;
        level: number;
    }
    bases: {
        [baseName: string]: {
            handOfNod: {
                uptime: number;
            }
            miningSite: {
                usage: number;
                downtime: number;
            }
            storage: {
                energ: number;
            }
            rcl: {
                level: number,
                progress: number,
                progressTotal: number,
            }
        }
    }
}

interface LoggerMemory {
    level: number;
    showSource: boolean;
    showTick: boolean;
}

declare const enum _MEM {
    TICK = 'T',
    EXPIRATION = 'X',
    BASE = 'B',
    COMMANDER = 'C',
    DISTANCE = 'D',
}

declare const enum _RM {
    AVOID = 'a',
    SOURCES = 's',
    CONSTROLLER = 'c',
    MINERAL = 'm',
    SKLAIRS = 'k',
    EXPANTION_DATA = 'e',
    INVASION_DATA = 'v',
    HARVEST = 'h',
    CASUALTIES = 'd',
    SAFETY = 'f',
    PREV_POSITIONS = 'p',
    CREEPS_IN_ROOM = 'cr',
    IMPORTANT_STRUCTUES = 'i',
    PORTALS = 'pr',
}

declare const enum _RM_IS {
    TOWERS = 't',
    SPAWNS = 'sp',
    STORAGE = 's',
    TERMINAL = 'e',
    WALLS = 'w',
    RAMPARTS = 'r',
}

declare const enum _RM_CTRL {
    LEVEL = 'l',
    OWNER = 'o',
    RESERVATION = 'r',
    RES_USERNAME = 'u',
    RES_TICKTOEND = 't',
    SAFEMOD = 's',
    SAFEMODE = 'AVAILABLE' = 'sa',
    SAFEMOD_COOLDOWN = 'sc',
    PROGRESS = 'p',
    PROGRESS_TOTAL = 'pt',
}

declare const enum _RM_MNRL {
    MINERALTYPE = 't',
    DENSITY = 'd',
}

declare const enum _ROLLING_STATS {
    AMOUNT = 'a',
    AVG10K = 'D',
    AVG100k = 'H',
    AVG1M = 'M'
}

interface CachedPath {
	path: RoomPosition[];
	length: number;
	tick: number;
}

interface ExpantionData {
    score: number;
    bunkerAncor: string;
    outposts: {[roomName:string]: number};
}

interface RollingStats {
    [_ROLLING_STATS.AMOUNT]: number;
    [_ROLLING_STATS.AVG10K]: number;
    [_ROLLING_STATS.AVG100K]: number;
    [_ROLLING_STATS.AVG1M]: number;
    [_MEM.TICK]: number;
}

interface RoomMemory {
    [_MEM.EXPIRATION]?: number;
    [_MEM.TICK]?: number;
    [_RM.AVOID]?: boolean;
    [_RM.SOURCES]?: SavedSource[];
    [_RM.CONSTROLLER]?: SavedController | undefined;
    [_RM.PORTALS]?: SavedPortals[];
    [_RM.MINERAL]?: SavedMineral | undefined;
    [_RM.SKLAIRS]?: SavedRoomObject[];
    [_RM.IMPORTANT_STRUCTUES]?: {
        [_RM_IS.TOWERS]: string[];
        [_RM_IS.SPAWNS]: string[];
        [_RM_IS.STORAGE]: string | undefined;
        [_RM_IS.TERMINAL]: string | undefined;
        [_RM_IS.WALLS]: string[];
        [_RM_IS.RAMPARTS]: string;
    } | undefined;
    [_RM.EXPANTION_DATA]?: ExpantionData | false;
    [_RM.INVASION_DATA]?: {
        harvested: number;
        lastSeen: number;
    };
    [_RM.HARVEST]?: RollingStats;
    [_RM.CASUALTIES]?: {
        cost: RollingStats
    };
    [_RM.SAFETY]?: SafetyData;
    [_RM.PREV_POSITIONS]?: {[creepId:string]: ProtoPos};
    [_RM.CREEPS_IN_ROOM]?: {[tick: number]: string[]};
}

interface SavedRoomObject {
    c: string;
}

interface SavedSource extends SavedRoomObject {
    contnr: string | undefined;
}

interface SavedPortal extends SavedRoomObject {
    dest: string | {shard: string, room: string};
    [_MEM.EXPIRATION]: number;
}

interface SavedController extends SavedRoomObject {
    [_RM_CTRL.LEVEl]: number;
    [_RM_CTRL.OWNER]: string | undefined;
    [_RM_CTRL.RESERVATION]: {
        [_RM_CTRL.RES_USERNAME]: string,
        [_RM_CTRL.RES_TICKTOEND]: string,
    } | undefined;
    [_RM_CTRL.SAFEMODE]:number|undefined;
    [_RM_CTRL.SAFEMODE_AVAILABLE]: number;
    [_RM_CTRL.SAFEMODE_COOLDOWN]: number |undefined;
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
