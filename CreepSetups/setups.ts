import {CreepSetup} from './creepSetup';

export const Roles = {
    drone: 'drone',
    filler: 'filler',
    transport: 'transport',
    worker: 'worker',
    upgrader: 'upgrader',
}

export const Setups = {
    drone: {
        extractor: new CreepSetup(Roles.drone, {
            pattern: [WORK, WORK, CARRY, MOVE],
            sizeLimit: Infinity,
        }),
        types: {
            default: new CreepSetup(Roles.drone, {
                pattern  : [WORK, WORK, CARRY, MOVE],
                sizeLimit: 3,
            }),
            standard: new CreepSetup(Roles.drone, {
                pattern  : [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
				sizeLimit: 1,
            }),
            emergency: new CreepSetup(Roles.drone, {
                pattern  : [WORK, WORK, CARRY, MOVE],
				sizeLimit: 1,
            }),
            double: new CreepSetup(Roles.drone, {
                pattern  : [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
				sizeLimit: 2,
            }),
            sourceKeeper: new CreepSetup(Roles.drone, {
                pattern  : [WORK, WORK, CARRY, MOVE],
				sizeLimit: 5,
            }),
        }
    },
    filler: new CreepSetup(Roles.filler, {
		pattern  : [CARRY, CARRY, MOVE],
		sizeLimit: 1,
    }),
    transporters: {

		default: new CreepSetup(Roles.transport, {
			pattern  : [CARRY, CARRY, MOVE],
			sizeLimit: Infinity,
		}),

		early: new CreepSetup(Roles.transport, {
			pattern  : [CARRY, MOVE],
			sizeLimit: Infinity,
		}),

    },
    workers: {

		default: new CreepSetup(Roles.worker, {
			pattern  : [WORK, CARRY, MOVE],
			sizeLimit: Infinity,
		}),

		early: new CreepSetup(Roles.worker, {
			pattern  : [WORK, CARRY, MOVE, MOVE],
			sizeLimit: Infinity,
		}),

    },
    upgraders: {

		default: new CreepSetup(Roles.upgrader, {
			pattern  : [WORK, WORK, WORK, CARRY, MOVE],
			sizeLimit: Infinity,
		}),

		rcl8: new CreepSetup(Roles.upgrader, {
			pattern  : [WORK, WORK, WORK, CARRY, MOVE],
			sizeLimit: 5,
		}),

	}
}