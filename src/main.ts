import './console/global';
import './prototypes/Creep';
import './prototypes/miscellaneous';
import './prototypes/Room';
import './prototypes/RoomObject';
import './prototypes/RoomPosition';
import './prototypes/RoomStructures';
import './prototypes/RoomVisiual';
import './prototypes/Structures';
import './tasks/initializer';

import Mem from "./memory/memory";
import { Cobal } from "./Cobal";
import Stats from './stats/stats';
export const loop = () => {
    Mem.load();
    if(!Mem.shouldRun()) return;
    Mem.clean();
    // main();

    cobal_loop();
	Stats.run()
	global.Cobal.visuals();
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
