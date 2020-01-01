import { Base, getAllBases } from 'Base';
import { RoomPlanner } from 'roomPlanner/roomPlanner';
import { $ } from '../caching/GlobalCache';
import { log } from '../console/log';
import Mem from '../memory/memory';
import { MatrixTypes, Pathing } from '../movement/Pathing';
import { getCacheExpiration, onPublicServer } from '../utils/utils';

export interface RoadPlannerMemory {
	roadLookup: { [roomName: string]: { [roadCoordName: string]: boolean } };
	roadCoverage: number;
	roadCoverages: {
		[destination: string]: {
			roadCount: number;
			length: number;
			exp: number;
		}
	};
}

const PLAIN_COST = 3;
const SWAMP_COST = 4;
const WALL_COST = 15 * PLAIN_COST;
const EXISTING_PATH_COST = PLAIN_COST - 1;

const memoryDefaults: RoadPlannerMemory = {
	roadLookup   : {},
	roadCoverage : 0.0,
	roadCoverages: {}
};

export class RoadPlanner {

	roomPlanner: RoomPlanner;
	base: Base;
	memory: RoadPlannerMemory;
	roadPositions: RoomPosition[];
	costMatrices: { [roomName: string]: CostMatrix };

	static settings = {
		encourageRoadMerging          : true,
		recalculateRoadNetworkInterval: onPublicServer() ? 3000 : 1000, // recalculate road networks this often
		recomputeCoverageInterval     : onPublicServer() ? 1000 : 500,	// recompute coverage to each destination this often
		buildRoadsAtRCL               : 4,
	};

	constructor(roomPlanner: RoomPlanner) {
		this.roomPlanner = roomPlanner;
		this.base = roomPlanner.base;
		this.memory = Mem.wrap(this.base.memory, 'roadPlanner', memoryDefaults);
		this.costMatrices = {};
		this.roadPositions = [];
	}

	refresh(): void {
		this.memory = Mem.wrap(this.base.memory, 'roadPlanner', memoryDefaults);
		this.costMatrices = {};
		this.roadPositions = [];
	}

	get roadCoverage(): number {
		return this.memory.roadCoverage;
	}

	private recomputeRoadCoverages(storagePos: RoomPosition) {
		// Compute coverage for each path
		for (const destination of this.base.destinations) {
			const destName = destination.pos.name;
			if (!this.memory.roadCoverages[destName] || Game.time > this.memory.roadCoverages[destName].exp) {
				const roadCoverage = this.computeRoadCoverage(storagePos, destination.pos);
				if (roadCoverage != undefined) {
					// Set expiration to be longer if road is nearly complete
					const expiration = roadCoverage.roadCount / roadCoverage.length >= 0.75
									 ? getCacheExpiration(RoadPlanner.settings.recomputeCoverageInterval)
									 : getCacheExpiration(3 * RoadPlanner.settings.recomputeCoverageInterval);
					this.memory.roadCoverages[destName] = {
						roadCount: roadCoverage.roadCount,
						length   : roadCoverage.length,
						exp      : expiration
					};
				} else {
					if (this.memory.roadCoverages[destName]) {
						// if you already have some data, use it for a little while
						const waitTime = onPublicServer() ? 500 : 200;
						this.memory.roadCoverages[destName].exp += waitTime;
					} else {
						// otherwise put in a placeholder
						const waitTime = onPublicServer() ? 300 : 100;
						this.memory.roadCoverages[destName] = {
							roadCount: 0,
							length   : 1,
							exp      : Game.time + waitTime
						};
					}
				}
				log.debug(`Recomputing road coverage from ${storagePos.print} to ${destination.pos.print}... ` +
						  `Coverage: ${JSON.stringify(roadCoverage)}`);
			}
		}
		// Store the aggregate roadCoverage score
		let totalRoadCount = 0;
		let totalPathLength = 0;
		for (const destName in this.memory.roadCoverages) {
			const {roadCount, length, exp} = this.memory.roadCoverages[destName];
			totalRoadCount += roadCount;
			totalPathLength += length;
		}
		this.memory.roadCoverage = totalRoadCount / totalPathLength;
	}

	private computeRoadCoverage(storagePos: RoomPosition,
								destination: RoomPosition): { roadCount: number, length: number } | undefined {
		const ret = Pathing.findPath(storagePos, destination, {terrainCosts: {plainCost: 2, swampCost: 10}});
		const path = ret.path;
		const roomNames = _.unique(_.map(path, pos => pos.roomName));
		// If you have vision or cached vision of the room
		if (_.all(roomNames, roomName => Game.rooms[roomName] || $.costMatrixRecall(roomName, MatrixTypes.default))) {
			let roadCount = 0;
			for (const pos of path) {
				if (Game.rooms[pos.roomName]) {
					if (pos.lookForStructure(STRUCTURE_ROAD)) {
						roadCount++;
					}
				} else {
					const mat = $.costMatrixRecall(pos.roomName, MatrixTypes.default);
					if (mat) {
						if (mat.get(pos.x, pos.y) == 1) {
							roadCount++;
						}
					} else { // shouldn't happen
						log.warning(`No vision or recalled cost matrix in room ${pos.roomName}! (Why?)`);
					}
				}
			}
			return {roadCount: roadCount, length: path.length};
		}
	}

	private recalculateRoadNetwork(storagePos: RoomPosition, obstacles: RoomPosition[]): void {
		this.buildRoadNetwork(storagePos, obstacles);
		this.finalize();
	}

	// Connect commandCenter to hatchery, upgradeSites, and all miningSites, and place containers
	private buildRoadNetwork(storagePos: RoomPosition, obstacles: RoomPosition[]): void {
		this.costMatrices = {};
		this.roadPositions = [];
		const destinations = _.sortBy(this.base.destinations, destination => destination.order);
		// Connect commandCenter to each destination in base
		for (const destination of destinations) {
			this.planRoad(storagePos, destination.pos, obstacles);
		}
		this.formatRoadPositions();
	}

	// Plan a road between two locations avoiding a list of planned obstacles; pos1 should be storage for best results
	private planRoad(pos1: RoomPosition, pos2: RoomPosition, obstacles: RoomPosition[]): void {
		// Find the shortest path, preferentially stepping on tiles with road routing flags on them
		const roadPath = this.generateRoadPath(pos1, pos2, obstacles);
		if (roadPath) {
			this.roadPositions = this.roadPositions.concat(roadPath);
		}
	}

	private generateRoadPlanningCostMatrix(roomName: string, obstacles: RoomPosition[]): CostMatrix {

		const matrix = new PathFinder.CostMatrix();
		const terrain = Game.map.getRoomTerrain(roomName);

		for (let y = 0; y < 50; ++y) {
			for (let x = 0; x < 50; ++x) {
				switch (terrain.get(x, y)) {
					case TERRAIN_MASK_SWAMP:
						matrix.set(x, y, SWAMP_COST);
						break;
					case TERRAIN_MASK_WALL:
						if (x != 0 && y != 0 && x != 49 && y != 49) {
							// Can't tunnel through walls on edge tiles
							matrix.set(x, y, WALL_COST);
						}
						break;
					default: // plain
						matrix.set(x, y, PLAIN_COST);
						break;
				}
			}
		}

		for (const pos of obstacles) {
			if (pos.roomName == roomName) {
				matrix.set(pos.x, pos.y, 0xff);
			}
		}

		const room = Game.rooms[roomName];
		if (room) {
			const impassibleStructures: Structure[] = [];
			_.forEach(room.find(FIND_STRUCTURES), (s: Structure) => {
				if (!s.isWalkable) {
					impassibleStructures.push(s);
				}
			});
			_.forEach(impassibleStructures, s => matrix.set(s.pos.x, s.pos.y, 0xff));
			// Set passability of construction sites
			_.forEach(room.find(FIND_MY_CONSTRUCTION_SITES), (site: ConstructionSite) => {
				if (!site.isWalkable) {
					matrix.set(site.pos.x, site.pos.y, 0xff);
				}
			});
		}

		return matrix;
	}

	/* Generates a road path and modifies cost matrices to encourage merging with future roads */
	private generateRoadPath(origin: RoomPosition, destination: RoomPosition,
							 obstacles: RoomPosition[]): RoomPosition[] | undefined {

		const callback = (roomName: string): CostMatrix | boolean => {
			if (!this.base.roomNames.includes(roomName)) { // only route through base rooms
				return false;
			}
			if (Pathing.shouldAvoid(roomName) && roomName != origin.roomName && roomName != destination.roomName) {
				return false;
			}
			if (!this.costMatrices[roomName]) {
				this.costMatrices[roomName] = this.generateRoadPlanningCostMatrix(roomName, obstacles);
			}
			return this.costMatrices[roomName];
		};

		const ret = PathFinder.search(origin, {pos: destination, range: 1}, {roomCallback: callback, maxOps: 40000});

		if (ret.incomplete) {
			log.warning(`Roadplanner for ${this.base.print}: could not plan road path!`);
			return;
		}

		// Reduce the cost of planned paths to encourage road overlap for future pathing
		if (RoadPlanner.settings.encourageRoadMerging) {
			for (const i of _.range(ret.path.length)) {
				const pos = ret.path[i];
				if (i % 2 == 0 && this.costMatrices[pos.roomName] && !pos.isEdge) {
					this.costMatrices[pos.roomName].set(pos.x, pos.y, EXISTING_PATH_COST);
				}
			}
		}
		// Return the pathfinder results
		return ret.path;
	}

	/* Ensure that the roads doesn't overlap with roads from this.map and that the positions are unique */
	private formatRoadPositions(): void {
		// Make road position list unique
		this.roadPositions = _.unique(this.roadPositions);
		// Remove roads located on exit tiles
		_.remove(this.roadPositions, pos => pos.isEdge);
		// Remove any roads duplicated in this.map
		const roomPlannerRoads = this.roomPlanner.plannedStructurePositions(STRUCTURE_ROAD);
		if (roomPlannerRoads != undefined) {
			_.remove(this.roadPositions, pos => roomPlannerRoads!.includes(pos));
		}
	}

	/* Write everything to memory after roomPlanner is closed */
	finalize(): void {
		// Collect all roads from this and from room planner
		let roomPlannerRoads: RoomPosition[];
		if (_.keys(this.roomPlanner.map).length > 0) { // use active map
			roomPlannerRoads = this.roomPlanner.map[STRUCTURE_ROAD];
		} else { // retrieve from memory
			if (this.roomPlanner.memory.bunkerData && this.roomPlanner.memory.bunkerData.anchor) {
				const layout = this.roomPlanner.getStructureMapForBunkerAt(this.roomPlanner.memory.bunkerData.anchor);
				roomPlannerRoads = layout[STRUCTURE_ROAD];
			} else if (this.roomPlanner.memory.mapsByLevel) {
				roomPlannerRoads = _.map(this.roomPlanner.memory.mapsByLevel[8][STRUCTURE_ROAD],
										 protoPos => derefRoomPosition(protoPos));
			} else {
				log.error(`RoadPlanner@${this.base.room.print}: could not get road positions from room planner!`);
				roomPlannerRoads = [];
			}
		}
		const allRoadPos: RoomPosition[] = _.compact(this.roadPositions.concat(roomPlannerRoads));
		// Encode the coordinates of the road as keys in a truthy hash table for fast lookup
		this.memory.roadLookup = {};
		for (const pos of allRoadPos) {
			if (!this.memory.roadLookup[pos.roomName]) this.memory.roadLookup[pos.roomName] = {};
			this.memory.roadLookup[pos.roomName][pos.coordName] = true;
		}
	}

	init(): void {

	}

	static shouldBuild(structureType: BuildableStructureConstant, pos: RoomPosition): boolean {
		if (!pos.room) return false;
		const buildings = _.filter(pos.lookFor(LOOK_STRUCTURES), s => s && s.structureType == structureType);
		const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
		if (!buildings || buildings.length == 0) {
			if (!sites || sites.length == 0) {
				return true;
			}
		}
		return false;
	}

	/* Create construction sites for any buildings that need to be built */
	private buildMissing(): void {
		// Max buildings that can be placed each tick
		let count = RoomPlanner.settings.maxSitesPerColony - this.base.constructionSites.length;
		// Build missing roads
		let roadPositions = [];
		for (const roomName in this.memory.roadLookup) {
			for (const coords of _.keys(this.memory.roadLookup[roomName])) {
				const [x, y] = coords.split(':');
				roadPositions.push(new RoomPosition(parseInt(x, 10), parseInt(y, 10), roomName));
			}
		}
		const origin = (this.base.storage || this.base.handOfNod || this.base).pos;
		roadPositions = _.sortBy(roadPositions, pos => pos.getMultiRoomRangeTo(origin));
		for (const pos of roadPositions) {
			if (count > 0 && RoomPlanner.canBuild(STRUCTURE_ROAD, pos)) {
				const ret = pos.createConstructionSite(STRUCTURE_ROAD);
				if (ret != OK) {
					log.warning(`${this.base.name}: couldn't create road site at ${pos.print}. Result: ${ret}`);
				} else {
					count--;
				}
			}
		}
	}

	/* Quick lookup for if a road should be in this position. Roads returning false won't be maintained. */
	roadShouldBeHere(pos: RoomPosition): boolean {
		// Initial migration code, can delete later
		if (this.memory.roadLookup[pos.roomName]) {
			return this.memory.roadLookup[pos.roomName][pos.coordName];
		}
		return false;
	}

	run(): void {
		if (this.roomPlanner.active) {
			if (this.roomPlanner.storagePos) {
				this.buildRoadNetwork(this.roomPlanner.storagePos, this.roomPlanner.getObstacles());
			}
			// this.visuals();
		} else {
			// Once in a blue moon, recalculate the entire network and write to memory to keep it up to date
			if (Game.time % RoadPlanner.settings.recalculateRoadNetworkInterval == this.base.id) {
				if (this.roomPlanner.storagePos) {
					this.recalculateRoadNetwork(this.roomPlanner.storagePos, this.roomPlanner.getObstacles());
				}
			}
			// Recompute coverage to destinations
			if (Game.time % getAllBases().length == this.base.id && this.roomPlanner.storagePos) {
				this.recomputeRoadCoverages(this.roomPlanner.storagePos);
			}
			// Build missing roads
			if (this.base.level >= RoadPlanner.settings.buildRoadsAtRCL && this.roomPlanner.shouldRecheck(3)) {
				this.buildMissing();
			}
		}
	}

	// visuals(): void {
	// 	// Draw the map
	// 	Visualizer.drawRoads(this.roadPositions);
	// }
}
