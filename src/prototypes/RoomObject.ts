Object.defineProperty(RoomObject.prototype, 'ref', {
    get(){
        return this.id || this.name || '';
    },
    configurable: true,
});

Object.defineProperty(RoomObject.prototype, 'targetedBy', {
    get() {
        return global && global.Cobal && global.Cobal.cache.targets[this.ref] || [];
    },
    configurable: true,
})
