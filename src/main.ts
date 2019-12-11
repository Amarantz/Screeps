import Mem from "memory/memory";
import Havester from "creeps/roles/havester";
import Upgrader from "creeps/roles/upgrader";
import Worker from "creeps/roles/worker";

const maxHavesters = 2;
const maxUpgraders = 4;
const maxBuilders = 1;
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = () => {
    Mem.clean();
    const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'havester');
    const upgrader  = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader');
    const transport = _.filter(Game.creeps, (creep) => creep.memory.role === 'transporter');
    const builder:Creep[]|undefined|null = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder');
    for(const name in Game.creeps){
        const creep = Game.creeps[name];
        if(creep.memory.role == 'havester'){
            Havester.run(creep);
        }
        if(creep.memory.role === 'upgrader'){
            Upgrader.run(creep);
        }
        if(creep.memory.role === 'transport'){

        }
        if(creep.memory.role === 'builder') {
            Worker.run(creep);
        }
    }
    const spawns = _.filter(Game.spawns, spawn => !spawn.spawning);

    if(!harvesters || harvesters.length < maxHavesters){
        let name = 'Havester' + Game.time;
        const body = [WORK,WORK,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(Game.spawns[spawns[0].name].energy >= bodyCost){
            console.log('Spawning new havester: ', name);
            Game.spawns[spawns[0].name].spawnCreep([WORK,WORK,MOVE], name, {memory: {role: 'havester'}});
        }
    }

    if(!upgrader || upgrader.length < maxUpgraders){
        let name = 'upgrader' + Game.time;
        const body = [WORK,CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(Game.spawns[spawns[0].name].energy >= bodyCost){
            console.log('Spawning new upgrader: ', name);
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'upgrader'}});
        }
    }

    if(!builder) {
        const constructrions = Game.spawns[spawns[0].name].room.find(FIND_MY_CONSTRUCTION_SITES);
        if(constructrions && constructrions.length > 0 && (!builder || builder.length < maxBuilders)){
            const name = 'builder' + Game.time;
            const body = [WORK,CARRY,CARRY,MOVE,MOVE];
            const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
            if(Game.spawns[spawns[0].name].energy > bodyCost){
                console.log('Spawning new upgrader: ', name);
                Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'builder'}});
            }
        }
    }
};
