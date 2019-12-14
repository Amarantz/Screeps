import {alignedNewline, bullet} from './stringConstants';
import {Log} from '../console/log';

export const getAllBasesRooms = ():Room[] => (_.filter(_.values(Game.rooms), room => room.my));
export const printRoomName = (roomName:string):string => (`<a href="#!/room/${Game.shard.name}/${roomName}">${roomName}</a>`);
export const color = (str: string, color: string): string => (`<font color="${color}">${str}</font>`);

export const mod = (n: number, m: number):number => (((n % m) + m) % m);
export const getUsername = ():string => {
    for(const i in Game.rooms){
        const room = Game.rooms[i];
        if(room.controller && room.controller.my){
            return room.controller.owner.username;
        }
    }
    for(const i in Game.creeps){
        const creep = Game.creeps[i];
        if(creep.owner){
            return creep.owner.username;
        }
    }
    const message = 'Error: Could not deterimne username';
    console.log(message);
    return message;
}

export const hasJustSpawned = ():boolean => (
    _.keys(Cobal.bases).length == 1 && _.keys(Game.creeps).length == 0 && _.keys(Game.spawns).length == 1
);

export const onPublicsServer = ():boolean => (
    Game.shard.name.includes('shard')
);

interface ToColumnOpts {
    padChar: string;
    justify: boolean;
}

export function bulleted(text: string[], aligned = true, startWithNewLine = true): string {
	if (text.length == 0) {
		return '';
	}
	const prefix = (startWithNewLine ? (aligned ? alignedNewline : '\n') : '') + bullet;
	if (aligned) {
		return prefix + text.join(alignedNewline + bullet);
	} else {
		return prefix + text.join('\n' + bullet);
	}
}

/**
 * Create column-aligned text array from object with string key/values
 */
export function toColumns(obj: { [key: string]: string }, opts = {} as ToColumnOpts): string[] {
	_.defaults(opts, {
		padChar: ' ',	// Character to pad with, e.g. "." would be key........val
		justify: false 	// Right align values column?
	});

	const ret = [];
	const keyPadding = _.max(_.map(_.keys(obj), str => str.length)) + 1;
	const valPadding = _.max(_.mapValues(obj, str => str.length));

	for (const key in obj) {
		if (opts.justify) {
			ret.push(key.padRight(keyPadding, opts.padChar) + obj[key].padLeft(valPadding, opts.padChar));
		} else {
			ret.push(key.padRight(keyPadding, opts.padChar) + obj[key]);
		}
	}

	return ret;
}

/**
 * Merges a list of store-like objects, summing overlapping keys. Useful for calculating assets from multiple sources
 */
export function mergeSum(objects: { [key: string]: number | undefined }[]): { [key: string]: number } {
	const ret: { [key: string]: number } = {};
	for (const object of objects) {
		for (const key in object) {
			const amount = object[key] || 0;
			if (!ret[key]) {
				ret[key] = 0;
			}
			ret[key] += amount;
		}
	}
	return ret;
}

export function coordName(coord: Coord): string {
	return coord.x + ':' + coord.y;
}

const CHARCODE_A = 65;

/**
 * Returns a compact two-character encoding of the coordinate
 */
export function compactCoordName(coord: Coord): string {
	return String.fromCharCode(CHARCODE_A + coord.x, CHARCODE_A + coord.y);
}

export function derefCoords(coordName: string, roomName: string): RoomPosition {
	const [x, y] = coordName.split(':');
	return new RoomPosition(parseInt(x, 10), parseInt(y, 10), roomName);
}

export function getPosFromString(str: string | undefined | null): RoomPosition | undefined {
	if (!str) return;
	const posName = _.first(str.match(/(E|W)\d+(N|S)\d+:\d+:\d+/g) || []);
	if (posName) {
		const [roomName, x, y] = posName.split(':');
		return new RoomPosition(parseInt(x, 10), parseInt(y, 10), roomName);
	}
}

export function equalXYR(pos1: ProtoPos, pos2: ProtoPos): boolean {
	return pos1.x == pos2.x && pos1.y == pos2.y && pos1.roomName == pos2.roomName;
}

/**
 * Averages a list of objects by mapping object=>iteratee(object)
 */
export function averageBy<T>(objects: T[], iteratee: ((obj: T) => number)): number | undefined {
	if (objects.length == 0) {
		return undefined;
	} else {
		return _.sum(objects, obj => iteratee(obj)) / objects.length;
	}
}

/**
 * Equivalent to lodash.minBy() method
 */
export function minBy<T>(objects: T[], iteratee: ((obj: T) => number | false)): T | undefined {
	let minObj: T | undefined;
	let minVal = Infinity;
	let val: number | false;
	for (const i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val < minVal) {
			minVal = val;
			minObj = objects[i];
		}
	}
	return minObj;
}

/**
 * Equivalent to lodash.maxBy() method
 */
export function maxBy<T>(objects: T[], iteratee: ((obj: T) => number | false)): T | undefined {
	let maxObj: T | undefined;
	let maxVal = -Infinity;
	let val: number | false;
	for (const i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val > maxVal) {
			maxVal = val;
			maxObj = objects[i];
		}
	}
	return maxObj;
}

export function logHeapStats(): void {
	if (typeof Game.cpu.getHeapStatistics === 'function') {
		const heapStats = Game.cpu.getHeapStatistics();
		const heapPercent = Math.round(100 * (heapStats.total_heap_size + heapStats.externally_allocated_size)
									   / heapStats.heap_size_limit);
		const heapSize = Math.round((heapStats.total_heap_size) / 1048576);
		const externalHeapSize = Math.round((heapStats.externally_allocated_size) / 1048576);
		const heapLimit = Math.round(heapStats.heap_size_limit / 1048576);
		console.log(`Heap usage: ${heapSize} MB + ${externalHeapSize} MB of ${heapLimit} MB (${heapPercent}%).`);
	}
}

/**
 * Return whether the IVM is enabled
 */
export function isIVM(): boolean {
	return typeof Game.cpu.getHeapStatistics === 'function';
}

/**
 * Generate a randomly-offset cache expiration time
 */
export function getCacheExpiration(timeout: number, offset = 5): number {
	return Game.time + timeout + Math.round((Math.random() * offset * 2) - offset);
}

const hexChars = '0123456789abcdef';

/**
 * Generate a random hex string of specified length
 */
export function randomHex(length: number): string {
	let result = '';
	for (let i = 0; i < length; i++) {
		result += hexChars[Math.floor(Math.random() * hexChars.length)];
	}
	return result;
}

/**
 * Compute an exponential moving average
 */
export function exponentialMovingAverage(current: number, avg: number | undefined, window: number): number {
	return (current + (avg || 0) * (window - 1)) / window;
}

/**
 * Compute an exponential moving average for unevenly spaced samples
 */
export function irregularExponentialMovingAverage(current: number, avg: number, dt: number, window: number): number {
	return (current * dt + avg * (window - dt)) / window;
}

/**
 * Create a shallow copy of a 2D array
 */
export function clone2DArray<T>(a: T[][]): T[][] {
	return _.map(a, e => e.slice());
}

/**
 * Rotate a square matrix in place clockwise by 90 degrees
 */
function rotateMatrix<T>(matrix: T[][]): void {
	// reverse the rows
	matrix.reverse();
	// swap the symmetric elements
	for (let i = 0; i < matrix.length; i++) {
		for (let j = 0; j < i; j++) {
			const temp = matrix[i][j];
			matrix[i][j] = matrix[j][i];
			matrix[j][i] = temp;
		}
	}
}

/**
 * Return a copy of a 2D array rotated by specified number of clockwise 90 turns
 */
export function rotatedMatrix<T>(matrix: T[][], clockwiseTurns: 0 | 1 | 2 | 3): T[][] {
	const mat = clone2DArray(matrix);
	for (let i = 0; i < clockwiseTurns; i++) {
		rotateMatrix(mat);
	}
    return mat;
}

