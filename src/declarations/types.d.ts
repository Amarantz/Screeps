// `global` extension samples
declare var global: any;
declare namespace NodeJS {
  interface Global {
	age?: number;
	Cobal: ICobal;
	_cache: IGlobalCache;
	Memory: Memory;
	print(...args: any[]): string;
	deref(ref: string): RoomObject | null;
	derefRoomPosition(protoPos: ProtoPos): RoomPosition;
	gc(quick?: boolean): void;
  }
}

interface IGlobalCache {
  accessed: {[key:string]: number};
  expirations: {[key:string]: number};
  structures: {[key:string]: Structure[]};
  numbers: {[key:string]: number};
  lists: {[key:string]: any[]};
  costMatrix: {[key:string]: CostMatrix};
  roomPostions: {[key:string]: RoomPosition | undefined };
  things: {[key:string]: undefined | HasID | HadID[]};
}

interface ICache {
	creepsByBase: {[baseName:string]: Creep[]},
	targets: {[ref:string]: string[]};
	outpostFlags: Flag[];
	build():void;
	refresh():void;
}

interface IGlobalCache {
	accessed: { [key: string]: number };
	expiration: { [key: string]: number };
	structures: { [key: string]: Structure[] };
	numbers: { [key: string]: number };
	lists: { [key: string]: any[] };
	costMatrices: { [key: string]: CostMatrix };
	roomPositions: { [key: string]: RoomPosition | undefined };
	things: { [key: string]: undefined | HasID | HasID[] };
}

interface ICobal {
    [x: string]: any;
	cache: ICache;
	shouldRebuild: boolean;
	expiration: number;
	unit: {[creepName:string]: any};
	bases: {[roomName:string]: any};

	init: () => void;
	refresh: () => void;
	build: () => void;
	run: () => void;
	postRun(): void;
}

interface IGeneral {
	notifier: INotifier;

	registerDirective(directive: any): void;

	removeDirective(directive: any): void;

	registerCommander(overlord: any): void;

	getCommandersForBase(colony: any): any[];

	isCommanderSuspended(overlord: any): boolean;

	suspendCommanderFor(overlord: any, ticks: number): void;

	suspendCommanderUntil(overlord: any, untilTick: number): void;

	init(): void;

	run(): void;

	getCreepReport(colony: any): string[][];

}

declare let Cobal: ICobal;
declare let _cache: IGlobalCache;

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
    my: any;
    isActive(): boolean;
    ref: any;
	id: string;
}
