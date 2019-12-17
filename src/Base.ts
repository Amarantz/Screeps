import Mem from "memory/memory";
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

    }
    refresh(): void {

    }

    init():void {

    }

    run():void {

    }
}
