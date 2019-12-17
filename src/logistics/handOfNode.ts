interface HandOfNodMemory {
    bases: string[];
    distances: {[baseName:string]: number};
    routes: {[baseName:string]: {[roomName:string]: boolean}};
    expiration: number;
}

const HandOfNodMemoryDefault:HandOfNodMemory = {
    bases: [],
    distances: {},
    routes: {},
    expiration: 0,
}

const MAX_LINEAR_DISTANCE = 10;
const MAX_PATH_DISTANCE = 600;
const DEFAULT_RECACHE_TIME = 1000 ; // modify for public server later

const defaultSettings = {
    MaxPathDistance: 400,
    requiredRCL: 7,
    flexibleEnerage: true,
}
