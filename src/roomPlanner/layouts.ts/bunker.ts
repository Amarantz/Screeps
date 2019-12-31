import Base from '../../Base';
import {coordName} from '../../utils/utils';
import {getAllStructureCoordsFromLayout, StructureLayout} from '../RoomPlanner';


export const BUNKER_RADIUS = 6;

export const bunkerLayout: StructureLayout = {
	data: {
		anchor: {x: 25, y: 25}
	},
	1   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '1',
		buildings: {
			spawn: {pos: [{x: 29, y: 25}]}
		}
	},
	2   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '2',
		buildings: {
			extension: {
				pos: [{x: 28, y: 26}, {x: 28, y: 27}, {x: 27, y: 27}, {
					x: 27,
					y: 28
				}, {x: 29, y: 26}]
			},
			spawn    : {pos: [{x: 29, y: 25}]},
			container: {pos: [{x: 27, y: 30}]}
		}
	},
	3   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '3',
		buildings: {
			tower    : {pos: [{x: 25, y: 26}]},
			extension: {
				pos: [{x: 28, y: 26}, {x: 29, y: 27}, {x: 28, y: 27}, {
					x: 27,
					y: 27
				}, {x: 27, y: 28}, {x: 28, y: 28}, {x: 29, y: 28}, {x: 28, y: 29}, {
					x: 27,
					y: 29
				}, {x: 29, y: 26}]
			},
			spawn    : {pos: [{x: 29, y: 25}]},
			container: {pos: [{x: 27, y: 30}]}
		}
	},
	4   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '4',
		buildings: {
			storage   : {pos: [{x: 24, y: 25}]},
			terminal  : {pos: []},
			nuker     : {pos: []},
			tower     : {pos: [{x: 25, y: 26}]},
			powerSpawn: {pos: []},
			link      : {pos: []},
			road      : {
				pos: [{x: 24, y: 23}, {x: 25, y: 22}, {x: 26, y: 23}, {
					x: 27,
					y: 24
				}, {x: 28, y: 25}, {x: 27, y: 26}, {x: 26, y: 27}, {x: 25, y: 28}, {
					x: 24,
					y: 27
				}, {x: 23, y: 26}, {x: 22, y: 25}, {x: 23, y: 24}, {x: 28, y: 20}, {
					x: 30,
					y: 22
				}, {x: 24, y: 21}, {x: 30, y: 28}, {x: 28, y: 30}, {x: 26, y: 29}, {
					x: 20,
					y: 22
				}, {x: 22, y: 20}, {x: 20, y: 28}, {x: 22, y: 30}, {x: 24, y: 19}, {
					x: 26,
					y: 19
				}, {x: 27, y: 19}, {x: 31, y: 23}, {x: 31, y: 24}, {x: 31, y: 25}, {
					x: 31,
					y: 26
				}, {x: 31, y: 27}, {x: 27, y: 31}, {x: 27, y: 31}, {x: 26, y: 31}, {
					x: 24,
					y: 31
				}, {x: 23, y: 31}, {x: 19, y: 27}, {x: 19, y: 26}, {x: 19, y: 25}, {
					x: 19,
					y: 24
				}, {x: 25, y: 19}, {x: 19, y: 23}, {x: 25, y: 31}, {x: 23, y: 19}, {
					x: 29,
					y: 21
				}, {x: 21, y: 21}, {x: 21, y: 29}, {x: 29, y: 29}, {x: 21, y: 26}, {
					x: 29,
					y: 24
				}, {x: 30, y: 23}, {x: 20, y: 27}, {x: 23, y: 25}, {x: 27, y: 25}, {
					x: 23,
					y: 20
				}, {x: 24, y: 28}, {x: 23, y: 29}, {x: 23, y: 30}, {x: 27, y: 30}]
			},
			observer  : {pos: []},
			lab       : {pos: []},
			extension : {
				pos: [{x: 30, y: 24}, {x: 30, y: 25}, {x: 30, y: 26}, {
					x: 28,
					y: 26
				}, {x: 29, y: 27}, {x: 28, y: 27}, {x: 27, y: 27}, {x: 27, y: 28}, {
					x: 28,
					y: 28
				}, {x: 29, y: 28}, {x: 28, y: 29}, {x: 27, y: 29}, {x: 26, y: 28}, {
					x: 24,
					y: 30
				}, {x: 25, y: 30}, {x: 26, y: 30}, {x: 29, y: 26}, {x: 24, y: 29}, {
					x: 30,
					y: 27
				}, {x: 25, y: 29}]
			},
			spawn     : {pos: [{x: 29, y: 25}]},
			container : {pos: [{x: 27, y: 30}]}
		}
	},
	5   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '5',
		buildings: {
			storage   : {pos: [{x: 24, y: 25}]},
			terminal  : {pos: []},
			nuker     : {pos: []},
			tower     : {pos: [{x: 25, y: 24}, {x: 25, y: 26}]},
			powerSpawn: {pos: []},
			link      : {pos: [{x: 26, y: 26}]},
			road      : {
				pos: [{x: 24, y: 23}, {x: 25, y: 22}, {x: 26, y: 23}, {
					x: 27,
					y: 24
				}, {x: 28, y: 25}, {x: 27, y: 26}, {x: 26, y: 27}, {x: 25, y: 28}, {
					x: 24,
					y: 27
				}, {x: 23, y: 26}, {x: 22, y: 25}, {x: 23, y: 24}, {x: 28, y: 20}, {
					x: 30,
					y: 22
				}, {x: 24, y: 21}, {x: 30, y: 28}, {x: 28, y: 30}, {x: 26, y: 29}, {
					x: 20,
					y: 22
				}, {x: 22, y: 20}, {x: 20, y: 28}, {x: 22, y: 30}, {x: 24, y: 19}, {
					x: 26,
					y: 19
				}, {x: 27, y: 19}, {x: 31, y: 23}, {x: 31, y: 24}, {x: 31, y: 25}, {
					x: 31,
					y: 26
				}, {x: 31, y: 27}, {x: 27, y: 31}, {x: 27, y: 31}, {x: 26, y: 31}, {
					x: 24,
					y: 31
				}, {x: 23, y: 31}, {x: 19, y: 27}, {x: 19, y: 26}, {x: 19, y: 25}, {
					x: 19,
					y: 24
				}, {x: 25, y: 19}, {x: 19, y: 23}, {x: 25, y: 31}, {x: 23, y: 19}, {
					x: 29,
					y: 21
				}, {x: 21, y: 21}, {x: 21, y: 29}, {x: 29, y: 29}, {x: 21, y: 26}, {
					x: 29,
					y: 24
				}, {x: 30, y: 23}, {x: 20, y: 27}, {x: 23, y: 25}, {x: 27, y: 25}, {
					x: 23,
					y: 20
				}, {x: 27, y: 30}]
			},
			observer  : {pos: []},
			lab       : {pos: []},
			extension : {
				pos: [{x: 30, y: 24}, {x: 30, y: 25}, {x: 30, y: 26}, {
					x: 28,
					y: 26
				}, {x: 29, y: 27}, {x: 28, y: 27}, {x: 27, y: 27}, {x: 27, y: 28}, {
					x: 28,
					y: 28
				}, {x: 29, y: 28}, {x: 28, y: 29}, {x: 27, y: 29}, {x: 26, y: 28}, {
					x: 23,
					y: 27
				}, {x: 24, y: 28}, {x: 23, y: 28}, {x: 22, y: 27}, {x: 21, y: 27}, {
					x: 22,
					y: 28
				}, {x: 23, y: 29}, {x: 21, y: 28}, {x: 24, y: 30}, {x: 25, y: 30}, {
					x: 26,
					y: 30
				}, {x: 29, y: 26}, {x: 24, y: 29}, {x: 23, y: 30}, {x: 30, y: 27}, {
					x: 25,
					y: 29
				}, {x: 22, y: 29}]
			},
			spawn     : {pos: [{x: 29, y: 25}]},
			container : {pos: [{x: 27, y: 30}]}
		}
	},
	6   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '6',
		buildings: {
			storage   : {pos: [{x: 24, y: 25}]},
			terminal  : {pos: [{x: 26, y: 25}]},
			nuker     : {pos: []},
			tower     : {pos: [{x: 25, y: 24}, {x: 25, y: 26}]},
			powerSpawn: {pos: []},
			link      : {pos: [{x: 26, y: 26}]},
			road      : {
				pos: [{x: 24, y: 23}, {x: 25, y: 22}, {x: 26, y: 23}, {
					x: 27,
					y: 24
				}, {x: 28, y: 25}, {x: 27, y: 26}, {x: 26, y: 27}, {x: 25, y: 28}, {
					x: 24,
					y: 27
				}, {x: 23, y: 26}, {x: 22, y: 25}, {x: 23, y: 24}, {x: 28, y: 20}, {
					x: 30,
					y: 22
				}, {x: 24, y: 21}, {x: 30, y: 28}, {x: 28, y: 30}, {x: 26, y: 29}, {
					x: 20,
					y: 22
				}, {x: 22, y: 20}, {x: 20, y: 28}, {x: 22, y: 30}, {x: 24, y: 19}, {
					x: 26,
					y: 19
				}, {x: 27, y: 19}, {x: 31, y: 23}, {x: 31, y: 24}, {x: 31, y: 25}, {
					x: 31,
					y: 26
				}, {x: 31, y: 27}, {x: 27, y: 31}, {x: 27, y: 31}, {x: 26, y: 31}, {
					x: 24,
					y: 31
				}, {x: 23, y: 31}, {x: 19, y: 27}, {x: 19, y: 26}, {x: 19, y: 25}, {
					x: 19,
					y: 24
				}, {x: 25, y: 19}, {x: 19, y: 23}, {x: 25, y: 31}, {x: 23, y: 19}, {
					x: 29,
					y: 21
				}, {x: 21, y: 21}, {x: 21, y: 29}, {x: 29, y: 29}, {x: 21, y: 26}, {
					x: 29,
					y: 24
				}, {x: 30, y: 23}, {x: 20, y: 27}, {x: 23, y: 25}, {x: 27, y: 25}, {
					x: 22,
					y: 22
				}, {x: 23, y: 23}, {x: 23, y: 20}, {x: 27, y: 30}]
			},
			observer  : {pos: []},
			lab       : {pos: [{x: 27, y: 23}, {x: 28, y: 24}, {x: 28, y: 23}]},
			extension : {
				pos: [{x: 22, y: 24}, {x: 22, y: 23}, {x: 21, y: 23}, {
					x: 30,
					y: 24
				}, {x: 30, y: 25}, {x: 30, y: 26}, {x: 20, y: 24}, {x: 20, y: 25}, {
					x: 20,
					y: 26
				}, {x: 21, y: 22}, {x: 28, y: 26}, {x: 29, y: 27}, {x: 28, y: 27}, {
					x: 27,
					y: 27
				}, {x: 27, y: 28}, {x: 28, y: 28}, {x: 29, y: 28}, {x: 28, y: 29}, {
					x: 27,
					y: 29
				}, {x: 26, y: 28}, {x: 22, y: 26}, {x: 23, y: 27}, {x: 24, y: 28}, {
					x: 23,
					y: 28
				}, {x: 22, y: 27}, {x: 21, y: 27}, {x: 22, y: 28}, {x: 23, y: 29}, {
					x: 22,
					y: 29
				}, {x: 21, y: 28}, {x: 24, y: 30}, {x: 25, y: 30}, {x: 26, y: 30}, {
					x: 29,
					y: 26
				}, {x: 21, y: 24}, {x: 24, y: 29}, {x: 23, y: 30}, {x: 20, y: 23}, {
					x: 30,
					y: 27
				}, {x: 25, y: 29}]
			},
			spawn     : {pos: [{x: 29, y: 25}]},
			container : {pos: [{x: 27, y: 30}]}
		}
	},
	7   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '7',
		buildings: {
			storage   : {pos: [{x: 24, y: 25}]},
			terminal  : {pos: [{x: 26, y: 25}]},
			nuker     : {pos: []},
			tower     : {pos: [{x: 25, y: 24}, {x: 25, y: 26}, {x: 25, y: 23}]},
			powerSpawn: {pos: []},
			link      : {pos: [{x: 26, y: 26}]},
			road      : {
				pos: [{x: 24, y: 23}, {x: 25, y: 22}, {x: 26, y: 23}, {
					x: 27,
					y: 24
				}, {x: 28, y: 25}, {x: 27, y: 26}, {x: 26, y: 27}, {x: 25, y: 28}, {
					x: 24,
					y: 27
				}, {x: 23, y: 26}, {x: 22, y: 25}, {x: 23, y: 24}, {x: 28, y: 20}, {
					x: 30,
					y: 22
				}, {x: 24, y: 21}, {x: 30, y: 28}, {x: 28, y: 30}, {x: 26, y: 29}, {
					x: 20,
					y: 22
				}, {x: 22, y: 20}, {x: 20, y: 28}, {x: 22, y: 30}, {x: 24, y: 19}, {
					x: 26,
					y: 19
				}, {x: 27, y: 19}, {x: 31, y: 23}, {x: 31, y: 24}, {x: 31, y: 25}, {
					x: 31,
					y: 26
				}, {x: 31, y: 27}, {x: 27, y: 31}, {x: 27, y: 31}, {x: 26, y: 31}, {
					x: 24,
					y: 31
				}, {x: 23, y: 31}, {x: 19, y: 27}, {x: 19, y: 26}, {x: 19, y: 25}, {
					x: 19,
					y: 24
				}, {x: 25, y: 19}, {x: 19, y: 23}, {x: 25, y: 31}, {x: 23, y: 19}, {
					x: 29,
					y: 21
				}, {x: 21, y: 21}, {x: 21, y: 29}, {x: 29, y: 29}, {x: 21, y: 26}, {
					x: 29,
					y: 24
				}, {x: 30, y: 23}, {x: 20, y: 27}, {x: 27, y: 22}, {x: 28, y: 21}, {
					x: 23,
					y: 25
				}, {x: 27, y: 25}, {x: 27, y: 30}, {x: 23, y: 20}]
			},
			observer  : {pos: []},
			lab       : {
				pos: [{x: 27, y: 23}, {x: 28, y: 24}, {x: 28, y: 22}, {
					x: 28,
					y: 23
				}, {x: 29, y: 23}, {x: 29, y: 22}]
			},
			extension : {
				pos: [{x: 24, y: 22}, {x: 23, y: 23}, {x: 22, y: 24}, {
					x: 22,
					y: 23
				}, {x: 23, y: 22}, {x: 23, y: 21}, {x: 22, y: 22}, {x: 21, y: 23}, {
					x: 25,
					y: 20
				}, {x: 26, y: 20}, {x: 30, y: 24}, {x: 30, y: 25}, {x: 30, y: 26}, {
					x: 20,
					y: 24
				}, {x: 20, y: 25}, {x: 20, y: 26}, {x: 22, y: 21}, {x: 21, y: 22}, {
					x: 28,
					y: 26
				}, {x: 29, y: 27}, {x: 28, y: 27}, {x: 27, y: 27}, {x: 27, y: 28}, {
					x: 28,
					y: 28
				}, {x: 29, y: 28}, {x: 28, y: 29}, {x: 27, y: 29}, {x: 26, y: 28}, {
					x: 22,
					y: 26
				}, {x: 23, y: 27}, {x: 24, y: 28}, {x: 23, y: 28}, {x: 22, y: 27}, {
					x: 21,
					y: 27
				}, {x: 22, y: 28}, {x: 23, y: 29}, {x: 22, y: 29}, {x: 21, y: 28}, {
					x: 24,
					y: 30
				}, {x: 25, y: 30}, {x: 26, y: 30}, {x: 29, y: 26}, {x: 21, y: 24}, {
					x: 26,
					y: 21
				}, {x: 24, y: 29}, {x: 23, y: 30}, {x: 20, y: 23}, {x: 27, y: 20}, {
					x: 30,
					y: 27
				}, {x: 25, y: 29}]
			},
			spawn     : {pos: [{x: 29, y: 25}, {x: 26, y: 24}]},
			container : {pos: [{x: 27, y: 30}, {x: 23, y: 20}]}
		}
	},
	8   : {
		name     : 'bunkerCore',
		shard    : 'shard2',
		rcl      : '8',
		buildings: {
			storage   : {pos: [{x: 24, y: 25}]},
			terminal  : {pos: [{x: 26, y: 25}]},
			nuker     : {pos: [{x: 24, y: 24}]},
			tower     : {
				pos: [{x: 27, y: 25}, {x: 23, y: 25}, {x: 25, y: 27}, {
					x: 25,
					y: 23
				}, {x: 25, y: 24}, {x: 25, y: 26}]
			},
			powerSpawn: {pos: [{x: 24, y: 26}]},
			link      : {pos: [{x: 26, y: 26}]},
			road      : {
				pos: [{x: 24, y: 23}, {x: 25, y: 22}, {x: 26, y: 23}, {
					x: 27,
					y: 24
				}, {x: 28, y: 25}, {x: 27, y: 26}, {x: 26, y: 27}, {x: 25, y: 28}, {
					x: 24,
					y: 27
				}, {x: 23, y: 26}, {x: 22, y: 25}, {x: 23, y: 24}, {x: 28, y: 20}, {
					x: 30,
					y: 22
				}, {x: 24, y: 21}, {x: 30, y: 28}, {x: 28, y: 30}, {x: 26, y: 29}, {
					x: 20,
					y: 22
				}, {x: 22, y: 20}, {x: 20, y: 28}, {x: 22, y: 30}, {x: 24, y: 19}, {
					x: 26,
					y: 19
				}, {x: 27, y: 19}, {x: 31, y: 23}, {x: 31, y: 24}, {x: 31, y: 25}, {
					x: 31,
					y: 26
				}, {x: 31, y: 27}, {x: 27, y: 31}, {x: 27, y: 31}, {x: 26, y: 31}, {
					x: 24,
					y: 31
				}, {x: 23, y: 31}, {x: 19, y: 27}, {x: 19, y: 26}, {x: 19, y: 25}, {
					x: 19,
					y: 24
				}, {x: 25, y: 19}, {x: 19, y: 23}, {x: 25, y: 31}, {x: 23, y: 19}, {
					x: 29,
					y: 21
				}, {x: 21, y: 21}, {x: 21, y: 29}, {x: 29, y: 29}, {x: 21, y: 26}, {
					x: 29,
					y: 24
				}, {x: 30, y: 23}, {x: 20, y: 27}, {x: 27, y: 30}, {x: 23, y: 20}]
			},
			observer  : {pos: [{x: 21, y: 25}]},
			lab       : {
				pos: [{x: 26, y: 22}, {x: 27, y: 23}, {x: 28, y: 24}, {
					x: 27,
					y: 22
				}, {x: 27, y: 21}, {x: 28, y: 22}, {x: 28, y: 23}, {x: 29, y: 23}, {
					x: 28,
					y: 21
				}, {x: 29, y: 22}]
			},
			extension : {
				pos: [{x: 24, y: 22}, {x: 23, y: 23}, {x: 22, y: 24}, {
					x: 22,
					y: 23
				}, {x: 23, y: 22}, {x: 23, y: 21}, {x: 22, y: 22}, {x: 21, y: 23}, {
					x: 24,
					y: 20
				}, {x: 25, y: 20}, {x: 26, y: 20}, {x: 30, y: 24}, {x: 30, y: 25}, {
					x: 30,
					y: 26
				}, {x: 20, y: 24}, {x: 20, y: 25}, {x: 20, y: 26}, {x: 22, y: 21}, {
					x: 21,
					y: 22
				}, {x: 28, y: 26}, {x: 29, y: 27}, {x: 28, y: 27}, {x: 27, y: 27}, {
					x: 27,
					y: 28
				}, {x: 28, y: 28}, {x: 29, y: 28}, {x: 28, y: 29}, {x: 27, y: 29}, {
					x: 26,
					y: 28
				}, {x: 22, y: 26}, {x: 23, y: 27}, {x: 24, y: 28}, {x: 23, y: 28}, {
					x: 22,
					y: 27
				}, {x: 21, y: 27}, {x: 22, y: 28}, {x: 23, y: 29}, {x: 22, y: 29}, {
					x: 21,
					y: 28
				}, {x: 24, y: 30}, {x: 25, y: 30}, {x: 26, y: 30}, {x: 29, y: 26}, {
					x: 21,
					y: 24
				}, {x: 26, y: 21}, {x: 24, y: 29}, {x: 23, y: 30}, {x: 20, y: 23}, {
					x: 27,
					y: 20
				}, {x: 30, y: 27}, {x: 25, y: 29}]
			},
			spawn     : {pos: [{x: 29, y: 25}, {x: 26, y: 24}, {x: 25, y: 21}]},
			container : {pos: [{x: 27, y: 30}, {x: 23, y: 20}]}
		}
	}
};

const _allBunkerCoords: { [rcl: number]: Coord[] } = {};
for (const rcl of [1, 2, 3, 4, 5, 6, 7, 8]) {
	if (bunkerLayout[rcl]!.buildings) {
		_allBunkerCoords[rcl] = getAllStructureCoordsFromLayout(bunkerLayout, rcl);
	}
	if (rcl == 7 || rcl == 8) { // add center tile for advanced bunkers
		_allBunkerCoords[rcl].push(bunkerLayout.data.anchor);
	}
}
export const allBunkerCoords = _allBunkerCoords;

export const bunkerCoordLookup = _.mapValues(_allBunkerCoords,
											 (coordArr: Coord[]) =>
												 _.zipObject(_.map(coordArr,
																   c => [coordName(c), true])
												 )) as { [rcl: number]: { [coordName: string]: true | undefined } };

// Fast function for checking if a position is inside the bunker
export function insideBunkerBounds(pos: RoomPosition, base: Base): boolean {
	if (base.roomPlanner.memory.bunkerData && base.roomPlanner.memory.bunkerData.anchor) {
		const dx = bunkerLayout.data.anchor.x - base.roomPlanner.memory.bunkerData.anchor.x;
		const dy = bunkerLayout.data.anchor.y - base.roomPlanner.memory.bunkerData.anchor.y;
		const coord = {x: pos.x + dx, y: pos.y + dy};
		return (!!bunkerCoordLookup[base.level][coordName(coord)]);
	}
	return false;
}


export function getPosFromBunkerCoord(coord: Coord, base: Base): RoomPosition {
	if (base.roomPlanner.memory.bunkerData && base.roomPlanner.memory.bunkerData.anchor) {
		const dx = base.roomPlanner.memory.bunkerData.anchor.x - bunkerLayout.data.anchor.x;
		const dy = base.roomPlanner.memory.bunkerData.anchor.y - bunkerLayout.data.anchor.y;
		return new RoomPosition(coord.x + dx, coord.y + dy, base.room.name);
	}
	console.log('getPosFromBunkerCoord: shouldn\'t reach here! Unprotected call from non-bunker?');
	return new RoomPosition(-1, -1, 'invalid');
}

// Spots where queens can sit to be renewed when idle
export const bunkerChargingSpots: Coord[] = [{x: 29, y: 24}, {x: 24, y: 21}];

// Efficient, hard-coded order in which to refill extensions, spawns, labs, and towers
export const quadrantFillOrder = {
	lowerRight: [{x: 30, y: 24}, {x: 30, y: 25}, {x: 29, y: 25}, {x: 29, y: 26}, {x: 28, y: 26}, {
		x: 27,
		y: 25
	}, {x: 28, y: 27}, {x: 27, y: 27}, {x: 27, y: 28}, {x: 26, y: 28}, {x: 27, y: 29}, {
		x: 28,
		y: 29
	}, {x: 28, y: 28}, {x: 29, y: 28}, {x: 29, y: 27}, {x: 30, y: 27}, {x: 30, y: 26}],
	lowerLeft : [{x: 22, y: 26}, {x: 22, y: 27}, {x: 23, y: 27}, {x: 23, y: 28}, {
		x: 24,
		y: 28
	}, {x: 25, y: 27}, {x: 24, y: 29}, {x: 25, y: 29}, {x: 25, y: 30}, {x: 26, y: 30}, {
		x: 24,
		y: 30
	}, {x: 23, y: 30}, {x: 23, y: 29}, {x: 22, y: 29}, {x: 22, y: 28}, {x: 21, y: 28}, {
		x: 21,
		y: 27
	}],
	upperLeft : [{x: 23, y: 21}, {x: 23, y: 22}, {x: 24, y: 22}, {x: 23, y: 23}, {
		x: 22,
		y: 23
	}, {x: 22, y: 24}, {x: 23, y: 25}, {x: 21, y: 24}, {x: 21, y: 25}, {x: 20, y: 25}, {
		x: 20,
		y: 26
	}, {x: 22, y: 21}, {x: 22, y: 22}, {x: 21, y: 22}, {x: 21, y: 23}, {x: 20, y: 23}, {
		x: 20,
		y: 24
	}],
	upperRight: [{x: 24, y: 20}, {x: 25, y: 20}, {x: 25, y: 21}, {x: 26, y: 21}, {
		x: 26,
		y: 22
	}, {x: 27, y: 22}, {x: 27, y: 23}, {x: 25, y: 23}, {x: 28, y: 23}, {x: 28, y: 24}, {
		x: 29,
		y: 23
	}, {x: 29, y: 22}, {x: 28, y: 22}, {x: 28, y: 21}, {x: 27, y: 21}, {x: 27, y: 20}, {
		x: 26,
		y: 20
	}]
};

// Used to generate energy structure ordering for spawn.spawnCreep()
export const energyStructureOrder: Coord[] = (<Coord[]>[]).concat(quadrantFillOrder.lowerRight,
																  quadrantFillOrder.upperLeft,
																  quadrantFillOrder.lowerLeft,
																  quadrantFillOrder.upperRight);

