import { Component } from "./_componet";
import { Base } from '../Base'
export class Oblisk extends Component {
    constructor(base: Base, headTower: StructureTower){
        super(base, headTower, 'Oblisk');
    }
    refresh(): void {
        throw new Error("Method not implemented.");
    }    spawnCommander(): void {
        throw new Error("Method not implemented.");
    }
    init(): void {
        throw new Error("Method not implemented.");
    }
    run(): void {
        throw new Error("Method not implemented.");
    }


}
