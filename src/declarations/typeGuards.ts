import { Unit } from '../unit/Unit';

export interface EnergyStructure extends Structure {
	energy: number;
	energyCapacity: number;
}

export interface StoreStructure extends Structure {
	store: StoreDefinition;
	storeCapacity: number;
}

export function isEnergyStructure(obj: RoomObject): obj is EnergyStructure {
	return (<EnergyStructure>obj).energy != undefined && (<EnergyStructure>obj).energyCapacity != undefined;
}

export function isStoreStructure(obj: RoomObject): obj is StoreStructure {
	return (<StoreStructure>obj).store != undefined && (<StoreStructure>obj).storeCapacity != undefined;
}

export function isStructure(obj: RoomObject): obj is Structure {
	return (<Structure>obj).structureType != undefined;
}

export function isOwnedStructure(structure: Structure): structure is OwnedStructure {
	return (<OwnedStructure>structure).owner != undefined;
}

export function isSource(obj: Source | Mineral): obj is Source {
	return (<Source>obj).energy != undefined;
}

export function isTombstone(obj: RoomObject): obj is Tombstone {
	return (<Tombstone>obj).deathTime != undefined;
}

export function isResource(obj: RoomObject): obj is Resource {
	return (<Resource>obj).amount != undefined;
}

export function hasPos(obj: HasPos | RoomPosition): obj is HasPos {
	return (<HasPos>obj).pos != undefined;
}

export function isCreep(obj: RoomObject): obj is Creep {
	return (<Creep>obj).fatigue != undefined;
}

export function isPowerCreep(obj: RoomObject): obj is PowerCreep {
    return (<PowerCreep>obj).powers != undefined;
}

export function isUnit(creep: Creep | Unit): creep is Unit {
	return (<Unit>creep).creep != undefined;
}
