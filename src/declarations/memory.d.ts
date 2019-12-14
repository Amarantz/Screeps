type operationMode = 'manual' | 'semi' | 'auto';

// memory extension samples
interface CreepMemory {
    role: string;
    source?: string;
    target?: string | undefined;
    debug: boolean;
}

interface Memory {
    creeps: {[name:string]:CreepMemory};
    flags: {[name:string]: FlagMemory};
}
