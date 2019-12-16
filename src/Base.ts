import Mem from "memory/memory";

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
        level: 0,
        tick: -Infinity
    },
    expansionData: {
        possibleExpansions: {},
        expiration: 0,
    }
}
export class Base {
    id: number;
    name: string;
    ref: string;
    memory: BaseMemory;
   constructor(id: number, roomName:string, outposts: string[]) {
       this.id = id;
       this.name = roomName;
       this.ref = roomName;
       this.memory = Mem.wrap(Memory.bases, roomName, defaultBaseMemory, true)
       console.log(roomName);
   }
   build(): void {

   }
   refresh(): void {

   }

   init():void {

   }

   run():void {

   }
}
