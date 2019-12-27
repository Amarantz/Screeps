import Directive from "directives/Directive";
import { getCacheExpiration, exponentialMovingAverage } from "utils/utils";
import { Cartographer, ROOMTYPE_SOURCEKEEPER } from "utils/Cartographer";
import { CommanderPriority } from "priorities/priorities_commanders";
import { Pathing } from "movement/Pathing";
import MiningCommander from "commander/mining/miner";

export const _HAVEST_MEM_PATH = 'P';
export const _HAVEST_MEM_USAGE = 'u';
export const _HAVEST_MEM_DOWNTIME = 'd';

interface DirectiveHavestMemory extends FlagMemory {
    [_HAVEST_MEM_PATH]?: {
        [_MEM.DISTANCE]: number;
        [_MEM.EXPIRATION]: number;
    };
    [_HAVEST_MEM_USAGE]: number;
    [_HAVEST_MEM_DOWNTIME]: number;
}

const defaultDirectiveHavestMemory: DirectiveHavestMemory = {
    [_HAVEST_MEM_USAGE]: 1,
    [_HAVEST_MEM_DOWNTIME]: 0,
}

export default class DirectiveHavest extends Directive {
    static directiveName = 'harvest';
    static color = COLOR_YELLOW;
    static secondaryColor = COLOR_YELLOW;

    memory: DirectiveHavestMemory;
    commanders: {
        mine: MiningCommander;
    }

    constructor(flag: Flag){
        super(flag);
        if(this.base){
            this.base.miningSites[this.name] = this;
            this.base.destinations.push({pos: this.pos, order: this.memory[_MEM.TICK] || Game.time});
        }
        _.defaultsDeep(this.memory, defaultDirectiveHavestMemory);
    }

    get distance(): number {
        if(!this.memory[_HAVEST_MEM_PATH] || Game.time >= this.memory[_HAVEST_MEM_PATH]![_MEM.EXPIRATION]){
            const distance = Pathing.distance(this.base.pos, this.pos);
            const expiration = getCacheExpiration(this.base.storage ? 5000 : 1000);
            this.memory[_HAVEST_MEM_PATH] = {
                [_MEM.DISTANCE]: distance,
                [_MEM.EXPIRATION]: expiration,
            }
        }
        return this.memory[_HAVEST_MEM_PATH]![_MEM.DISTANCE];
    }
    spawnMoarOverlords(): void {
        let priority = CommanderPriority.ownedRoom.mine;
        if(!(this.room && this.room.my)){
            priority = Cartographer.roomType(this.pos.roomName) == ROOMTYPE_SOURCEKEEPER ? CommanderPriority.remoteSKRoom.mine : CommanderPriority.remoteRoom.mine;
        }
        this.commanders.mine = new MiningCommander(this, priority);
    }
    init(): void {
        throw new Error("Method not implemented.");
    }
    run(): void {
        this.computeStats()
    }

    private computeStats() {
        const source = this.commanders.mine.source;
        if(source && source.ticksToRegeneration == 1){
            this.memory[_HAVEST_MEM_USAGE] = (source.energyCapacity - source.energy)/ source.energyCapacity;
        }
        const container = this.commanders.mine.container;
        this.memory[_HAVEST_MEM_DOWNTIME] = +(exponentialMovingAverage(container ? +container.isFull : 0, this.memory[_HAVEST_MEM_DOWNTIME], CREEP_LIFE_TIME)).toFixed(5);
    }

}
