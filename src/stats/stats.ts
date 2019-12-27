import Mem from "memory/memory";
import { exponentialMovingAverage } from "utils/utils";

export default class Stats {
    static clean() {
        if(Game.time % 8 == 0){
            const protectedKeys = [
                'persistent',
            ];
            for(const key in Memory.stats){
                if(!protectedKeys.includes(key)){
                    delete Memory.stats[key];
                }
            }
        }
    }

    static log(key: string, value: number | {[key:string]: number}|undefined, truncateNumbers = true): void {
        if(Game.time % 8 == 0) {
            if(truncateNumbers && value != undefined){
                const decimals = 5;
                if(typeof value == 'number'){
                    value = value.truncate(decimals);
                } else {
                    for(const i in value){
                        value[i] = value[i].truncate(decimals);
                    }
                }
            }
            Mem.setDeep(Memory.stats, key, value);
        }
    }

    static run() {
        if (Game.time % 8 == 0) {
			// Record IVM heap statistics
			Memory.stats['cpu.heapStatistics'] = (<any>Game.cpu).getHeapStatistics();
			// Log GCL
			this.log('gcl.progress', Game.gcl.progress);
			this.log('gcl.progressTotal', Game.gcl.progressTotal);
			this.log('gcl.level', Game.gcl.level);
			// Log memory usage
			this.log('memory.used', RawMemory.get().length);
			// Log CPU
			this.log('cpu.limit', Game.cpu.limit);
			this.log('cpu.bucket', Game.cpu.bucket);
		}
		const used = Game.cpu.getUsed();
		this.log('cpu.getUsed', used);
		Memory.stats.persistent.avgCPU = exponentialMovingAverage(used, Memory.stats.persistent.avgCPU, 100);
    }
}
