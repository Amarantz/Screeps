// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  role: string;
}

interface Memory {
  bases: { [name: string]: any};
  creeps: {[name:string]:CreepMemory};
  resetBucket?: boolean;
  haltTick?: number;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}


interface StatsMemory {
	cpu: {
		getUsed: number;
		limit: number;
		bucket: number;
		usage: {
			[colonyName: string]: {
				init: number;
				run: number;
				visuals: number;
			}
		}
	};
	gcl: {
		progress: number;
		progressTotal: number;
		level: number;
  };
}