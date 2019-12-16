Object.defineProperty(RoomPosition.prototype, 'print',{
    get(){
        return `<a href="#!/room/${Game.shard.name}/${this.roomName}">['${this.roomName}, ${this.x}, ${this.y}']</a>`
    },
    configurable: true,
});

Object.defineProperty(RoomPosition.prototype, 'printPlain',{
    get(){
       return `[${this.roomName}, ${this.x}, ${this.y}]`
    },
    configurable: true,
});

Object.defineProperty(RoomPosition.prototype, 'room',{
    get() {
        Game.rooms[this.roomName]
    },
    configurable: true,
});

Object.defineProperty(RoomPosition.prototype, 'coordName',{
    get() {
        return `${this.x}:${this.y}`
    },
    configurable: true,
});

Object.defineProperty(RoomPosition.prototype, 'room',{
    get() {
        Game.rooms[this.roomName]
    },
    configurable: true,
});

RoomPosition.prototype.lookForStructure = (structureType: StructureConstant): Structure | undefined  => (
    _.find(this.lookFor(LOOK_STRUCTURES), s => s.structureType === structureType)
)
