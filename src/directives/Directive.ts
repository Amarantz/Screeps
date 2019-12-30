import Base, { getAllBases } from "Base";
import { getPosFromString, randomHex, equalXYR } from "utils/utils";
import { log } from "console/log";
import { Pathing } from "Movement/pathing";
import { NotifierPriority } from "./Notifier";

interface DirectiveCreationOptions {
	memory?: FlagMemory;
	name?: string;
	quiet?: boolean;
}

const DEFAULT_MAX_PATH_LENGTH = 600;
const DEFAULT_MAX_LINEAR_RANGE = 10;

export default abstract class Directive {
    static directiveName: string;
    static color: ColorConstant;
    static secondaryColor: ColorConstant;

    name: string;
    ref: string;
    base: Base;
    baseFilter?:(base:Base) => boolean;
    pos: RoomPosition;
    room: Room | undefined;
    memory: FlagMemory;
    commanders: {[name:string]: any};
    waypoints?: RoomPosition[];

    constructor(flag: Flag, baseFilter?: (base: Base) => boolean) {
        this.memory = flag.memory;
        if(this.memory.suspendUntil){
            if(Game.time < this.memory.suspendUntil){
                return;
            } else {
                delete this.memory.suspendUntil;
            }
        }

        this.name = flag.name;
        this.ref = flag.ref;
        if(!this.memory[_MEM.TICK]) {
            this.memory[_MEM.TICK] = Game.time;
        }
        if(this.memory.waypoints) {
            this.waypoints = _.map(this.memory.waypoints, posName => getPosFromString(posName)!);
        }
        if(!this.handleRelocation()){
            this.pos = flag.pos;
            this.room = flag.room;
        }
        const base = this.getBase(baseFilter);
        if(!base){
            if(Cobal.expections.length == 0) {
                log.alert(`Could not get base for directive ${this.print}; removing flag!`);
                flag.remove();
            } else {
                log.alert(`Could not get base for directive ${this.print} exceptions present this tick, so won't remove`);
            }
            return;
        }

        if(this.memory[_MEM.EXPIRATION] && Game.time > this.memory[_MEM.EXPIRATION]!) {
            log.alert(`removing expired directive ${this.print}!`);
            flag.remove();
            return;
        }
        this.base = base;
        this.base.flags = [...this.base.flags, flag];
        this.commanders = {};
		global[this.name] = this;
        Cobal.general.registerDirective(this);
        Cobal.directives[this.name] = this;
    }

	/**
	 * Gets an effective room position for a directive; allows you to reference this.pos in constructor super() without
	 * throwing an error
	 */
	static getPos(flag: Flag): RoomPosition {
		if (flag.memory && flag.memory.setPosition) {
			const pos = derefRoomPosition(flag.memory.setPosition);
			return pos;
		}
		return flag.pos;
    }

    // Flag must be a getter to avoid caching issues
	get flag(): Flag {
		return Game.flags[this.name];
    }

    refresh(): void {
		const flag = this.flag;
		if (!flag) {
			log.warning(`Missing flag for directive ${this.print}! Removing directive.`);
			this.remove();
			return;
		}
		this.memory = flag.memory;
		this.pos = flag.pos;
		this.room = flag.room;
    }

    alert(message: string, priority = NotifierPriority.Normal): void {
		Cobal.general.notifier.alert(message, this.pos.roomName, priority);
    }

    get print(): string {
		return '<a href="#!/room/' + Game.shard.name + '/' + this.pos.roomName + '">[' + this.name + ']</a>';
    }

    private handleRelocation(): boolean {
		if (this.memory.setPosition) {
			const pos = derefRoomPosition(this.memory.setPosition);
			if (!this.flag.pos.isEqualTo(pos)) {
				const result = this.flag.setPosition(pos);
				if (result == OK) {
					log.debug(`Moving ${this.name} from ${this.flag.pos.print} to ${pos.print}.`);
				} else {
					log.warning(`Could not set room position to ${JSON.stringify(this.memory.setPosition)}!`);
				}
			} else {
				delete this.memory.setPosition;
			}
			this.pos = pos;
			this.room = Game.rooms[pos.roomName];
			return true;
		}
		return false;
    }

    private getBase(baseFilter?: (base: Base) => boolean, verbose = false): Base | undefined {
		// If something is written to flag.base, use that as the base
		if (this.memory[_MEM.BASE]) {
			return Cobal.bases[this.memory[_MEM.BASE]!];
		} else {
			// If flag contains a base name as a substring, assign to that base, regardless of RCL
			const basesNames = _.keys(Cobal.bases);
			for (const name of basesNames) {
				if (this.name.includes(name)) {
					if (this.name.split(name)[1] != '') continue; // in case of other substring, e.g. E11S12 and E11S1
					this.memory[_MEM.BASE] = name;
					return Cobal.bases[name];
				}
			}
			// If flag is in a room belonging to a base and the base has sufficient RCL, assign to there
			const base = Cobal.bases[Cobal.baseMap[this.pos.roomName]] as Base | undefined;
			if (base) {
				if (!baseFilter || baseFilter(base)) {
					this.memory[_MEM.BASE] = base.name;
					return base;
				}
			}
			// Otherwise assign to closest base
			const nearestbase = this.findNearestbase(baseFilter, verbose);
			if (nearestbase) {
				log.info(`base ${nearestbase.room.print} assigned to ${this.name}.`);
				this.memory[_MEM.BASE] = nearestbase.room.name;
				return nearestbase;
			} else {
				log.error(`Could not find base match for ${this.name} in ${this.pos.roomName}! ` +
						  `Try setting memory.maxPathLength and memory.maxLinearRange.`);
			}
		}
    }

    private findNearestbase(baseFilter?: (base: Base) => boolean, verbose = false): Base | undefined {
		const maxPathLength = this.memory.maxPathLength || DEFAULT_MAX_PATH_LENGTH;
		const maxLinearRange = this.memory.maxLinearRange || DEFAULT_MAX_LINEAR_RANGE;
		if (verbose) log.info(`Recalculating base association for ${this.name} in ${this.pos.roomName}`);
		let nearestbase: Base | undefined;
		let minDistance = Infinity;
		const baseRooms = _.filter(Game.rooms, room => room.my);
		for (const base of getAllBases()) {
			if (Game.map.getRoomLinearDistance(this.pos.roomName, base.name) > maxLinearRange) {
				continue;
			}
			if (!baseFilter || baseFilter(base)) {
				const ret = Pathing.findPath((base).pos, this.pos);
				if (!ret.incomplete) {
					if (ret.path.length < maxPathLength && ret.path.length < minDistance) {
						nearestbase = base;
						minDistance = ret.path.length;
					}
					if (verbose) log.info(`Path length to ${base.room.print}: ${ret.path.length}`);
				} else {
					if (verbose) log.info(`Incomplete path from ${base.room.print}`);
				}
			}
		}
		if (nearestbase) {
			return nearestbase;
		}
	}

	// Wrapped flag methods ============================================================================================
	remove(force = false): number | undefined {
		if (!this.memory.persistent || force) {
			delete Cobal.directives[this.name];
			delete global[this];
			Cobal.general.removeDirective(this);
			if (this.base) {
				_.remove(this.base.flags, flag => flag.name == this.name);
			}
			if (this.flag) { // check in case flag was removed manually in last build cycle
				return this.flag.remove();
			}
		}
	}

	setColor(color: ColorConstant, secondaryColor?: ColorConstant): number {
		if (secondaryColor) {
			return this.flag.setColor(color, secondaryColor);
		} else {
			return this.flag.setColor(color);
		}
	}

	setPosition(pos: RoomPosition): number {
		// Ignore the (x,y) setPosition option since I never use it
		return this.flag.setPosition(pos);
	}

	// Custom directive methods ========================================================================================

	/* Create an appropriate flag to instantiate this directive in the next tick */
	static create(pos: RoomPosition, opts: DirectiveCreationOptions = {}): number | string {
		let flagName = opts.name || undefined;
		if (!flagName) {
			flagName = this.directiveName + ':' + randomHex(6);
			if (Game.flags[flagName]) {
				return ERR_NAME_EXISTS;
			}
		}
		if (!opts.quiet) {
			log.alert(`Creating ${this.directiveName} directive at ${pos.print}!`);
		}
		const result = pos.createFlag(flagName, this.color, this.secondaryColor) as string | number;
		if (result == flagName && opts.memory) {
			Memory.flags[flagName] = opts.memory;
		}
		log.debug(`Result: ${result}, memory: ${JSON.stringify(Memory.flags[result])}`);
		return result;
	}


	/* Whether a directive of the same type is already present (in room | at position) */
	static isPresent(pos: RoomPosition, scope: 'room' | 'pos'): boolean {
		const room = Game.rooms[pos.roomName] as Room | undefined;
		switch (scope) {
			case 'room':
				if (room) {
					return _.filter(room.flags,
									flag => this.filter(flag) &&
											!(flag.memory.setPosition
											&& flag.memory.setPosition.roomName != pos.roomName)).length > 0;
				} else {
					const flagsInRoom = _.filter(Game.flags, function(flag) {
						if (flag.memory.setPosition) { // does it need to be relocated?
							return flag.memory.setPosition.roomName == pos.roomName;
						} else { // properly located
							return flag.pos.roomName == pos.roomName;
						}
					});
					return _.filter(flagsInRoom, flag => this.filter(flag)).length > 0;
				}
			case 'pos':
				if (room) {
					return _.filter(pos.lookFor(LOOK_FLAGS),
									flag => this.filter(flag) &&
											!(flag.memory.setPosition
											&& !equalXYR(pos, flag.memory.setPosition))).length > 0;
				} else {
					const flagsAtPos = _.filter(Game.flags, function(flag) {
						if (flag.memory.setPosition) { // does it need to be relocated?
							return equalXYR(flag.memory.setPosition, pos);
						} else { // properly located
							return equalXYR(flag.pos, pos);
						}
					});
					return _.filter(flagsAtPos, flag => this.filter(flag)).length > 0;
				}
		}
	}

	/* Create a directive if one of the same type is not already present (in room | at position).
	 * Calling this method on positions in invisible rooms can be expensive and should be used sparingly. */
	static createIfNotPresent(pos: RoomPosition, scope: 'room' | 'pos',
							  opts: DirectiveCreationOptions = {}): number | string | undefined {
		if (this.isPresent(pos, scope)) {
			return; // do nothing if flag is already here
		}
		const room = Game.rooms[pos.roomName] as Room | undefined;
		if (!room) {
			if (!opts.memory) {
				opts.memory = {};
			}
			opts.memory.setPosition = pos;
		}
		switch (scope) {
			case 'room':
				if (room) {
					return this.create(pos, opts);
				} else {
					log.info(`Creating directive at ${pos.print}... ` +
							 `No visibility in room; directive will be relocated on next tick.`);
					let createAtPos: RoomPosition;
					if (opts.memory && opts.memory[_MEM.BASE]) {
						createAtPos = Pathing.findPathablePosition(opts.memory[_MEM.BASE]!);
					} else {
						createAtPos = Pathing.findPathablePosition(_.first(getAllBases()).room.name);
					}
					return this.create(createAtPos, opts);
				}
			case 'pos':
				if (room) {
					return this.create(pos, opts);
				} else {
					log.info(`Creating directive at ${pos.print}... ` +
							 `No visibility in room; directive will be relocated on next tick.`);
					let createAtPos: RoomPosition;
					if (opts.memory && opts.memory[_MEM.BASE]) {
						createAtPos = Pathing.findPathablePosition(opts.memory[_MEM.BASE]!);
					} else {
						createAtPos = Pathing.findPathablePosition(_.first(getAllBases()).room.name);
					}
					return this.create(createAtPos, opts);
				}
		}
	}

	/* Filter for _.filter() that checks if a flag is of the matching type */
	static filter(flag: Flag): boolean {
		return flag.color == this.color && flag.secondaryColor == this.secondaryColor;
	}

	/* Map a list of flags to directives, accepting a filter */
	static find(flags: Flag[]): Directive[] {
		flags = _.filter(flags, flag => this.filter(flag));
		return _.compact(_.map(flags, flag => Cobal.directives[flag.name]));
	}

	abstract spawnMoarCommanders(): void;

	/* Initialization logic goes here, called in overseer.init() */
	abstract init(): void;

	/* Runtime logic goes here, called in overseer.run() */
	abstract run(): void;


}
