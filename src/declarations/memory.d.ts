type operationMode = 'manual' | 'semi' | 'auto';

// memory extension samples
interface CreepMemory {
    role: string;
    source?: string;
    target?: string | undefined;
}

interface Memory {
bases: { [name: string]: any};
creeps: {[name:string]:CreepMemory};
flags: {[name:string]: FlagMemory};
rooms: {[name:string]: RoomMemory};
spawns: {[name:string]: SpawnMemory};
constructionSites: {[id:string]: number};
resetBucket?: boolean;
haltTick?: number;
settings: {
    log: LoggerMemory;
    };
[otherPRoperty: string]: any;
}


interface CreepMemory {
    role: string;
}

interface LoggerMemory {
    level:number;
    showSource: boolean;
    showTick: boolean;
}
