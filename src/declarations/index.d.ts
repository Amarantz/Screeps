declare var global: any;

declare namespace NodeJS {
    interface Global {
        age?: number;
        _cache: IGlobalCache;
        Cobal: ICobal;
        print(...args: any[]): string;
        deref(ref:strin): RoomObject | undefined;
        derefRoomPosition(protoPos: ProtoPos): RoomPosition;
        gc(quick?: boolean): void;
    }
}

interface Creep {
    boostCounts: { [boostType: string]: number; };
    memory: CreepMemory;
}

interface ICobal {
    shouldBuild: boolean;
    expiration: number;
    general: IGeneral;
    units:{[creepName:string]: any};
    bases:{[baseName:string]: any};
    directives:{[directiveName:string]: any};
    commanders:{[commanderName:string]:any};
    spawnGroups: {[ref:string]:any};
    baseMap: {[roomName:string]: string};
    cache: ICache;
    memory: ICobalMemory;
    expections: Error[];
    tradeNetwork: ITradeNetwork;
    terminalNetwork :ITerminalNetwork;
    build(): void;
    init(): void;
    run(): void;
    refresh(): void;
    postRun(): void;
}

interface TerminalState {
	name: string;
	type: 'in' | 'out' | 'in/out';
	amounts: { [resourceType: string]: number };
	tolerance: number;
}


interface ITerminalNetwork {
	allTerminals: StructureTerminal[];
	readyTerminals: StructureTerminal[];
	// terminals: StructureTerminal[];
	memory: any;

	refresh(): void;

	requestResource(terminal: StructureTerminal, resourceType: ResourceConstant, amount: number): void;

	registerTerminalState(terminal: StructureTerminal, state: TerminalState): void;

	init(): void;

	run(): void;
}

interface ITradeNetwork {
	memory: any;

	refresh(): void;

	priceOf(mineralType: ResourceConstant): number;

	lookForGoodDeals(terminal: StructureTerminal, mineral: string, margin?: number): void;

	sellDirectly(terminal: StructureTerminal, resource: ResourceConstant, amount?: number,
				 flexibleAmount?: boolean): number | undefined;

	sell(terminal: StructureTerminal, resource: ResourceConstant, amount: number,
		 maxOrdersOfType?: number): number | undefined;

	buy(terminal: StructureTerminal, mineralType: ResourceConstant, amount: number): void;

	maintainBuyOrder(terminal: StructureTerminal, resource: ResourceConstant, amount: number,
					 maxOrdersOfType?: number): void;

	init(): void;

	run(): void;
}

interface ICobalMemory {
    ternimalNetwork: any;
}

interface IGeneral{
    notifier: INotifier;
    suspendCommanderUntil(commander: Commander, untilTicks: number): void;
    suspendCommanderFor(commander: Commander, ticks: number): void;
    isCommanderSuspended(commander: Commander): boolean;
    registerDirective(directive: Directive): void;
    removeDirective(directive: Directive): void;
    registerCommander(commander: Commander): void;
    getCommanderForBased(base: Base): Commander[];
    getCreepReport(colony: any): string[][];
    refresh(): void;
    build(): void;
    init(): void;
    run(): void;
    visuals(): void;
}

interface INotifier {
    alert(message: string, roomName: string, priority?: number): void;
    clear(): void;
    generateNotificationsList(links: boolean): string[];
    visuals(): void;
}

interface ICache{
    outpostFlags: Flag[];
    creepsByBase: {[baseName:string]: Creep[]};
    commanders: {[commanderName:string]: {[roleName:string]: strin[]}}
    targets: {[ref:string]: string[]};
    build(): void;
    refresh(): void;
}

interface IGlobalCache {
    access: {[key:string]: number};
    expiration: {[key:string]: number};
    structures: {[key:string]: Structure[]};
    numbers:{[key:string]: number};
    lists: {[key:string]: any[]};
    costMatrices: {[key: string]: CostMatrix};
    roomPositions: {[key: string]: RoomPosition | undefined};
    things: {[key:string]: undefined | HasID | HasID[]}
}

interface ProtoCreepOptions {
    assignment?: RoomObject;
    patternRepetitionLimit?: number;
}


declare var Cobal: ICobal;
declare var _cache: IGlobalCache;
declare function print(...args:any[]):void;

interface Coord {
    x: number;
    y: number;
}

interface PathFinderGoal {
	pos: RoomPosition;
	range: number;
	cost?: number;
}

interface RoomCoord {
    x: number;
    y: number;
    xDir:string;
    yDir:string;
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
    x:number;
    y:number;
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


interface TaskSettings {
	targetRange: number;
	workOffRoad: boolean;
	oneShot: boolean;
	timeout: number;
	blind: boolean;
}

interface TaskOptions {
	blind?: boolean;
	nextPos?: ProtoPos;
	// moveOptions?: MoveOptions;
}

interface TaskData {
	quiet?: boolean;
	resourceType?: string;
	amount?: number;

	[other: string]: any;
}

interface ProtoTask {
	name: string;
	_creep: {
		name: string;
	};
	_target: {
		ref: string;
		_pos: ProtoPos;
	};
	_parent: ProtoTask | null;
	tick: number;
	options: TaskOptions;
	data: TaskData;
}


interface IExpansionPlanner {

	refresh(): void;

	init(): void;

	run(): void;

}
