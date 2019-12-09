let lastMemory: any;
let lastTime: number = 0;

const MAX_BUCKET = 10000;
const HEAP_CLEAN_FREQUENCY = 200;
const BUCKET_CLEAR_CACHE = 7000;
const BUCKET_CPU_HALT = 4000;

export default class Mem {
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
}
