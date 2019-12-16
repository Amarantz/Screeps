let lastMemory: any;
let lastTime: number = 0;

const MAX_BUCKET = 10000;
const HEAP_CLEAN_FREQUENCY = 200;
const BUCKET_CLEAR_CACHE = 7000;
const BUCKET_CPU_HALT = 4000;

export default class Mem {

    static shouldRun(): boolean {
        let shouldRun: boolean = true;
        if (Game.cpu.bucket < 500) {
            if (Object.keys.length > 1 && !Memory.resetBucket && !Memory.haltTick){
                Memory.resetBucket = true;
                Memory.haltTick = Game.time + 1;
            }
            shouldRun = false;
        }
        if(Memory.resetBucket) {
            if( Game.cpu.bucket < MAX_BUCKET - Game.cpu.limit){
                shouldRun = false;
            } else {
                delete Memory.resetBucket;
            }
        }
        if(Memory.haltTick) {
            if(Memory.haltTick == Game.time) {
                (<any>Game.cpu).halt();
                shouldRun = false;
            } else if ( Memory.haltTick < Game.time) {
                delete Memory.haltTick;
            }
        }

        return shouldRun;
    }

    static clean() {
        Mem.cleanCreeps();
    }

    private static cleanCreeps(){
        // Automatically delete memory of missing creeps
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
            }
        }
    }

    static format() {
        this.formatDefaultMemory();

        if(!Memory.stats){
            Memory.stats = {};
        }

        if(!Memory.constructionSites){
            Memory.constructionSites = {};
        }
    }

    private static formatDefaultMemory() {
        if(!Memory.rooms) {
            Memory.rooms = {};
        }
        if(!Memory.creeps){
            Memory.creeps = {};
        }
        if(!Memory.flags) {
            Memory.flags = {};
        }
    }
}
