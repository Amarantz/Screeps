Object.defineProperty(Room.prototype, 'my', {
    get() {
        return this.controller && this.controller.my
    },
    configurable: true,
})
