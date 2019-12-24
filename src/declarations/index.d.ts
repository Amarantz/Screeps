declare var global: any;

declare namespace NodeJS {
    interface Global {
        
    }
}

interface Creep {
    memory: CreepMemory;
}