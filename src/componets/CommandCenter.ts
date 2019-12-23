import { Component } from "./_componet";
import { Base } from "Base";
import { $ } from "caching/GlobalCache";
import Mem from "memory/memory";
import { Cartographer } from "utils/Cartographer";
import { Priority } from "priorities/Priorities";

export const MAX_OBSERVER_DISTANCE = 7;

interface CommandCenterMemory {
    idlePos?: ProtoPos;
}

export class CommandCenter extends Component {
    static settings = {
        enabledIdleObservation: true,
        linksTransmitAt: LINK_CAPACITY - 100,
        refillTowerBelow: 750,
    };
    storage: StructureStorage;
    terminal: StructureTerminal | undefined;
    powerSpawn: StructurePowerSpawn | undefined;
    nuker: StructureNuker | undefined;
    observer: StructureObserver | undefined;
    link: StructureLink | undefined;
    towers: StructureTower[];
    observerRoom: any;
    transportRequests: any;
    terminalNetwork: any;

    constructor(base: Base, storage: StructureStorage){
        super(base, storage, 'commandCenter');
        this.memory = Mem.wrap(this.base.memory, 'commandCenter');
        this.storage = storage;
        this.terminal = base.terminal;
        this.powerSpawn = base.powerSpawn;
        this.nuker = base.nuker;
        this.observer = base.observer;
        if(this.base.bunker) {
            this.link = this.base.bunker.anchor.findClosestByLimitedRange(base.availableLinks, 1);
            this.base.linkNetwork.claimLink(this.link);
            this.towers = this.base.bunker.anchor.findInRange(base.towers, 1);
        } else {
            this.link = this.pos.findClosestByLimitedRange(base.availableLinks, 2);
            this.base.linkNetwork.claimLink(this.link);
            this.towers = this.base.bunker.anchor.findInRange(base.towers, 3);
        }
        this.terminalNetwork = global.Cobal.terminalNetwork as TerminalNetwork;
        this.transportRequests = new TransportRequestGroup();
        this.observerRoom = undefined;
    }

    refresh() {
        this.memory = Mem.wrap(this.base.memory, 'commandCenter');
        $.refreshRoom(this);
        $.refresh(this, 'storage', 'terminal', 'powerSpawn', 'nuker', 'observer', 'link', 'towers');
        this.transportRequests.refresh();
        this.observerRoom = undefined;
    }

    spawnCommander() {
        if(this.link || this.terminal) {
            this.commander = new CommandCenterCommander(this);
        }
    }

    get idlePos(): RoomPosition {
        if(this.base.bunker){
            return this.base.bunker.anchor;
        }
        if(!this.memory.idlePos || Game.time % 25 == 0){
            this.memory.idlePos = this.findIdlePos();
        }
        return derefRoomPosition(this.memory.idlePos);
    }

    private findIdlePos(): RoomPosition {
        const proximateStructures: Structure[] = _.compact([
            this.link!, this.terminal!, this.nuker!, ...this.towers
        ]);
        const numNearbyStructures = (pos: RoomPosition) => _.filter(proximateStructures, s => s.pos.isNearTo(pos) && !s.pos.isEqualTo(pos)).length;
        return _.last(_.sortBy(this.storage.pos.neighbors, pos => numNearbyStructures(pos)));
    }

    private registerLinkTransferRequests(): void {
        if(this.link){
            this.link.store.getUsedCapacity(RESOURCE_ENERGY) > CommandCenter.settings.linksTransmitAt && this.base.linkNetwork.requestTransmit(this.link);
        }
    }
    requestRoomObservation(roomName: string){
        this.observerRoom = roomName;
    }

    private registerRequests(): void {
        if(this.link && this.link.store.getUsedCapacity(RESOURCE_ENERGY) < .9 * this.link.store.getCapacity(RESOURCE_ENERGY) && this.link.cooldown <= 1){
            if(this.base.linkNetwork.receive.lenght > 0) {
                this.transportRequests.requestInput(this.link, Priority.Critical)
            }
        }

        const refillTowers = _.filter(this.towers, tower => tower.store.getUsedCapacity(RESOURCE_ENERGY) < CommandCenter.settings.refillTowerBelow);
        _.forEach(refillTowers, tower => this.transportRequests.requestInput(tower, Priority.High));

        if(this.base.bunker && this.base.bunker.coreSpawn){
            if(this.base.bunker.coreSpawn.store.getUsedCompacity(RESOURCE_ENERGY) < this.base.bunker.coreSpawn.store.getCapacity()){
                this.transportRequests.requestInput(this.base.bunker.coreSpawn, Priority.Normal);
            }
        }

        if (this.link && this.link.energy > 0){
            if (this.base.linkNetwork.receive.length == 0 || this.link.cooldown > 3){
                this.transportRequests.requestOutput(this.link, Priority.High);
            }
        }
    }
    private runObserver(): void {
        if(this.observer){
            if( this.observerRoom) {
                this.observer.observeRoom(this.observerRoom);
            } else if (CommandCenter.settings.enabledIdleObservation){
                const dx = Game.time % MAX_OBSERVER_DISTANCE;
                const dy = Game.time % (MAX_OBSERVER_DISTANCE ** 2);
                const roomToObserver = Cartographer.findRelativeRoomName(this.pos.roomName, dx, dy);
                this.observer.observeRoom(roomToObserver)
            }
        }
    }

    init(): void {
        this.registerLinkTransferRequests();
        this.registerRequests();
    }

    run(): void {
        this.runObserver()
    }
}
