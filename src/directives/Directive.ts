import {Base, getAllBases } from 'Base';
import { log } from '../console/log';
import { Commander } from 'commander/Commander';
import { getPosFromString, randomHex, equalXYR } from 'utils/utils';
import { Pathing } from 'movement/Pathing';

interface DirectiveCreateOptions {
    memory?: FlagMemory;
    name?: string;
    quiet?: boolean;
}

const DEFAULT_MAX_PATH_LENGTH = 600;
const DEFAULT_MAX_LINEAR_RANGE = 10;

export abstract class Directive {
    static directiveName: string;
    static color: ColorConstant;
    static secondaryColor: ColorConstant;

    name: string;
    ref: string;
    base: Base;
    baseFilter?: (base: Base) => boolean;
    pos: RoomPosition;
    room: Room | undefined;
    memory: FlagMemory;
    commanders: {[name:string]: Commander};
    waypoints?: RoomPosition[];


    constructor(flag: Flag, baseFilter?: (base: Base) => boolean){
        this.memory = flag.memory;
        //@ts-ignore
        if(this.memory.suspendUntil){
             //@ts-ignore
            if(Game.time < this.memory.suspendUntil){
                return;
            } else {
                 //@ts-ignore
                delete this.memory.suspendUntil;
            }
        }
        this.name = flag.name;
        this.ref = flag.ref;
         //@ts-ignore
        if (!this.memory[_MEM.TICK]) {
             //@ts-ignore
            this.memory[_MEM.TICK] = Game.time;
        }
         //@ts-ignore
        if(this.memory.waypoints){
             //@ts-ignore
            this.waypoints = _.map(this.memory.waypoints, posName => getPosFromString(posName)!)
        }

        const needsRelocating = this.handleRelocation();
        if(!needsRelocating) {
            this.pos = flag.pos;
            this.room = flag.room;
        }

        const base = this.getBase(baseFilter);
        if(!base){
            if(global.Cobal.exceptions.length == 0){
                log.alert(`Cold not get base for directive ${this.print}; removing flag!`);
                flag.remove();
            } else {
                log.alert(`Could not get base for directive ${this.print}; exceptions present this tick, so won't remove`)
            }
            return;
        }
        //@ts-ignore
        if(this.memory[_MEM.EXPIRATION] && Game.time > this.memory[_MEM.EXPIRATION]!){
            log.alert(`Removing expired directive ${this.print}`)
            flag.remove();
            return;
        }

        this.base = base;
        this.base.flags.push(flag);
        this.commanders = {};
        global[this.name] = this;
        global.Cobal.general.registerDirective(this);
        global.Cobal.directives[this.name] = this;
    }

    static getPos(flag: Flag): RoomPosition {
        //@ts-ignore
        if(flag.memory && flag.memory.setPosition){
            //@ts-ignore
            const pos = derefRoomPosition(flag.memory.setPosition);
            return pos;
        } else {
            return flag.pos;
        }
    }

    get flag(): Flag {
        return Game.flags[this.name];
    }
    get print(): string {
		return '<a href="#!/room/' + Game.shard.name + '/' + this.pos.roomName + '">[' + this.name + ']</a>';
	}

    refresh(): void {
        const flag = this.flag;
        if(!flag){
            log.warning(`Missing flag for directive ${this.print}! removing directive.`);
            this.remove();
            return;
        }
        this.memory = flag.memory;
        this.pos = flag.pos;
        this.room = flag.room;
    }

    alert(message: string, priority = 1): void {

    }

    private handleRelocation(): boolean {
        //@ts-ignore
        if(this.memory.setPosition){
            //@ts-ignore
            const pos = derefRoomPosition(this.memory.setPosition);
            if(!this.flag.pos.isEqualTo(pos)){
                const result = this.flag.setPosition(pos);
                if(result == OK){
                    log.debug(`Moving ${this.name} from ${this.flag.pos.print} to ${pos.print}`)
                } else {
                    //@ts-ignore
                    log.warning(`Could not set room position to ${JSON.stringify(this.memory.setPosition)}`)
                }
            } else {
                //@ts-ignore
                delete this.memory.setPosition;
            }
            this.pos = pos;
            this.room = Game.rooms[pos.roomName];
            return true;
        }
        return false;
    }

    private getBase(baseFilter?: (base: Base) => boolean, verbose = false): Base | undefined {
        //@ts-ignore
        if(this.memory[_MEM.BASE]){
            //@ts-ignore
            return global.Cobal.bases[this.memory[_MEM.BASE]!];
        } else {
            const baseName = Object.keys(global.Cobal.bases);
            for (const name of baseName){
                if(this.name.includes(name)){
                    if(this.name.split(name)[1] != '') continue;
                    //@ts-ignore
                    this.memory[_MEM.BASE] = name;
                    return global.Cobal.bases[name];
                }
            }
        }

        const base = global.Cobal.bases[global.Cobal.basemap[this.pos.roomName]] as Base | undefined;
        if(base){
            if(!baseFilter || baseFilter(base)){
                //@ts-ignore
                this.memory[_MEM.BASE] = base.name;
                return base;
            }
        }

        const nearestBase = this.findNearestBase(baseFilter, verbose);
        if(nearestBase){
            log.info(`Base ${nearestBase.room.print} assigned to ${this.name}`);
            //@ts-ignore
            this.memory[_MEM.BASE] = nearestBase.room.name;
            return nearestBase;
        } else {
            log.error(`Could not find base match for ${this.name} in ${this.pos.roomName}! Try setting memory.maxPathLenght and memory.maxLinearRange`);
        }
    }

    private findNearestBase(baseFilter?: (base: Base) => boolean, verbose = false): Base | undefined {
        //@ts-ignore
        const maxPathLenght = this.memory.maxPathLength || DEFAULT_MAX_PATH_LENGTH;
        //@ts-ignore
        const maxLinearRange = this.memory.maxLinearRange || DEFAULT_MAX_LINEAR_RANGE;
        if(verbose){
            log.info(`Recalculating base association for ${this.name} in ${this.pos.roomName}`);
        }
        let nearestBase: Base | undefined;
        let minDistance = Infinity;
        const colonyRooms = _.filter(Game.rooms, room => room.my);
        for(const base of getAllBases()){
            if(Game.map.getRoomLinearDistance(this.pos.roomName, base.name) > maxLinearRange) {
                continue;
            }
            if(!baseFilter || baseFilter(base)){
                const ret = Pathing.findPath((base.handOfNod || Base).pos, this.pos);
                if(!ret.incomplete){
                    if(ret.path.length < maxPathLenght && ret.path.length < minDistance){
                        nearestBase = base;
                        minDistance = ret.path.length;
                    }

                }
            }
        }
        if(nearestBase){
            return nearestBase;
        }
    }
    // Wrapped flag methods ============================================================================================
	remove(force = false): number | undefined {
        //@ts-ignore
		if (!this.memory.persistent || force) {
			delete global.Cobal.directives[this.name];
            delete global[this.name];
            delete  global[this];
			global.Cobal.general.removeDirective(this);
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

    	/* Create a directive if one of the same type is not already present (in room | at position).
	 * Calling this method on positions in invisible rooms can be expensive and should be used sparingly. */
	static createIfNotPresent(pos: RoomPosition, scope: 'room' | 'pos',
							  opts: DirectiveCreateOptions = {}): number | string | undefined {
		if (this.isPresent(pos, scope)) {
			return; // do nothing if flag is already here
		}
		const room = Game.rooms[pos.roomName] as Room | undefined;
		if (!room) {
			if (!opts.memory) {
				opts.memory = {};
            }
            //@ts-ignore
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
                    //@ts-ignore
					if (opts.memory && opts.memory[_MEM.BASE]) {
                        //@ts-ignore
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
                    //@ts-ignore
					if (opts.memory && opts.memory[_MEM.BASE]) {
                        //@ts-ignore
						createAtPos = Pathing.findPathablePosition(opts.memory[_MEM.BASE]!);
					} else {
						createAtPos = Pathing.findPathablePosition(_.first(getAllBases()).room.name);
					}
					return this.create(createAtPos, opts);
				}
		}
    }

    /* Whether a directive of the same type is already present (in room | at position) */
	static isPresent(pos: RoomPosition, scope: 'room' | 'pos'): boolean {
		const room = Game.rooms[pos.roomName] as Room | undefined;
		switch (scope) {
			case 'room':
				if (room) {
                    return _.filter(room.flags,
                        //@ts-ignore
                                    flag => this.filter(flag) &&
                                    //@ts-ignore
                                            !(flag.memory.setPosition
                                                //@ts-ignore
											&& flag.memory.setPosition.roomName != pos.roomName)).length > 0;
				} else {
					const flagsInRoom = _.filter(Game.flags, function(flag) {
                        //@ts-ignore
                        if (flag.memory.setPosition) { // does it need to be relocated?
                            //@ts-ignore
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
                                    //@ts-ignore
                                            !(flag.memory.setPosition
                                                //@ts-ignore
											&& !equalXYR(pos, flag.memory.setPosition))).length > 0;
				} else {
					const flagsAtPos = _.filter(Game.flags, function(flag) {
                        //@ts-ignore
                        if (flag.memory.setPosition) { // does it need to be relocated?
                            //@ts-ignore
							return equalXYR(flag.memory.setPosition, pos);
						} else { // properly located
							return equalXYR(flag.pos, pos);
						}
					});
					return _.filter(flagsAtPos, flag => this.filter(flag)).length > 0;
				}
		}
	}

    /* Create an appropriate flag to instantiate this directive in the next tick */
	static create(pos: RoomPosition, opts: DirectiveCreateOptions = {}): number | string {
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

    /* Filter for _.filter() that checks if a flag is of the matching type */
	static filter(flag: Flag): boolean {
		return flag.color == this.color && flag.secondaryColor == this.secondaryColor;
	}

	/* Map a list of flags to directives, accepting a filter */
	static find(flags: Flag[]): Directive[] {
		flags = _.filter(flags, flag => this.filter(flag));
		return _.compact(_.map(flags, flag => global.Cobal.directives[flag.name]));
	}

	abstract spawnMoarOverlords(): void;

	/* Initialization logic goes here, called in overseer.init() */
	abstract init(): void;

	/* Runtime logic goes here, called in overseer.run() */
	abstract run(): void;

	// Overwrite this in child classes to display relevant information
	visuals(): void {

	}
}
