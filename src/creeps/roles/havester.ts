
export default class Havester {
    static run(creep:Creep) {
        if(!creep.memory.source) {
            const targets = creep.room.find(FIND_SOURCES);
            creep.memory.source = targets[0].id;
        }
        const target: Source | null | undefined = Game.getObjectById(creep.memory.source)
        // console.log(creep.name, creep.harvest(Game.getObjectById(creep.memory.source)))
        if(target && creep.harvest(target) == ERR_NOT_IN_RANGE){
            creep.moveTo(target);
        }
    }
}
