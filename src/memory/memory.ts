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
            if (Object.keys(Game.spawns).length > 1 && !Memory.resetBucket && !Memory.haltTick){
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

    static load() {
        if(lastTime && lastMemory && Game.time == lastTime + 1) {
            delete global.Memory;
            global.Memory = lastMemory;
            RawMemory._parsed = lastMemory;
        } else {
			// noinspection BadExpressionStatementJS
			/* tslint:disable:no-unused-expression */
			Memory.rooms; // forces parsing
			/* tslint:enable:no-unused-expression */
			lastMemory = RawMemory._parsed;
			Memory.stats.persistent.lastMemoryReset = Game.time;
        }

        lastTime = Game.time;
        if(!global.age) {
            global.age = 0;
        }
        global.age++;
        Memory.stats.persistent.globalAge = global.age;
    }

    static garbageCollect(quick?: boolean){
        if(global.gc) {
            const start = Game.cpu.getUsed();
            global.gc(quick);
        }
    }

    static clean() {
        Mem.cleanCreeps();
        Mem.cleanFlags();
        Mem.cleanBases();
        Mem.cleanConstructionSites();
    }

    static wrap(memory: any, memName:string, defaults = {}, deep = false) {
        if(!memory[memName]){
            memory[memName] = _.clone(defaults);
        }
        if(deep) {
            _.defaultsDeep(memory[memName], defaults);
        } else {
            _.defaults(memory[memName], defaults);
        }
        return memory[memName];
    }

    private static cleanCreeps(){
        // Automatically delete memory of missing creeps
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
            }
        }
    }

    private static cleanFlags() {
        Object.keys(Memory.flags).forEach(name => {
            if(!Game.flags[name]){
                delete Memory.flags[name];
                delete global[name];
            }
        })
    }

    private static cleanBases(){
        for( const name in Memory.bases){
            const room = Game.rooms[name];
            if(!(room && room.my)){
                if(!Memory.bases[name].persistent) {
                    delete Memory.bases[name];
                    delete global[name];
                    delete global[name.toLowerCase()];
                }
            }
        }
    }

    private static cleanConstructionSites(){
        if(Game.time % 10 == 0) {
            const CONSTRUCTION_SITE_TIMEOUT = 50000;
            Object.keys(Game.constructionSites).forEach((id) => {
                const site = Game.constructionSites[id];
                if(!Memory.constructionSites[id]){
                    Memory.constructionSites[id] = Game.time;
                } else if (Game.time - Memory.constructionSites[id] > CONSTRUCTION_SITE_TIMEOUT){
                    site.remove();
                }

                if(site && site.pos.isVisible && site.pos.lookForStructure(site.structureType)){
                    site.remove();
                }
            })

            Object.keys(Memory.constructionSites).forEach(id => {
                if(!Game.constructionSites[id]){
                    delete Memory.constructionSites[id];
                }
            })
        }
    }

    static format() {
        this.formatDefaultMemory();
        this.formatCobalMemory();

        if(!Memory.settings){
            Memory.settings = {} as any;
        }
        if(!Memory.stats){
            Memory.stats = {};
        }
        if(!Memory.stats.persistent){
            Memory.stats.persistent = {};
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

    private static formatCobalMemory() {
        if(!Memory.Cobal){
            Memory.Cobal = {};
        }

        if(!Memory.bases) {
            Memory.bases = {}
        }
    }
}
