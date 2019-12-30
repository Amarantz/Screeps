import './prototypes/Creep';
import './prototypes/miscellaneous';
import './prototypes/Room';
import './prototypes/RoomObject';
import './prototypes/RoomPosition';
import './prototypes/RoomStructures';
import './prototypes/Structures';

import Havester from "./creeps/roles/havester";
import Upgrader from "./creeps/roles/upgrader";
import Worker from "./creeps/roles/worker";
import Filler from "./creeps/roles/filler";
import Transporter from "./creeps/roles/transport";
import Mem from "./memory/memory";
import Cobal from "./Cobal";
import Stats from './stats/stats';

const maxHavesters = 2;
const maxUpgraders = 4;
const maxBuilders = 2;
const maxTransporters = 2;
const maxFillers = 2;
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const main = () => {
    const creepsByRoles = _.groupBy(Game.creeps, (creep) => creep.memory.role);
    const { havester, upgrader, transporter, filler, builder } = creepsByRoles

    for(const name in Game.creeps){
        const creep = Game.creeps[name];
        if(creep.memory.role == 'havester'){
            Havester.run(creep);
        }
        if(creep.memory.role === 'upgrader'){
            Upgrader.run(creep);
        }
        if(creep.memory.role === 'transporter'){
            Transporter.run(creep);
        }
        if(creep.memory.role === 'builder') {
            Worker.run(creep);
        }
        if(creep.memory.role === 'filler') {
            Filler.run(creep);
        }
    }
    const spawns = _.filter(Game.spawns, spawn => !spawn.spawning);

    if(!havester || havester.length < maxHavesters){
        let name = 'Havester' + Game.time;
        const body = [WORK,WORK,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(spawns[0] && spawns[0].name && Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep([WORK,WORK,MOVE], name, {memory: {role: 'havester'}});
        }
    }

    if(havester && havester.length && (!upgrader || upgrader.length < maxUpgraders)){
        let name = 'Upgrader' + Game.time;
        const body = [WORK,CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(spawns[0] && spawns[0].name && Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'upgrader'}});
        }
    }
    if(havester && havester.length && (!filler || filler.length < maxFillers)){
        const name = 'Filler' + Game.time;
        const body = [CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part) => BODYPART_COST[part]));
        if(spawns[0] && spawns[0].name && Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'filler'}});
        }
    }
    if(havester && havester.length && (!transporter || transporter.length < maxTransporters)) {
        const name = 'Transporter' + Game.time;
        const body = [CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part) => BODYPART_COST[part]));
        if(spawns[0] && spawns[0].name && Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'transporter'}});
        }
    }

    const constructionsites = spawns[0] && spawns[0].name && Game.spawns[spawns[0].name].room.find(FIND_CONSTRUCTION_SITES) || [];
    if(havester && havester.length && ((!builder || builder.length < maxBuilders) && constructionsites.length > 0)) {
        const name = 'Builder' + Game.time;
        const body = [WORK,CARRY,CARRY,MOVE,MOVE];
        const bodyCost = _.sum(body.map((part)=> BODYPART_COST[part]));
        if(spawns[0] && spawns[0].name && Game.spawns[spawns[0].name].energy >= bodyCost && !Game.spawns[spawns[0].name].spawning){
            Game.spawns[spawns[0].name].spawnCreep(body, name, {memory: {role: 'builder'}});
        }
    }
};

export const loop = () => {
    Mem.load();
    if(!Mem.shouldRun()) return;
    Mem.clean();
    // main();

    cobal_loop();
    Stats.run()
    global.Cobal && global.Cobal.postRun();
}

const cobal_loop = () => {
    if(!global.Cobal || global.Cobal.shouldBuild || Game.time >= global.Cobal.expiration){
        delete global.Cobal;
        Mem.garbageCollect(true);
        global.Cobal = new Cobal();
        global.Cobal.build();
    } else {
        global.Cobal.refresh();
    }

    global.Cobal.init();
    global.Cobal.run();
}

function onGobalReset() {
    Mem.format();
    Memory.stats.persistent.lastGlobalReset = Game.time;
    global.Cobal = new Cobal();
}

onGobalReset();
