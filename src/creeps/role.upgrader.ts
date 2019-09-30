export interface Upgrader extends Creep {
    memory: UpgraderMemory,
}

interface UpgraderMemory extends CreepMemory {
    role: 'upgrader',
    upgrading: boolean,
}

const roleUpgrader = {
    run(creep: Upgrader) {
        if(creep.memory.upgrading && _.sum(creep.carry) > 0) {
            if(creep.room.controller){
                if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE){
                    creep.moveTo(creep.room.controller);
                }
            }
        } else if (_.sum(creep.carry) === 0) {
            creep.memory.upgrading = false;
        }
        if(!creep.memory.upgrading) {
            if(_.sum(creep.carry) === creep.carryCapacity){
                creep.memory.upgrading = true;
            }
            const resource = creep.room.find(FIND_DROPPED_RESOURCES);
            creep.pickup(resource[0]) == ERR_NOT_IN_RANGE && creep.moveTo(resource[0])
        }
    }
}

export default roleUpgrader;
