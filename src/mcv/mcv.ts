import { Base } from "../Base";
import { Commander } from "../commander/Commander";

export abstract class MCV {
    base: Base;
    room: Room;
    pos: RoomPosition;
    ref: string;
    memory: any;
    commander: Commander | undefined;

    constructor(base: Base, instantiationObject: RoomObject, name: string, includePos = false){
        this.base = base;
        this.room = instantiationObject.room!;
        this.pos = instantiationObject.pos;
        this.ref = includePos ? name + '@' + instantiationObject.pos.name : name + '@' + this.base.name;
        this.base.MCVbuildings.push(this);
    }

    get print(): string {
        return `<a href="#!/room/${Game.shard.name}/${this.pos.roomName}">[${this.ref}]</a>"`;
    }

    abstract refresh(): void;
    abstract spawnMoreCommanders(): void;
    abstract init(): void;
    abstract run(): void;
}
