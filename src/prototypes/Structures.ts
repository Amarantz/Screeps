Object.defineProperty(Structure.prototype, 'isWalkable', {
    get() {
        return [STRUCTURE_ROAD, STRUCTURE_CONTAINER].includes(this.structureType) ||
        (this.structureType == STRUCTURE_RAMPART && (<StructureRampart>this.my || <StructureRampart>this.isPublic))
    },
    configurable: true,
});


