/**
 * Example usage of CollisionDetectionService
 * 
 * Demonstrates how to use the collision detection system for road and building placement
 * in the OpenTTD-style city generation.
 */

import { CollisionDetectionService } from '../application/services/collision-detection.service';
import { RoadGenerationState, RoadTile, Direction } from '../data/models/city-generation';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { GenerationLoggerService } from '../application/services/generation-logger.service';

export class CollisionDetectionExample {
  private collisionService: CollisionDetectionService;
  private roadState: RoadGenerationState = {
    placedRoads: new Map(),
    currentSegments: [],
    intersections: [],
    deadEnds: [],
    corners: []
  };
  private buildingMap: Map<string, any> = new Map();

  constructor() {
    const terrainService = new TerrainGenerationService(new GenerationLoggerService());
    this.collisionService = new CollisionDetectionService(terrainService);
    this.initializeState();
  }

  private initializeState(): void {
    this.roadState = {
      placedRoads: new Map<string, RoadTile>(),
      currentSegments: [],
      intersections: [],
      deadEnds: [],
      corners: []
    };
    this.buildingMap = new Map();
  }

  /**
   * Example: Building a simple crossroad with collision checking
   */
  buildCrossroadWithCollisionChecking(centerX: number, centerZ: number): boolean {
    console.log(`Building crossroad at (${centerX}, ${centerZ})`);

    // Check if we can place the center intersection
    const centerResult = this.collisionService.canPlaceRoad(centerX, centerZ, this.roadState);
    if (centerResult.hasCollision) {
      console.log(`Cannot place center intersection: ${centerResult.message}`);
      return false;
    }

    // Place center intersection
    this.placeRoad(centerX, centerZ, [Direction.North, Direction.South, Direction.East, Direction.West], true);

    // Try to extend roads in each direction
    const directions = [
      { dx: 1, dz: 0, name: 'East' },
      { dx: -1, dz: 0, name: 'West' },
      { dx: 0, dz: 1, name: 'South' },
      { dx: 0, dz: -1, name: 'North' }
    ];

    let successfulExtensions = 0;

    for (const dir of directions) {
      const success = this.extendRoadWithCollisionChecking(centerX, centerZ, dir.dx, dir.dz, 3, dir.name);
      if (success) {
        successfulExtensions++;
      }
    }

    console.log(`Crossroad completed with ${successfulExtensions}/4 successful extensions`);
    return successfulExtensions > 0;
  }

  /**
   * Example: Extending a road in a direction with collision checking
   */
  private extendRoadWithCollisionChecking(
    startX: number, 
    startZ: number, 
    deltaX: number, 
    deltaZ: number, 
    maxLength: number,
    directionName: string
  ): boolean {
    console.log(`Extending road ${directionName} from (${startX}, ${startZ})`);

    for (let i = 1; i <= maxLength; i++) {
      const newX = startX + deltaX * i;
      const newZ = startZ + deltaZ * i;

      const result = this.collisionService.canPlaceRoad(newX, newZ, this.roadState);
      if (result.hasCollision) {
        console.log(`  Road extension stopped at length ${i - 1}: ${result.message}`);
        return i > 1; // Success if we placed at least one road tile
      }

      // Place the road
      const connections = deltaX !== 0 ? [Direction.East, Direction.West] : [Direction.North, Direction.South];
      this.placeRoad(newX, newZ, connections, false);
      console.log(`  Placed road tile at (${newX}, ${newZ})`);
    }

    console.log(`  Road extension completed full length of ${maxLength}`);
    return true;
  }

  /**
   * Example: Placing buildings with collision and adjacency checking
   */
  placeBuildingsWithCollisionChecking(targetCount: number): number {
    console.log(`Attempting to place ${targetCount} buildings`);
    let placedCount = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 10; // Prevent infinite loops

    while (placedCount < targetCount && attempts < maxAttempts) {
      attempts++;

      // Generate random position near existing roads
      const position = this.findRandomBuildingSpot();
      if (!position) {
        continue;
      }

      // Check if we can place a building here
      const result = this.collisionService.canPlaceBuilding(position.x, position.z, this.roadState, this.buildingMap);
      if (result.hasCollision) {
        console.log(`  Cannot place building at (${position.x}, ${position.z}): ${result.message}`);
        continue;
      }

      // Check if building is adjacent to a road
      if (!this.collisionService.isAdjacentToRoad(position.x, position.z, this.roadState)) {
        console.log(`  Building at (${position.x}, ${position.z}) is not adjacent to road`);
        continue;
      }

      // Check if building would block road extensions
      if (this.collisionService.wouldBlockRoadExtension(position.x, position.z, this.roadState)) {
        console.log(`  Building at (${position.x}, ${position.z}) would block road extension`);
        continue;
      }

      // Place the building
      this.placeBuilding(position.x, position.z);
      placedCount++;
      console.log(`  Placed building ${placedCount} at (${position.x}, ${position.z})`);
    }

    console.log(`Building placement completed: ${placedCount}/${targetCount} buildings placed in ${attempts} attempts`);
    return placedCount;
  }

  /**
   * Example: Validating a complete road segment before construction
   */
  validateAndBuildRoadSegment(startX: number, startZ: number, endX: number, endZ: number): boolean {
    console.log(`Validating road segment from (${startX}, ${startZ}) to (${endX}, ${endZ})`);

    const result = this.collisionService.validateRoadSegment(startX, startZ, endX, endZ, this.roadState);
    if (result.hasCollision) {
      console.log(`  Road segment validation failed: ${result.message}`);
      return false;
    }

    // Build the segment tile by tile
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const length = Math.max(Math.abs(deltaX), Math.abs(deltaZ));

    for (let i = 0; i <= length; i++) {
      const progress = length === 0 ? 0 : i / length;
      const x = Math.round(startX + deltaX * progress);
      const z = Math.round(startZ + deltaZ * progress);

      const connections = deltaX !== 0 ? [Direction.East, Direction.West] : [Direction.North, Direction.South];
      this.placeRoad(x, z, connections, false);
    }

    console.log(`  Road segment built successfully`);
    return true;
  }

  /**
   * Helper: Place a road tile in the state
   */
  private placeRoad(x: number, z: number, connections: Direction[], isIntersection: boolean): void {
    const roadTile: RoadTile = {
      x,
      z,
      connections,
      isIntersection,
      isCorner: false,
      isDeadEnd: connections.length === 1
    };

    this.roadState.placedRoads.set(`${x},${z}`, roadTile);

    if (isIntersection) {
      this.roadState.intersections.push({ x, z });
    } else if (roadTile.isDeadEnd) {
      this.roadState.deadEnds.push({ x, z });
    }
  }

  /**
   * Helper: Place a building in the state
   */
  private placeBuilding(x: number, z: number): void {
    this.buildingMap.set(`${x},${z}`, {
      type: 'house',
      population: 4
    });
  }

  /**
   * Helper: Find a random spot near existing roads for building placement
   */
  private findRandomBuildingSpot(): { x: number, z: number } | null {
    // Get all road positions
    const roadPositions = Array.from(this.roadState.placedRoads.keys()).map(key => {
      const [x, z] = key.split(',').map(Number);
      return { x, z };
    });

    if (roadPositions.length === 0) {
      return null;
    }

    // Pick a random road and find adjacent empty spots
    const randomRoad = roadPositions[Math.floor(Math.random() * roadPositions.length)];
    const adjacentPositions = this.collisionService.getAdjacentPositions(randomRoad.x, randomRoad.z);

    // Filter to empty positions
    const emptyPositions = adjacentPositions.filter(pos => {
      const key = `${pos.x},${pos.z}`;
      return !this.roadState.placedRoads.has(key) && !this.buildingMap.has(key);
    });

    if (emptyPositions.length === 0) {
      return null;
    }

    return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  }

  /**
   * Get current state for inspection
   */
  getState() {
    return {
      roads: Array.from(this.roadState.placedRoads.entries()),
      buildings: Array.from(this.buildingMap.entries()),
      intersections: this.roadState.intersections,
      deadEnds: this.roadState.deadEnds
    };
  }

  /**
   * Run a complete example
   */
  runCompleteExample(): void {
    console.log('=== Collision Detection Service Example ===');
    
    // 1. Build a crossroad
    const crossroadSuccess = this.buildCrossroadWithCollisionChecking(0, 0);
    console.log(`Crossroad construction: ${crossroadSuccess ? 'SUCCESS' : 'FAILED'}`);

    // 2. Try to build additional road segments
    this.validateAndBuildRoadSegment(3, 0, 6, 0);
    this.validateAndBuildRoadSegment(0, 3, 0, 6);

    // 3. Place some buildings
    const buildingsPlaced = this.placeBuildingsWithCollisionChecking(5);
    console.log(`Buildings placed: ${buildingsPlaced}`);

    // 4. Show final state
    const state = this.getState();
    console.log('Final state:', {
      roadCount: state.roads.length,
      buildingCount: state.buildings.length,
      intersectionCount: state.intersections.length,
      deadEndCount: state.deadEnds.length
    });

    console.log('=== Example Complete ===');
  }
}

// Example usage:
// const example = new CollisionDetectionExample();
// example.runCompleteExample();