Object.defineProperty(RoomPosition.prototype, 'print', {
    get: () => (`<a href="#!/room/${Game.shard.name}/${this.roomName}">['${this.roomName}, ${this.x}, ${this.y}]</a>`),
    configurable: true,
})

Object.defineProperty(RoomPosition.prototype, 'printPlain', {
    get: () => `[${this.roomName}, ${this.x}, ${this.y}]`,
    configurable: true,
})
Object.defineProperty(RoomPosition.prototype, 'room', {
    get: () => (        Game.rooms[this.roomName]),
    configurable: true,
});

Object.defineProperty(RoomPosition.prototype, 'room', {
    get: () => (`${this.roomName}:${this.x}:${this.y}`),
    configurable: true,
})

RoomPosition.prototype.lookForStructure = (structureType: StructureConstant): Structure | undefined => ( _.find(this.lookFor(LOOK_STRUCTURES), s => s.structureType === structureType));

Object.defineProperty(RoomPosition.prototype, 'coordName', {
    get: () => (`${this.x}:${this.y}`),
    configurable: true,
});
