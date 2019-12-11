import Mem from "memory/memory";
import Havester from "creeps/roles/havester";
import Upgrader from "creeps/roles/upgrader";
import Worker from "creeps/roles/worker";
import Filler from "creeps/roles/filler";

const maxHavesters = 2;
const maxUpgraders = 4;
const maxBuilders = 2;
const maxTransporters = 2;
const maxFillers = 2;
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = () => {
    Mem.clean();

    const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'havester');
    const upgrader  = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader');
    const transport = _.filter(Game.creeps, (creep) => creep.memory.role === 'transporter');
    const filler = _.filter(Game.creeps, (creep) => creep.memory.role === 'filler');
    const builders = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder');

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
        if(creep.memory.role === 'filler') {
            Filler.run(creep);
        }
    }
    const spawns = _.filter(Game.spawns, spawn => !spawn.spawning);

    if(!harvesters || harvesters.length < maxHavesters){
        let name = 'Havester' + Game.time;
        const body = [WORK,WORK,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep([WORK,WORK,MOVE], name, {memory: {role: 'havester'}});
        }
    }

    if(harvesters.length && (!upgrader || upgrader.length < maxUpgraders)){
        let name = 'upgrader' + Game.time;
        const body = [WORK,CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'upgrader'}});
        }
    }
    if(harvesters.length && (!transport || transport.length < maxTransporters)){

    }
    if(harvesters.length && (!filler || filler.length < maxFillers)) {
        const name = 'Filler' + Game.time;
        const body = [CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part) => BODYPART_COST[part]));
        if(Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'filler'}});
        }
    }
    
    const constructionsites = Game.spawns[spawns[0].name].room.find(FIND_CONSTRUCTION_SITES);
    if(harvesters.length && ((!builders || builders.length < maxBuilders) && constructionsites.length > 0)) {
        const name = 'builder' + Game.time;
        const body = [WORK,CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'builder'}});
        }
    }
};
