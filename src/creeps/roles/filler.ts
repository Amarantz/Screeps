import Defaults from './defaults';

export default class Filler extends Defaults{
    static run(creep:Creep){
        if(!creep.memory.target && creep.store.getUsedCapacity() === 0){
            this.findResource(creep, RESOURCE_ENERGY);
        } else if (creep.memory.target){
            const resourceTarget:Resource|null|undefined = Game.getObjectById(creep.memory.target);
            if(resourceTarget && creep.pickup(resourceTarget) == ERR_NOT_IN_RANGE){
                creep.moveTo(resourceTarget);
            }
            if(creep.store.getFreeCapacity() === 0 || !resourceTarget){
                delete creep.memory.target;
            }
        } else {
            const emptyStorage = creep.room.find(FIND_STRUCTURES, {
                filter: (struc) => (
                    (struc.structureType == STRUCTURE_EXTENSION || struc.structureType == STRUCTURE_SPAWN) && struc.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                ),
            })
            if(emptyStorage.length > 0){
                if(creep.transfer(emptyStorage[0],RESOURCE_ENERGY) == ERR_NOT_IN_RANGE){
                    creep.moveTo(emptyStorage[0]);
                }
            }
        }
    }
}
