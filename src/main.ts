import './prototypes/Creep';
import './prototypes/miscellaneous';
import './prototypes/Room';
import './prototypes/RoomObject';
import './prototypes/RoomPosition';
import './prototypes/RoomStructures';
import './prototypes/RoomVisiual';
import './prototypes/Structures';
import './console/global';

import Havester from "./creeps/roles/havester";
import Upgrader from "./creeps/roles/upgrader";
import Worker from "./creeps/roles/worker";
import Filler from "./creeps/roles/filler";
import Transporter from "./creeps/roles/transport";
import Mem from "./memory/memory";
import Cobal from "./Cobal";
import Stats from './stats/stats';

const maxHavesters = 2;
const maxUpgraders = 4;
const maxBuilders = 2;
const maxTransporters = 2;
const maxFillers = 2;
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const main = () => {
};

export const loop = () => {
    Mem.load();
    if(!Mem.shouldRun()) return;
    Mem.clean();
    // main();

    cobal_loop();
    Stats.run()
    global.Cobal.postRun();
}

const cobal_loop = () => {
    if(!global.Cobal || global.Cobal.shouldBuild || Game.time >= global.Cobal.expiration){
        delete global.Cobal;
        Mem.garbageCollect(true);
        global.Cobal = new Cobal();
        global.Cobal.build();
    } else {
        global.Cobal.refresh();
    }

    global.Cobal.init();
    global.Cobal.run();
}

function onGobalReset() {
    Mem.format();
    Memory.stats.persistent.lastGlobalReset = Game.time;
    global.Cobal = new Cobal();
}

onGobalReset();
