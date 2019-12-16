// `global` extension samples
declare var global: any;
declare namespace NodeJS {
  interface Global {
	age?: number;
	Cobal: ICobal;
	Memory: Memory;
	print(...args: any[]): string;
	deref(ref: string): RoomObject | null;
	derefRoomPosition(protoPos: ProtoPos): RoomPosition;
	gc(quick?: boolean): void;
  }
}

interface ICache {
	creepsByBase: {[baseName:string]: Creep[]},
	targets: {[ref:string]: string[]};
	outpostFlags: Flag[];
	build():void;
	refresh():void;
}

interface ICobal {
	cache: ICache;
	shouldRebuild: boolean;
	expiration: number;
	unit: {[creepName:string]: any};

	init: () => void;
	refresh: () => void;
	build: () => void;
	run: () => void;
	postRun(): void;
}

declare let Cobal: ICobal;

declare function print(...args: any[]): void;

interface Coord {
	x: number;
	y: number;
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
	assignment?: RoomObject;
	patternRepetitionLimit?: number;
}

interface ProtoRoomObject {
	ref: string;
	pos: ProtoPos;
}

interface ProtoPos {
	x: number;
	y: number;
	roomName: string;
}

interface HasPos {
	pos: RoomPosition;
}

interface HasRef {
	ref: string;
}

interface HasID {
	id: string;
}
