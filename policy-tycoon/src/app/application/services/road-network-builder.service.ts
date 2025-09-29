/**
 * Road Network Builder Service for OpenTTD-style City Generation
 * 
 * Implements the crossroad-based road layout algorithm that creates
 * authentic OpenTTD-style road networks with organic growth patterns.
 */

import { Injectable } from '@angular/core';
import { 
  RoadNetworkBuilder as IRoadNetworkBuilder,
  RoadNetwork, 
  RoadSegment, 
  RoadGenerationState, 
  RoadTile, 
  Point, 
  Direction, 
  CornerDirection,
  CornerInfo,
  SeededRandom 
} from '../../data/models/city-generation';
import { CollisionDetectionService } from './collision-detection.service';
import { GenerationLoggerService } from './generation-logger.service';
import { TerrainGenerationService } from './terrain-generation.service'; // NEW: Import terrain service

@Injectable({
  providedIn: 'root'
})
export class RoadNetworkBuilderService implements IRoadNetworkBuilder {

  protected logger: GenerationLoggerService;
  protected collisionDetection: CollisionDetectionService;
  protected terrainGeneration: TerrainGenerationService;
  
  // Get the map bounds based on the current road network
  public getMapBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    // Default bounds (can be adjusted based on your requirements)
    return {
      minX: -100,
      maxX: 100,
      minZ: -100,
      maxZ: 100
    };
  }
  
  constructor(
    collisionDetection: CollisionDetectionService,
    logger: GenerationLoggerService,
    terrainGeneration: TerrainGenerationService
  ) {
    this.collisionDetection = collisionDetection;
    this.logger = logger;
    this.terrainGeneration = terrainGeneration;
  }

  public buildInitialNetwork(centerX: number, centerZ: number, rng: SeededRandom): RoadNetwork {
    this.logger.info(`Building initial road network at center (${centerX}, ${centerZ})`);
    
    try {
      // Validate inputs
      if (!Number.isInteger(centerX) || !Number.isInteger(centerZ)) {
        const error = new Error(`Invalid center coordinates: (${centerX}, ${centerZ}). Coordinates must be integers.`);
        this.logger.error('Invalid center coordinates', error);
        throw error;
      }

      const state: RoadGenerationState = {
        placedRoads: new Map<string, RoadTile>(),
        currentSegments: [],
        intersections: [],
        deadEnds: [],
        corners: []
      };

      // Step 1: Create central crossroad
      this.logger.info('Creating central crossroad');
      this.createCentralCrossroad(centerX, centerZ, state);
      this.logger.info(`Created central crossroad with ${state.intersections.length} intersections`);

      // Step 2: Extend road arms with possibility of diagonal segments
      this.logger.info('Extending road arms');
      this.extendRoadArms(centerX, centerZ, state, rng);
      this.logger.info(`Extended road arms, now have ${state.deadEnds.length} dead ends`);

      // Step 3: Add perpendicular segments and diagonal connections
      this.logger.info('Adding perpendicular and diagonal segments');
      this.addPerpendicularAndDiagonalSegments(state, rng);
      this.logger.info(`Added perpendicular and diagonal segments, now have ${state.corners.length} corners`);

      // Step 4: Classify road segments
      this.logger.info('Classifying road segments');
      this.classifyRoadSegments(state);
      this.logger.info(`Classification complete, total segments: ${state.currentSegments.length}`);

      this.logger.info(`Road network generation complete with ${state.currentSegments.length} segments, ${state.intersections.length} intersections, ${state.deadEnds.length} dead ends, ${state.corners.length} corners`);

      return {
        segments: state.currentSegments,
        intersections: state.intersections,
        deadEnds: state.deadEnds
      };
    } catch (error) {
      this.logger.error(`Failed to build road network at center (${centerX}, ${centerZ})`, error);
      
      // Requirement 10.1 - Error handling for terrain collision during road generation
      // Return minimal road network as fallback
      return {
        segments: [],
        intersections: [],
        deadEnds: []
      };
    }
  }

  /**
   * Create central crossroad with 4 road segments extending 2 tiles in each cardinal direction
   * Requirements: 1.1
   */
  protected createCentralCrossroad(centerX: number, centerZ: number, state: RoadGenerationState): void {
    // Place center intersection
    const centerKey = `${centerX},${centerZ}`;
    const centerTile: RoadTile = {
      x: centerX,
      z: centerZ,
      connections: [Direction.North, Direction.South, Direction.East, Direction.West],
      isIntersection: true,
      isCorner: false,
      isDeadEnd: false
    };
    
    state.placedRoads.set(centerKey, centerTile);
    state.intersections.push({ x: centerX, z: centerZ });

    // Create 4 road segments extending 2 tiles in each cardinal direction
    const directions = [
      { dir: Direction.North, deltaX: 0, deltaZ: -1 },
      { dir: Direction.South, deltaX: 0, deltaZ: 1 },
      { dir: Direction.East, deltaX: 1, deltaZ: 0 },
      { dir: Direction.West, deltaX: -1, deltaZ: 0 }
    ];

    directions.forEach(({ dir, deltaX, deltaZ }) => {
      this.createRoadArm(centerX, centerZ, deltaX, deltaZ, 2, dir, state);
    });

    // Create intersection road segment for the center
    const intersectionSegment: RoadSegment = {
      startX: centerX,
      startZ: centerZ,
      endX: centerX,
      endZ: centerZ,
      roadType: 'intersection',
      gridX: centerX,
      gridZ: centerZ,
      connections: [Direction.North, Direction.South, Direction.East, Direction.West]
    };
    
    state.currentSegments.push(intersectionSegment);
  }

  /**
   * Extend a road arm extending from center in specified direction
   * Requirements: 10.1
   */
  private createRoadArm(
    startX: number, 
    startZ: number, 
    deltaX: number, 
    deltaZ: number, 
    length: number, 
    direction: Direction,
    state: RoadGenerationState
  ): void {
    this.logger.info(`Creating road arm from (${startX},${startZ}) in direction ${direction} for ${length} tiles`);
    
    let tilesPlaced = 0;
    
    for (let i = 1; i <= length; i++) {
      const roadX = startX + (deltaX * i);
      const roadZ = startZ + (deltaZ * i);
      
      try {
        // Check for collision before placing road tile
        const collisionResult = this.collisionDetection.canPlaceRoad(roadX, roadZ, state);
        if (collisionResult.hasCollision) {
          // Requirement 10.1 - Comprehensive error handling for terrain collision during road generation
          this.logger.warn(`Collision detected at (${roadX},${roadZ}) during road arm creation: ${collisionResult.collisionType} - ${collisionResult.message || 'No details'}`);
          
          // Stop extending this arm if collision detected
          break;
        }

        // NEW: Check passability between previous tile and current tile
        if (i > 1) {
          const prevX = startX + (deltaX * (i - 1));
          const prevZ = startZ + (deltaZ * (i - 1));
          if (!this.collisionDetection.isPassable(prevX, prevZ, roadX, roadZ)) {
            this.logger.warn(`Cannot place road at (${roadX},${roadZ}) due to impassable height difference from (${prevX},${prevZ})`);
            break;
          }
        } else {
          // For the first tile, check passability from the center
          if (!this.collisionDetection.isPassable(startX, startZ, roadX, roadZ)) {
            this.logger.warn(`Cannot place road at (${roadX},${roadZ}) due to impassable height difference from center (${startX},${startZ})`);
            break;
          }
        }

        // Place road tile
        const roadKey = `${roadX},${roadZ}`;
        const roadTile: RoadTile = {
          x: roadX,
          z: roadZ,
          connections: [direction, this.getOppositeDirection(direction)],
          isIntersection: false,
          isCorner: false,
          isDeadEnd: i === length // Last tile in arm is a dead end for now
        };
        
        state.placedRoads.set(roadKey, roadTile);
        tilesPlaced++;
        
        // Add to dead ends if this is the last tile
        if (i === length) {
          state.deadEnds.push({ x: roadX, z: roadZ });
        }

        // Create road segment for this tile
        const segment: RoadSegment = {
          startX: roadX,
          startZ: roadZ,
          endX: roadX,
          endZ: roadZ,
          roadType: deltaX === 0 ? 'vertical' : 'horizontal',
          gridX: roadX,
          gridZ: roadZ,
          connections: [direction, this.getOppositeDirection(direction)]
        };
        
        state.currentSegments.push(segment);
      } catch (error) {
        this.logger.error(`Error placing road tile at (${roadX},${roadZ})`, error);
        // Continue with other tiles rather than stopping completely
        continue;
      }
    }
    
    this.logger.info(`Successfully placed ${tilesPlaced} road tiles in arm`);
  }

  /**
   * Extend road arms from the central crossroad with random lengths
   * Requirements: 1.2, 1.4
   */
  protected extendRoadArms(centerX: number, centerZ: number, state: RoadGenerationState, rng: SeededRandom): void {
    this.logger.info('Extending road arms');
    
    // Get the existing dead ends from the initial crossroad (they are at distance 2 from center)
    const initialDeadEnds = [...state.deadEnds];
    
    // Clear dead ends as we'll be extending them
    state.deadEnds = [];

    // Extend each initial dead end with random length
    initialDeadEnds.forEach(deadEnd => {
      // Determine the direction from center to this dead end
      const direction = this.getDirectionFromCenter(deadEnd, centerX, centerZ);
      // Generate a random length between 3 and 6 tiles
      const maxLength = rng.nextIntInclusive(3, 6);
      this.extendRoadArmFromDeadEnd(deadEnd, direction, maxLength, state, rng);
    });
    
    this.logger.info(`Extended road arms, now have ${state.deadEnds.length} dead ends`);
  }

  /**
   * Extend a road arm from a dead end
   * Requirements: 1.2, 10.1
   */
  private extendRoadArmFromDeadEnd(
    deadEnd: Point, 
    direction: Direction, 
    maxLength: number, 
    state: RoadGenerationState, 
    rng: SeededRandom
  ): void {
    const { deltaX, deltaZ } = this.getDirectionDeltas(direction);
    
    this.logger.info(`Extending road arm from dead end (${deadEnd.x},${deadEnd.z}) in direction ${direction} for up to ${maxLength} tiles`);
    
    let actualLength = 0;
    
    for (let i = 1; i <= maxLength; i++) {
      const newX = deadEnd.x + (deltaX * i);
      const newZ = deadEnd.z + (deltaZ * i);
      
      // Check for collision before placing road tile
      const collisionResult = this.collisionDetection.canPlaceRoad(newX, newZ, state);
      if (collisionResult.hasCollision) {
        // Requirement 10.1 - Comprehensive error handling for terrain collision during road generation
        this.logger.warn(`Collision detected at (${newX},${newZ}) during road extension: ${collisionResult.collisionType} - ${collisionResult.message || 'No details'}`);
        break;
      }

      // NEW: Check passability between previous tile and current tile
      const prevX = deadEnd.x + (deltaX * (i - 1));
      const prevZ = deadEnd.z + (deltaZ * (i - 1));
      if (!this.collisionDetection.isPassable(prevX, prevZ, newX, newZ)) {
        this.logger.warn(`Cannot place road at (${newX},${newZ}) due to impassable height difference from (${prevX},${prevZ})`);
        break;
      }

      // Place road tile
      const roadKey = `${newX},${newZ}`;
      const roadTile: RoadTile = {
        x: newX,
        z: newZ,
        connections: [direction, this.getOppositeDirection(direction)],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: true // Will be updated if we continue extending
      };
      
      state.placedRoads.set(roadKey, roadTile);
      actualLength = i;

      // Create road segment for this tile
      const segment: RoadSegment = {
        startX: newX,
        startZ: newZ,
        endX: newX,
        endZ: newZ,
        roadType: deltaX === 0 ? 'vertical' : 'horizontal',
        gridX: newX,
        gridZ: newZ,
        connections: [direction, this.getOppositeDirection(direction)]
      };
      
      state.currentSegments.push(segment);
    }

    // Update the final tile as the new dead end
    if (actualLength > 0) {
      // Update the original dead end tile to no longer be a dead end
      const originalDeadEndKey = `${deadEnd.x},${deadEnd.z}`;
      const originalDeadEndTile = state.placedRoads.get(originalDeadEndKey);
      if (originalDeadEndTile) {
        originalDeadEndTile.isDeadEnd = false;
      }
      
      // Add the new dead end
      const finalX = deadEnd.x + (deltaX * actualLength);
      const finalZ = deadEnd.z + (deltaZ * actualLength);
      state.deadEnds.push({ x: finalX, z: finalZ });
    } else {
      // If we couldn't extend at all, the original dead end remains
      state.deadEnds.push(deadEnd);
    }
  }

  /**
   * Determine direction from center to a point
   */
  private getDirectionFromCenter(point: Point, centerX: number, centerZ: number): Direction {
    const deltaX = point.x - centerX;
    const deltaZ = point.z - centerZ;
    
    if (Math.abs(deltaX) > Math.abs(deltaZ)) {
      return deltaX > 0 ? Direction.East : Direction.West;
    } else {
      return deltaZ > 0 ? Direction.South : Direction.North;
    }
  }

  // Get direction deltas for movement
  protected getDirectionDeltas(direction: Direction): { deltaX: number, deltaZ: number } {
    switch (direction) {
      case Direction.North: return { deltaX: 0, deltaZ: -1 };
      case Direction.South: return { deltaX: 0, deltaZ: 1 };
      case Direction.East: return { deltaX: 1, deltaZ: 0 };
      case Direction.West: return { deltaX: -1, deltaZ: 0 };
      case Direction.Northeast: return { deltaX: 1, deltaZ: -1 };
      case Direction.Southeast: return { deltaX: 1, deltaZ: 1 };
      case Direction.Southwest: return { deltaX: -1, deltaZ: 1 };
      case Direction.Northwest: return { deltaX: -1, deltaZ: -1 };
      default: throw new Error(`Unknown direction: ${direction}`);
    }
  }

  // Utility method to get the opposite direction
  protected getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
      case Direction.North: return Direction.South;
      case Direction.East: return Direction.West;
      case Direction.South: return Direction.North;
      case Direction.West: return Direction.East;
      case Direction.Northeast: return Direction.Southwest;
      case Direction.Southeast: return Direction.Northwest;
      case Direction.Southwest: return Direction.Northeast;
      case Direction.Northwest: return Direction.Southeast;
      default: return direction;
    }
  }

  // Get perpendicular directions for a given direction
  protected getPerpendicularDirections(direction: Direction): { left: Direction, right: Direction } {
    switch (direction) {
      case Direction.North:
      case Direction.South:
        return { left: Direction.West, right: Direction.East };
      case Direction.East:
      case Direction.West:
        return { left: Direction.North, right: Direction.South };
      case Direction.Northeast:
      case Direction.Southwest:
        return { left: Direction.Northwest, right: Direction.Southeast };
      case Direction.Northwest:
      case Direction.Southeast:
        return { left: Direction.Southwest, right: Direction.Northeast };
      default:
        return { left: direction, right: direction };
    }
  }

  // Get the main direction from a set of connections
  protected getMainDirectionFromConnections(connections: Direction[]): Direction {
    // Simple implementation - return the first connection
    // In a real implementation, you might want to analyze the connections
    // to determine the main direction
    return connections.length > 0 ? connections[0] : Direction.North;
  }

  /**
   * Add perpendicular segments at the end of road arms
   * Requirements: 1.3, 1.5
   */
  private addPerpendicularSegments(state: RoadGenerationState, rng: SeededRandom): void {
    // Get current dead ends (these are the ends of the extended arms)
    const currentDeadEnds = [...state.deadEnds];
    
    // Clear dead ends as we'll be creating new ones
    state.deadEnds = [];

    // Add perpendicular segments to each dead end
    currentDeadEnds.forEach(deadEnd => {
      this.addPerpendicularSegmentAtDeadEnd(deadEnd, state, rng);
    });
  }

  /**
   * Add a perpendicular segment at a dead end with random length 2-3 tiles
   */
  private addPerpendicularSegmentAtDeadEnd(
    deadEnd: Point, 
    state: RoadGenerationState, 
    rng: SeededRandom
  ): void {
    // Get the current road tile to determine its direction
    const roadKey = `${deadEnd.x},${deadEnd.z}`;
    const roadTile = state.placedRoads.get(roadKey);
    
    if (!roadTile) {
      // If no road tile found, just keep the dead end
      state.deadEnds.push(deadEnd);
      return;
    }

    // Determine the main direction of the road leading to this dead end
    const mainDirection = this.getMainDirectionFromConnections(roadTile.connections);
    
    // Get perpendicular directions
    const perpendicularDirections = this.getPerpendicularDirections(mainDirection);
    
    // Randomly choose one or both perpendicular directions
    const shouldGoLeft = rng.nextBoolean(0.7); // 70% chance to go left
    const shouldGoRight = rng.nextBoolean(0.7); // 70% chance to go right
    
    let hasAnyExtension = false;

    // Try to extend in each chosen perpendicular direction
    if (shouldGoLeft) {
      const leftExtension = this.createPerpendicularExtension(
        deadEnd, mainDirection, perpendicularDirections.left, state, rng
      );
      if (leftExtension.length > 0) {
        hasAnyExtension = true;
      }
    }

    if (shouldGoRight) {
      const rightExtension = this.createPerpendicularExtension(
        deadEnd, mainDirection, perpendicularDirections.right, state, rng
      );
      if (rightExtension.length > 0) {
        hasAnyExtension = true;
      }
    }

    // Update the dead end tile to be a corner if we added perpendicular segments
    if (hasAnyExtension) {
      // Update the dead end tile to be a corner
      roadTile.isDeadEnd = false;
      roadTile.isCorner = true;
      
      // Update connections to include perpendicular directions
      const newConnections = [...roadTile.connections];
      if (shouldGoLeft) {
        newConnections.push(perpendicularDirections.left);
      }
      if (shouldGoRight) {
        newConnections.push(perpendicularDirections.right);
      }
      roadTile.connections = newConnections;

      // Create corner info
      const cornerDirection = this.determineCornerDirection(mainDirection, perpendicularDirections, shouldGoLeft, shouldGoRight);
      if (cornerDirection) {
        const cornerInfo: CornerInfo = {
          x: deadEnd.x,
          z: deadEnd.z,
          direction: cornerDirection,
          connectsFrom: this.getOppositeDirection(mainDirection),
          connectsTo: shouldGoLeft ? perpendicularDirections.left : perpendicularDirections.right
        };
        state.corners.push(cornerInfo);

        // Update the road segment to be a corner type
        const segmentIndex = state.currentSegments.findIndex(s => 
          s.startX === deadEnd.x && s.startZ === deadEnd.z
        );
        if (segmentIndex >= 0) {
          state.currentSegments[segmentIndex].roadType = 'corner';
          state.currentSegments[segmentIndex].cornerDirection = cornerDirection;
          state.currentSegments[segmentIndex].connections = newConnections;
        }
      }
    } else {
      // No extensions were possible, keep as dead end
      state.deadEnds.push(deadEnd);
    }
  }

  /**
   * Create a perpendicular extension from a point
   */
  protected createPerpendicularExtension(
    point: Point,
    mainDirection: Direction,
    perpendicularDirection: Direction,
    state: RoadGenerationState,
    rng: SeededRandom
  ): Point[] {
    // Simple implementation - create a single segment in the perpendicular direction
    const newPoint = this.getNextPoint(point, perpendicularDirection);
    if (this.isValidRoadPosition(newPoint, state)) {
      this.addRoadSegment(point, newPoint, state);
      return [newPoint];
    }
    return [];
  }

  /**
   * Add perpendicular segments and diagonal connections at the end of road arms
   * Enhanced for Task 8: Support diagonal road segments
   * Requirements: 7.3, 7.4
   */
  private addPerpendicularAndDiagonalSegments(state: RoadGenerationState, rng: SeededRandom): void {
    this.logger.info('Adding perpendicular and diagonal segments');
    
    // Get current dead ends (these are the ends of the extended arms)
    const currentDeadEnds = [...state.deadEnds];
    
    // Clear dead ends as we'll be creating new ones
    state.deadEnds = [];

    // Add perpendicular and diagonal segments to each dead end
    currentDeadEnds.forEach(deadEnd => {
      this.addPerpendicularAndDiagonalSegmentAtDeadEnd(deadEnd, state, rng);
    });
    
    this.logger.info(`Added perpendicular and diagonal segments, now have ${state.corners.length} corners`);
  }

  /**
   * Add perpendicular and diagonal segments at a dead end with random length 2-3 tiles
   * Enhanced for Task 8: Support diagonal road segments
   */
  protected addPerpendicularAndDiagonalSegmentAtDeadEnd(
    deadEnd: Point, 
    state: RoadGenerationState, 
    rng: SeededRandom,
    depth: number = 0,
    maxDepth: number = 3
  ): void {
    // Get the current road tile to determine its direction
    const roadKey = `${deadEnd.x},${deadEnd.z}`;
    const roadTile = state.placedRoads.get(roadKey);
    
    if (!roadTile) {
      // If no road tile found, just keep the dead end
      state.deadEnds.push(deadEnd);
      return;
    }

    // Determine the main direction of the road leading to this dead end
    const mainDirection = this.getMainDirectionFromConnections(roadTile.connections);
    
    // Get perpendicular directions
    const perpendicularDirections = this.getPerpendicularDirections(mainDirection);
    
    // Randomly choose one or both perpendicular directions
    const shouldGoLeft = rng.nextBoolean(0.7); // 70% chance to go left
    const shouldGoRight = rng.nextBoolean(0.7); // 70% chance to go right
    
    // Randomly decide whether to add diagonal connections (30% chance)
    const shouldAddDiagonal = rng.nextBoolean(0.3);
    
    let hasAnyExtension = false;

    // Try to extend in each chosen perpendicular direction
    if (shouldGoLeft) {
      const leftExtension = this.createPerpendicularExtension(
        deadEnd, mainDirection, perpendicularDirections.left, state, rng
      );
      if (leftExtension.length > 0) {
        hasAnyExtension = true;
      }
    }

    if (shouldGoRight) {
      const rightExtension = this.createPerpendicularExtension(
        deadEnd, mainDirection, perpendicularDirections.right, state, rng
      );
      if (rightExtension.length > 0) {
        hasAnyExtension = true;
      }
    }

    // Add diagonal connections if chosen
    if (shouldAddDiagonal) {
      this.createDiagonalExtension(deadEnd, mainDirection, state, rng);
      hasAnyExtension = true;
    }

    // Update the dead end tile to be a corner if we added perpendicular segments
    if (hasAnyExtension) {
      // Update the dead end tile to be a corner
      roadTile.isDeadEnd = false;
      roadTile.isCorner = true;
      
      // Update connections to include perpendicular directions
      const newConnections = [...roadTile.connections];
      if (shouldGoLeft) {
        newConnections.push(perpendicularDirections.left);
      }
      if (shouldGoRight) {
        newConnections.push(perpendicularDirections.right);
      }
      roadTile.connections = newConnections;

      // Create corner info
      const cornerDirection = this.determineCornerDirection(mainDirection, perpendicularDirections, shouldGoLeft, shouldGoRight);
      if (cornerDirection) {
        const cornerInfo: CornerInfo = {
          x: deadEnd.x,
          z: deadEnd.z,
          direction: cornerDirection,
          connectsFrom: this.getOppositeDirection(mainDirection),
          connectsTo: shouldGoLeft ? perpendicularDirections.left : perpendicularDirections.right
        };
        state.corners.push(cornerInfo);

        // Update the road segment to be a corner type
        const segmentIndex = state.currentSegments.findIndex(s => 
          s.startX === deadEnd.x && s.startZ === deadEnd.z
        );
        if (segmentIndex >= 0) {
          state.currentSegments[segmentIndex].roadType = 'corner';
          state.currentSegments[segmentIndex].cornerDirection = cornerDirection;
          state.currentSegments[segmentIndex].connections = newConnections;
        }
      }
    } else {
      // No extensions were possible, keep as dead end
      state.deadEnds.push(deadEnd);
    }
  }

  /**
   * Create a diagonal extension from a dead end
   * New for Task 8: Support diagonal road segments
   */
  protected createDiagonalExtension(
    point: Point,
    mainDirection: Direction,
    state: RoadGenerationState,
    rng: SeededRandom
  ): Point[] {
    // Simple implementation - create a single diagonal segment
    const newPoint = this.getNextPoint(point, mainDirection);
    if (this.isValidRoadPosition(newPoint, state)) {
      this.addRoadSegment(point, newPoint, state);
      return [newPoint];
    }
    return [];
  }

  /**
   * Classify road segments
   */
  protected classifyRoadSegments(state: RoadGenerationState): void {
    this.logger.info('Classifying road segments');
    
    // This is a placeholder implementation
    // In a real implementation, you would analyze the road segments
    // and classify them based on their connections, length, etc.
    state.currentSegments.forEach(segment => {
      // Simple classification based on connections
      const startKey = `${segment.startX},${segment.startZ}`;
      const endKey = `${segment.endX},${segment.endZ}`;
      
      const startTile = state.placedRoads.get(startKey);
      const endTile = state.placedRoads.get(endKey);
      
      if (startTile && endTile) {
        // Simple classification - adjust as needed
        if (startTile.connections.length > 2 || endTile.connections.length > 2) {
          // Fix: Use correct property names and types
          // segment.type = 'intersection'; // This property doesn't exist
          // Just leave as is since roadType is already set correctly
        } else if (startTile.connections.length === 1 || endTile.connections.length === 1) {
          // segment.type = 'dead-end'; // This property doesn't exist
          // Just leave as is since roadType is already set correctly
        } else {
          // segment.type = 'regular'; // This property doesn't exist and type is invalid
          // Just leave as is since roadType is already set correctly
        }
      }
    });
    
    this.logger.info(`Classification complete, total segments: ${state.currentSegments.length}`);
  }

  /**
   * Get the next point in a given direction from a starting point
   */
  protected getNextPoint(point: Point, direction: Direction): Point {
    const deltas = this.getDirectionDeltas(direction);
    return {
      x: point.x + deltas.deltaX,
      z: point.z + deltas.deltaZ
    };
  }

  /**
   * Check if a road position is valid (no collision)
   */
  protected isValidRoadPosition(point: Point, state: RoadGenerationState): boolean {
    const collisionResult = this.collisionDetection.canPlaceRoad(point.x, point.z, state);
    return !collisionResult.hasCollision;
  }

  /**
   * Add a road segment between two points
   */
  protected addRoadSegment(start: Point, end: Point, state: RoadGenerationState): void {
    const segment: RoadSegment = {
      startX: start.x,
      startZ: start.z,
      endX: end.x,
      endZ: end.z,
      roadType: 'horizontal', // Fix: Use correct type from the allowed values
      gridX: start.x,
      gridZ: start.z,
      connections: [] // Add connections array
    };
    state.currentSegments.push(segment);
  }

  /**
   * Determine corner direction based on main direction and perpendicular extensions
   */
  protected determineCornerDirection(
    mainDirection: Direction,
    perpendicularDirections: { left: Direction, right: Direction },
    goesLeft: boolean,
    goesRight: boolean
  ): CornerDirection | null {
    if (!goesLeft && !goesRight) {
      return null;
    }

    // Determine corner type based on the turn direction
    const turnDirection = goesLeft ? perpendicularDirections.left : perpendicularDirections.right;
    
    // Map direction combinations to corner types
    switch (mainDirection) {
      case Direction.North:
        return turnDirection === Direction.East ? CornerDirection.NE : CornerDirection.NW;
      case Direction.South:
        return turnDirection === Direction.East ? CornerDirection.SE : CornerDirection.SW;
      case Direction.East:
        return turnDirection === Direction.North ? CornerDirection.NE : CornerDirection.SE;
      case Direction.West:
        return turnDirection === Direction.North ? CornerDirection.NW : CornerDirection.SW;
      default:
        throw new Error(`Unknown direction: ${mainDirection}`);
    }
  }

  /**
   * Extend a road in a straight line from a starting point
   */
  protected extendStraightRoad(
    start: Point,
    direction: Direction,
    minLength: number,
    maxLength: number,
    state: RoadGenerationState,
    rng: SeededRandom,
    depth: number = 0,
    maxDepth: number = 0
  ): Point[] {
    // Get the current road tile to determine its direction
    const roadKey = `${start.x},${start.z}`;
    const roadTile = state.placedRoads.get(roadKey);
    
    if (roadTile) {
      const length = rng.nextInt(minLength, maxLength);
      let current = { ...start };

      for (let i = 0; i < length; i++) {
        const nextPoint = this.getNextPoint(current, direction);
        
        // Check if the next point is valid and not already a road
        if (this.isValidRoadPosition(nextPoint, state)) {
          this.addRoadSegment(current, nextPoint, state);
          current = nextPoint;
          
          // Add the new point to dead ends
          state.deadEnds.push(current);
          
          // Recursively add more segments if not at max depth
          if (depth < maxDepth) {
            this.addPerpendicularAndDiagonalSegmentAtDeadEnd(
              current, state, rng, depth + 1, maxDepth
            );
          }
        } else {
          break;
        }
      }
      return [current];
    }
    return [];
  }
}