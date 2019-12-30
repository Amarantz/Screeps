import Base from "Base";
import { CreepSetup } from "creeps/setups/CreepSetups";
import Unit from "unit/Unit";
import { log } from "console/log";
import { Pathing } from "Movement/Pathing";
import { SpawnRequest, SpawnRequestOptions } from "mcv/handOfNod";

export interface CommanderInitializer {
    ref: string;
    room: Room | undefined;
    pos: RoomPosition;
    base: Base;
    memory: any;
    waypoints?: RoomPosition[];
}

export const hasBase = (initializer: CommanderInitializer | Base): initializer is CommanderInitializer => {
    return (<CommanderInitializer>initializer).base != undefined;
}

export const DEFAULT_PRESPAWN = 50;
export const MAX_SPANW_REQUESTS = 100;

export interface CreepRequestOptions {
    priority: any;
    reassignIdle?: boolean;
    noLifetimeFilter?: boolean;
    prespawn?: number;
    partners?: CreepSetup[];
    options?: SpawnRequestOptions;
}

export interface UnitOptions {
    notifyWhenAttacked?: boolean;
    boostWishList?: _ResourceConstantSansEnergy[] | undefined;
}

export interface CommanderMemory {
    suspendUntil?: number;
}

const CommmanderMemoryDefaults: CommanderMemory = {}

export default abstract class Commander {
    protected initializer: CommanderInitializer | Base;
    room: Room | undefined;
    priority: number;
    base: Base;
    ref: string;
    name: string;

    private _creeps: {[roleName:string]: Creep[]};
    private _units: {[roleName:string]: Unit[]};
    pos: RoomPosition;
    creepUsageReport: { [roleName: string]: [number, number] | undefined };

    constructor(initializer: CommanderInitializer | Base, name:string, priority:number){
        this.initializer = initializer;
        this.room = initializer.room;
        this.priority = priority;
        this.name = name;
        this.ref = initializer.ref + '>' + name;
        this.pos = initializer.pos;
        this.base = hasBase(initializer) ? initializer.base : initializer;
        this._units = {};
        this._creeps = {};
        this.recalculateCreeps();
        this.creepUsageReport = _.mapValues(this._creeps, creep => undefined);
        Cobal.commanders[this.ref] = this;
        Cobal.general.registerCommander(this);
    }
    get isSuspended(): boolean {
        return Cobal.general.isCommanderSuspended(this);
    }

    suspendFor(ticks: number): void{
        return Cobal.general.suspendCommanderFor(this, ticks);
    }

    supsendUntil(untilTicks:number): void {
        return Cobal.general.suspendCommanderUntil(this, untilTicks);
    }
    refresh(): void {
        this.room = Game.rooms[this.pos.roomName];
        this.recalculateCreeps();
        for(const role in this._creeps){
            for(const creep of this._creeps[role]){
                if(Cobal.units[creep.name]){
                    Cobal.units[creep.name].refresh();
                } else {
                    log.warning(`${this.print}: could not find and refresh unit with the name ${creep.name}`);
                }
            }
        }
    }

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.pos.roomName}">[${this.ref}]</a>`;
    }
    recalculateCreeps(): void {
       this._creeps = _.mapValues(Cobal.cache.commanders[this.ref], creepsOfRole => _.map(creepsOfRole, creepName => Game.creeps[creepName.name]));
       for(const role in this._units){
            this.synchronizeUnits(role);
       }
    }

    protected unit(role:string, opts: UnitOptions = {}): Unit[] {
        if(!this._units[role]){
            this._units[role] = [];
            this.synchronizeUnits(role, opts.notifyWhenAttacked);
        }
        return this._units[role];
    }

    private synchronizeUnits(role:string, notifyWhenAttacked?: boolean): void {
        const unitNames = _.zipObject(_.map((this._units[role] || []), unit => [unit.name, true])) as {[name: string]: boolean;};
        const creepNames = _.zipObject(_.map((this._creeps[role] || []), creep => [creep.name, true])) as {[name: string]: boolean;};
        for(const creep of this._creeps[role] || []){
            if(!unitNames[creep.name]){
                this._units[role].push(Cobal.units[creep.name] || new Unit(creep, notifyWhenAttacked));
            }
        }
        for (const unit of this._units[role]){
            if(!creepNames[unit.name]){
                _.remove(this._units[role], u => u.name === unit.name);
            }
        }
    }

    get outpostIndex(): number {
        return _.findIndex(this.base.roomNames, roomName => roomName == this.pos.roomName);
    }

    protected reassignIdleCreeps(role: string): void {
        const idleCreeps = _.filter(this.base.getCreepsByRole(role), creep => !getCommander(creep));
        for(const creep of idleCreeps){
            setCommander(creep, this);
        }
    }
    protected wishList(quantity: number, setup: CreepSetup, opts = {} as CreepRequestOptions){
        _.defaults(opts, {priority: this.priority, prespawn: DEFAULT_PRESPAWN, reassignIdle: false});
        let creepQuantity: number;
        if(opts.noLifetimeFilter){
            creepQuantity = (this._creeps[setup.role] || []).length;
        } else if (_.has(this.initializer, 'waypoints')) {
            creepQuantity = this.lifetimeFilter(this._creeps[setup.role] || [], opts.prespawn, 500).length;
        } else {
            creepQuantity = this.lifetimeFilter(this._creeps[setup.role] || [], opts.prespawn).length;
        }
        let spawnQuantity = quantity - creepQuantity;
        if(opts.reassignIdle && spawnQuantity > 0){
            const idleCreeps = _.filter(this.base.getCreepsByRole(setup.role),creep => !getCommander(creep));
            for(let i = 0; i < Math.min(idleCreeps.length, spawnQuantity); i++) {
                setCommander(idleCreeps[i], this);
                spawnQuantity--;
            }
        }
        if(spawnQuantity > MAX_SPANW_REQUESTS){
            log.warning(`Too many request for ${setup.role}s submitted by ${this.print}! (Check for error.)`);
        } else {
            for( let i = 0; i < spawnQuantity; i++){
                this.requestCreep(setup, opts);
            }
        }
        // this.creepReport(setup.role, creepQuantity, quantity);
    }

    protected requestCreep(setup: CreepSetup, opts = {} as CreepRequestOptions) {
        _.defaults(opts, {priority: this.priority, prespawn: DEFAULT_PRESPAWN});
        const spawner = this.base.handOfNod;
        if(spawner) {
            const request: SpawnRequest = {
                setup: setup,
                commander: this,
                priority: opts.priority!,
            };
            if(opts.partners){
                request.patners = opts.partners;
            }
            if(opts.options){
                request.options = opts.options;
            }
            spawner.enqueue(request);
        } else {
            if(Game.time % 100 == 0){
                log.warning(`Commander ${this.ref} @ ${this.pos.print}: no spawner object!`);
            }
        }
    }

    parkCreepsIfIdle(creeps: Unit[], outsidehandOfNod = true){
        for(const creep of creeps){
            if(creep.isIdle && creep.canExecute('move')){
                if(this.base.handOfNod){
                    const handOfNodResitrictedRange = 6;
                }
            }
        }
    }

    abstract run(): void;
    abstract init(): void;
    preInit() {
    }
    shouldBoost(creep: Unit, onlyBoostInSpawn = false): boolean {
        return false;
    }
    autoRun(roleCreeps: Unit[], taskHandler: (creep: Unit) => void, fleeCallback?: (creep: Unit) => boolean) {
        for(const creep of roleCreeps){
            if(!!fleeCallback){
                if(fleeCallback(creep)) continue;
            }
            if(creep.isIdle){
              taskHandler(creep);
            }
            creep.run();
        }
    }

    protected creepReport(role:string, currentAmt: number, neededAmt: number){
        this.creepUsageReport[role] = [currentAmt, neededAmt];
    }

    lifetimeFilter(creeps:(Creep|Unit)[], prespawn = DEFAULT_PRESPAWN, spawnDistance?:number): (Creep | Unit)[] {
        if(!spawnDistance){
            spawnDistance = 0;
            if(this.base.handOfNod) {
                spawnDistance = Pathing.distance(this.pos, this.base.handOfNod.pos) || 0;
            }
        }

        return _.filter(creeps, creep => creep.ticksToLive! > CREEP_SPAWN_TIME * creep.body.length + spawnDistance! + prespawn || creep.spawning || (!creep.spawning && !creep.ticksToLive));
    }
}


export function getCommander(creep: Unit | Creep): Commander | undefined {
	if (creep.memory[_MEM.COMMANDER]) {
		return Cobal.commanders[creep.memory[_MEM.COMMANDER]!] || undefined;
	} else {
		return undefined;
	}
}

export function setCommander(creep: Unit | Creep, newCommander: Commander | undefined) {
	// Remove cache references to old assignments
	const roleName = creep.memory.role;
	const ref = creep.memory[_MEM.COMMANDER];
	const oldCommander: Commander | null = ref ? Cobal.commanders[ref] : null;
	if (ref && Cobal.cache.commanders[ref] && Cobal.cache.commanders[ref][roleName]) {
		_.remove(Cobal.cache.commanders[ref][roleName], name => name == creep.name);
	}
	if (newCommander) {
		// Change to the new overlord's colony
		creep.memory[_MEM.BASE] = newCommander.base.name;
		// Change assignments in memory
		creep.memory[_MEM.COMMANDER] = newCommander.ref;
		// Update the cache references
		if (!Cobal.cache.commanders[newCommander.ref]) {
			Cobal.cache.commanders[newCommander.ref] = {};
		}
		if (!Cobal.cache.commanders[newCommander.ref][roleName]) {
			Cobal.cache.commanders[newCommander.ref][roleName] = [];
		}
		Cobal.cache.commanders[newCommander.ref][roleName].push(creep.name);
	} else {
		creep.memory[_MEM.COMMANDER] = undefined;
	}
	if (oldCommander) oldCommander.recalculateCreeps();
	if (newCommander) newCommander.recalculateCreeps();
	log.info(`${creep.name} has been reassigned from ${oldCommander ? oldCommander.print : 'IDLE'} ` +
			 `to ${newCommander ? newCommander.print : 'IDLE'}`);
}
