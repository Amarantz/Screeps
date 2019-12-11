import Default from './defaults';

export default class upgrader extends Default {
    static run(creep:Creep) {
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
        } else if(creep.room.controller){
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE){
                creep.moveTo(creep.room.controller);
            }
        }
    }
}
