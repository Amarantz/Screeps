import { Component } from "./_componet";
import { Base } from "Base";

const ERR_ROOM_ENERGY_CAPACITY_NOT_ENOUGH = -20;
const ERR_SPECIFIED_SPAWN_BUSY = -21;

export interface SpawnRequest {
    //@ts-ignore
	setup: CreepSetup;					// creep body generator to use
	// overlord: Overlord;					// overlord requesting the creep
    priority: number;					// priority of the request // TODO: WIP
    //@ts-ignore
	partners?: CreepSetup[];			// partners to spawn along with the creep
	options?: SpawnRequestOptions;		// options
}

export interface SpawnRequestOptions {
	spawn?: StructureSpawn;				// allows you to specify which spawn to use; only use for high priority
	directions?: DirectionConstant[];	// StructureSpawn.spawning.directions
}

interface SpawnOrder {
	protoCreep: ProtoCreep;
	options: SpawnOptions | undefined;
}

export interface HandOfNodMemory {
	stats: {
		commander: number;
		uptime: number;
		longUptime: number;
	};
}

const HatcheryMemoryDefaults: HandOfNodMemory = {
	stats: {
		commander  : 0,
		uptime    : 0,
		longUptime: 0,
	}
};

export class HandOfNod extends Component {
    constructor(base: Base, headSpawn: StructureSpawn){
        super(base, headSpawn, 'hand_of_nod');
    }
    refresh(): void {
        throw new Error("Method not implemented.");
    }
    spawnCommander(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        throw new Error("Method not implemented.");
    }
    run(): void {
        throw new Error("Method not implemented.");
    }
}
