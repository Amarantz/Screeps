import Defaults from './defaults';

export default class Worker extends Defaults {
    static run(creep:Creep) {
        if(!creep.memory.target && creep.store.getUsedCapacity() === 0){
            this.findResource(creep, RESOURCE_ENERGY);
        } else if (creep.memory.target){
            const resourceTarget:Resource|null|undefined = Game.getObjectById(creep.memory.target);
            if(resourceTarget && creep.pickup(resourceTarget) == ERR_NOT_IN_RANGE){
                creep.moveTo(resourceTarget);
            }
            if(creep.store.getFreeCapacity() === 0){
                delete creep.memory.target;
            }
        } else {
            const site = creep.room.find(FIND_MY_CONSTRUCTION_SITES)[0];
            if(creep.build(site) == ERR_NOT_IN_RANGE){
                creep.moveTo(site);
            }
        }
    }
}
