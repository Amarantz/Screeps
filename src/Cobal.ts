import Mem from "memory/memory";
import $ from "caching/GameCache";

class Cobal implements ICobal {
    cache: ICache;
    shouldRebuild: boolean;
    expiration: number;
    unit: { [creepName: string]: any; };

    constructor() {
        this.cache = new $();
        this.expiration = Game.time + 5;
        this.shouldRebuild = false;
        this.unit = {};
    }

    init(): void {

    }
    refresh(): void {

    }
    build(): void {

    }

}

export default Cobal;
