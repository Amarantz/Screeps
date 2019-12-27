import { color } from '../utils/utils';
export enum LogLevel {
    ERROR = 0,
    WARNING = 1,
    ALERT = 2,
    INFO = 3,
    DEBUG = 4,
}

export const LOG_LEVEL: number = LogLevel.INFO;
export const LOG_PRINT_TICK: boolean = true;
export const LOG_PRINT_LINES: boolean = false;
export const LOG_LOAD_SOURCE_MAP: boolean = false;
export const LOG_MAX_PAD: number = 100;

/**
 * VSC location, used to create links back to source.
 * Repo and revision are filled in at build time for git repositories.
 */
export const LOG_VSC = {repo: '@@_repo_@@', revision: '@@_revision_@@', valid: false};
// export const LOG_VSC = { repo: "@@_repo_@@", revision: __REVISION__, valid: false };

/**
 * URL template for VSC links, this one works for github and gitlab.
 */
export const LOG_VSC_URL_TEMPLATE = (path: string, line: string) => {
	return `${LOG_VSC.repo}/blob/${LOG_VSC.revision}/${path}#${line}`;
};


// <caller> (<source>:<line>:<column>)
const stackLineRe = /([^ ]*) \(([^:]*):([0-9]*):([0-9]*)\)/;
const FATAL = -1;
const fatalColor = '#d65156';

interface SourcePos {
	compiled: string;
	final: string;
	original: string | undefined;
	caller: string | undefined;
	path: string | undefined;
	line: number | undefined;
}

export function resolve(fileLine: string): SourcePos {
	const split = _.trim(fileLine).match(stackLineRe);
	if (!split || !Log.sourceMap) {
		return {compiled: fileLine, final: fileLine} as SourcePos;
	}

	const pos = {column: parseInt(split[4], 10), line: parseInt(split[3], 10)};

	const original = Log.sourceMap.originalPositionFor(pos);
	const line = `${split[1]} (${original.source}:${original.line})`;
	const out = {
		caller  : split[1],
		compiled: fileLine,
		final   : line,
		line    : original.line,
		original: line,
		path    : original.source,
	};

	return out;
}

function makeVSCLink(pos: SourcePos): string {
	if (!LOG_VSC.valid || !pos.caller || !pos.path || !pos.line || !pos.original) {
		return pos.final;
	}

	return link(vscUrl(pos.path, `L${pos.line.toString()}`), pos.original);
}

function tooltip(str: string, tooltip: string): string {
	return `<abbr title='${tooltip}'>${str}</abbr>`;
}

function vscUrl(path: string, line: string): string {
	return LOG_VSC_URL_TEMPLATE(path, line);
}

function link(href: string, title: string): string {
	return `<a href='${href}' target="_blank">${title}</a>`;
}

function time(): string {
	return color(Game.time.toString(), 'gray');
}

export function debug(this: any, thing: { name: string, memory: any, pos: RoomPosition }, ...args: any[]) {
	if (thing.memory && thing.memory.debug) {
		this.debug(`${thing.name} @ ${thing.pos.print}: `, args);
	}
}

export class Log {
    static sourceMap: any;


	static loadSourceMap() {
		// try {
		// 	// tslint:disable-next-line
		// 	const map = require('main.js.map');
		// 	if (map) {
		// 		Log.sourceMap = new SourceMapConsumer(map);
		// 	}
		// } catch (err) {
		console.log('Source mapping deprecated.');
		// }
    }

	setLogLevel(value: number) {
		let changeValue = true;
		switch (value) {
			case LogLevel.ERROR:
				console.log(`Logging level set to ${value}. Displaying: ERROR.`);
				break;
			case LogLevel.WARNING:
				console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING.`);
				break;
			case LogLevel.ALERT:
				console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING, ALERT.`);
				break;
			case LogLevel.INFO:
				console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING, ALERT, INFO.`);
				break;
			case LogLevel.DEBUG:
				console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING, ALERT, INFO, DEBUG.`);
				break;
			default:
				console.log(`Invalid input: ${value}. Loging level can be set to integers between `
							+ LogLevel.ERROR + ' and ' + LogLevel.DEBUG + ', inclusive.');
				changeValue = false;
				break;
		}
	}

	get showSource(): boolean {
		return true;
	}

	get showTick(): boolean {
		return true;
	}

	set showTick(value: boolean) {
	}

	private _maxFileString: number = 0;

	constructor() {
		_.defaultsDeep(Memory, {
			settings: {
				log: {
					level     : LOG_LEVEL,
					showSource: LOG_PRINT_LINES,
					showTick  : LOG_PRINT_TICK,
				}
			}
		});
	}

	trace(error: Error): Log {
        //@ts-ignore
		if (this.level >= LogLevel.ERROR && error.stack) {
			console.log(this.resolveStack(error.stack));
		}

		return this;
	}

	throw(e: Error) {
        //@ts-ignore
		console.log.apply(this, this.buildArguments(FATAL).concat([color(e.toString(), fatalColor)]));
	}

	error(...args: any[]): undefined {
        //@ts-ignore
		if (this.level >= LogLevel.ERROR) {
            //@ts-ignore
			console.log.apply(this, this.buildArguments(LogLevel.ERROR).concat([].slice.call(args)));
		}
		return undefined;
	}

	warning(...args: any[]): undefined {
        //@ts-ignore
		if (this.level >= LogLevel.WARNING) {
            //@ts-ignore
			console.log.apply(this, this.buildArguments(LogLevel.WARNING).concat([].slice.call(args)));
		}
		return undefined;
	}

	alert(...args: any[]): undefined {
        //@ts-ignore
		if (this.level >= LogLevel.ALERT) {
            //@ts-ignore
			console.log.apply(this, this.buildArguments(LogLevel.ALERT).concat([].slice.call(args)));
		}
		return undefined;
	}

	notify(message: string): undefined {
		this.alert(message);
		Game.notify(message);
		return undefined;
	}

	info(...args: any[]): undefined {
        //@ts-ignore
		if (this.level >= LogLevel.INFO) {
            //@ts-ignore
			console.log.apply(this, this.buildArguments(LogLevel.INFO).concat([].slice.call(args)));
		}
		return undefined;
	}

	debug(...args: any[]) {
        //@ts-ignore
		if (this.level >= LogLevel.DEBUG) {
            //@ts-ignore
			console.log.apply(this, this.buildArguments(LogLevel.DEBUG).concat([].slice.call(args)));
		}
	}

	debugCreep(creep: { name: string, memory: any, pos: RoomPosition }, ...args: any[]) {
		if (creep.memory && creep.memory.debug) {
			this.debug(`${creep.name} @ ${creep.pos.print}: `, args);
		}
	}

    printObject(obj: any) {
        //@ts-ignore
		console.log.apply(this, this.buildArguments(LogLevel.DEBUG).concat(JSON.stringify(obj)));
	}

	getFileLine(upStack = 4): string {
		const stack = new Error('').stack;

		if (stack) {
			const lines = stack.split('\n');

			if (lines.length > upStack) {
				const originalLines = _.drop(lines, upStack).map(resolve);
				const hoverText = _.map(originalLines, 'final').join('&#10;');
				return this.adjustFileLine(
					originalLines[0].final,
					tooltip(makeVSCLink(originalLines[0]), hoverText)
				);
			}
		}
		return '';
	}

	private buildArguments(level: number): string[] {
		const out: string[] = [];
		switch (level) {
			case LogLevel.ERROR:
				out.push(color('ERROR  ', 'red'));
				break;
			case LogLevel.WARNING:
				out.push(color('WARNING', 'orange'));
				break;
			case LogLevel.ALERT:
				out.push(color('ALERT  ', 'yellow'));
				break;
			case LogLevel.INFO:
				out.push(color('INFO   ', 'green'));
				break;
			case LogLevel.DEBUG:
				out.push(color('DEBUG  ', 'gray'));
				break;
			case FATAL:
				out.push(color('FATAL  ', fatalColor));
				break;
			default:
				break;
		}
		if (this.showTick) {
			out.push(time());
		}
		if (this.showSource && level <= LogLevel.ERROR) {
			out.push(this.getFileLine());
		}
		return out;
	}

	private resolveStack(stack: string): string {
		if (!Log.sourceMap) {
			return stack;
		}

		return _.map(stack.split('\n').map(resolve), 'final').join('\n');
	}

	private adjustFileLine(visibleText: string, line: string): string {
		const newPad = Math.max(visibleText.length, this._maxFileString);
		this._maxFileString = Math.min(newPad, LOG_MAX_PAD);

		return `|${_.padRight(line, line.length + this._maxFileString - visibleText.length, ' ')}|`;
	}
}

if (LOG_LOAD_SOURCE_MAP) {
	Log.loadSourceMap();
}

export const log = new Log();
