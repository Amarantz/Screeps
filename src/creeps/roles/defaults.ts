export default class Default {
    static findResource(creep:Creep, resource:ResourceConstant){
        const resources = creep.room.find(FIND_DROPPED_RESOURCES);
        creep.memory.target = resources[0] && resources[0].id || '';
    }
}
