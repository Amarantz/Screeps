export interface Harvester extends Creep{
    memory: HavesterMemory;
}

interface HavesterMemory extends CreepMemory {
    role: 'harvester',
}
const roleHarvester = {
    run(creep: Creep):void {
        const target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
        if(target) {
            if(creep.harvest(target) == ERR_NOT_IN_RANGE){
                creep.moveTo(target);
            }
        }
    },
}

export default roleHarvester;
