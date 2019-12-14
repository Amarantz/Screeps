Object.defineProperty(Creep.prototype, 'boosts', {
    get() {
        if(!this._boosts){
            this.boosts = _.compact(_.unique(_.map(this.body as BodyPartDefinition[], bodyPart =>
                bodyPart.boost))) as _ResourceConstantSansEnergy[];
        }
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'boostCounts', {
    get() {
        if(!this._boostCounts) {
            this.boostsCounts = _.countBy(this.body as BodyPartDefinition[], bodyPart => bodyPart.boost);
        }
        return this._boostCount;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'inRampart', {
    get() {
        return !!this.pos.lookForStrucure(STRUCTURE_RAMPART);
    },
    configurable: true,
})
