// `global` extension samples
declare var global: any;
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}

interface ICobal {
	unit: {[creepName:string]: any};
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

interface RoomCoord {
	x: number;
	y: number;
	xDir: string;
	yDir: string;
}

interface PathFinderGoal {
	pos: RoomPosition;
	range: number;
	cost?: number;
}

interface ProtoCreep {
	body: BodyPartConstant[];
	name: string;
	memory: any;
}

interface ProtoCreepOptions {
	assingment?: RoomObject;
	patternRepetitionLimit?: number;
}

interface ProtoRoomObject {
	ref: string;
	pos: ProtoPos;
}

interface ProtoPos {
	x: string;
	y: string;
	roomName: string;
}

interface HasPos {
	pos: RoomPosition;
}

interface HasRef {
	ref: string;
}

interface HasId {
	id: string;
}
