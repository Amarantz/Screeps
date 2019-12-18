import {CreepSetup} from './CreepSetup';


export const Roles = {
    drone: 'drone',
    filler: 'filler',
    claim: 'engineer',
    MCV: 'MCV',
    manager: 'manager',
    queen: 'queen',
    scout:  'scout',
    transport: 'transport',
    worker: 'worker',
    upgrader: 'upgarder',
}

export const Setups = {
    drones: {
        extractor: new CreepSetup(Roles.drone, {
            pattern: [WORK,WORK,CARRY,MOVE],
            sizeLimit: Infinity
        }),
        miners: {
            default: new CreepSetup(Roles.drone, {
                pattern: [WORK,WORK,CARRY,MOVE],
                sizeLimit: 3,
            }),
            standard: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
                sizeLimit: 1,
            }),
            emergency: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, CARRY, MOVE],
                sizeLimit: 1,
            }),
            double: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
                sizeLimit: 2,
            }),
            sourceKeeper: new CreepSetup(Roles.drone, {
                pattern: [WORK, WORK, CARRY, MOVE],
                sizeLimit: 5,
            }),
        }
    },
    filler: new CreepSetup(Roles.filler, {
        pattern: [CARRY, CARRY, MOVE],
        sizeLimit: 1,
    }),
    engineers: {
        claim: new CreepSetup(Roles.claim, {
            pattern: [CLAIM, MOVE],
            sizeLimit: 1,
        }),
        reserve: new CreepSetup(Roles.claim, {
            pattern: [CLAIM, MOVE],
            sizeLimit: 4,
        }),
        controllerAttacker: new CreepSetup(Roles.claim, {
            pattern: [CLAIM, MOVE],
            sizeLimit: Infinity,
        }),
    },
    MCV: new CreepSetup(Roles.MCV, {
        pattern: [WORK, CARRY, MOVE, MOVE],
        sizeLimit: Infinity,
    }),
    managers: {
        default: new CreepSetup(Roles.manager, {
            patther: [CARRY, CARRY, CARRY, MOVE],
            sizeLimit: 3,
        }),
        twoPart: new CreepSetup(Roles.manager, {
			pattern  : [CARRY, CARRY, MOVE],
			sizeLimit: 8,
		}),
		stationary: new CreepSetup(Roles.manager, {
			pattern  : [CARRY, CARRY],
			sizeLimit: 8,
		}),
		stationary_work: new CreepSetup(Roles.manager, {
			pattern  : [WORK, WORK, WORK, WORK, CARRY, CARRY],
			sizeLimit: 8,
		}),
    },
    queens: {
        default: new CreepSetup(Roles.queen, {
			pattern  : [CARRY, CARRY, MOVE],
			sizeLimit: Infinity,
		}),
		early: new CreepSetup(Roles.queen, {
			pattern  : [CARRY, MOVE],
			sizeLimit: Infinity,
		}),
    },
    scout: new CreepSetup(Roles.scout, {
		pattern  : [MOVE],
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
