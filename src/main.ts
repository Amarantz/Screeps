import { ErrorMapper } from "utils/ErrorMapper";
import roleHarvester, { Harvester }  from 'creeps/role.harvester';
import Memory from 'memory/memory';
import roleUpgrader, { Upgrader } from "creeps/role.upgrader";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const harvestersMax: number = 2;
const gathersMax: number = 2;
const upgradersMax: number = 2;

export const loop = ErrorMapper.wrapLoop(() => {
    const harvesters:Creep[]|undefined = _.reduce(Game.creeps, (acc:Creep[], creep:Creep):Creep[] => {
        if(creep.memory.role === 'harvester'){
            return [...acc, creep];
        }
        return acc;
    },[]);
    const gathers:any[]|undefined = _.reduce(Game.creeps, (acc:Creep[], creep:Creep):any[] => {
        if(creep.memory.role === 'gather'){
            return [...acc, creep];
        }
        return acc;
    },[]);
    const upgraders:any[]|undefined = _.reduce(Game.creeps, (acc:Creep[], creep:Creep):any[] => {
        if(creep.memory.role === 'upgrader'){
            return [...acc, creep];
        }
        return acc;
    },[]);
    _.forEach(Game.creeps, (creep:Creep) => {
        if(creep.memory.role === 'harvester'){
            roleHarvester.run(creep);
        }
        if(creep.memory.role === 'upgrader') {
            roleUpgrader.run(creep as Upgrader)
        }
    });
    if (typeof harvesters === 'undefined' || Object.keys(harvesters).length <= harvestersMax) {
        _.forEach(Game.spawns, (spawn:StructureSpawn) => {
            Game.spawns[spawn.name].spawnCreep([MOVE, WORK, WORK], 'harvester_' + Math.floor(Math.random()* 1000), {
                memory: { role: 'harvester' },
            });
        });
    } else if (typeof harvesters !== 'undefined' && (typeof upgraders === 'undefined' || Object.keys(upgraders).length <= upgradersMax)) {
        _.forEach(Game.spawns, (spawn:StructureSpawn) => {
            Game.spawns[spawn.name].spawnCreep([MOVE, MOVE, CARRY], 'upgrader_' + Math.floor(Math.random()* 1000), {
                memory: { role: 'upgrader' },
            });
        });
    }

    console.log(Object.keys(harvesters).length, Object.keys(upgraders).length, Object.keys(gathers).length);
});
