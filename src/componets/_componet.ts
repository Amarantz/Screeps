import { Base } from "Base";

export abstract class Component {
    base: Base;
    room: Room;
    pos: RoomPosition;
    ref: string;
    memory: any;
    commander: undefined;
    constructor(base: Base, instantiationObject: RoomObject, name: string, includePos = false){
        this.base = base;
        this.room = instantiationObject.room as Room;
        this.pos = instantiationObject.pos;
        this.ref = includePos ? name + '@' + instantiationObject.pos.name : name + '@' + this.base.name;
        this.base.hiveClusters.push(this);
    }

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.pos.roomName}"[${this.ref}]</a>`;
    }

    abstract refresh(): void;
    abstract spawnCommander(): void;
    abstract init(): void;
    abstract run(): void;
}
