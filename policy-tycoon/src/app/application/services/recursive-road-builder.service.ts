/**
 * Recursive road Builder Service for OpenTTD-style City Generation
 * 
 * Extends the base RoadNetworkBuilderService to add recursive road generation
 * capabilities, creating more organic and complex road networks.
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
import { TerrainGenerationService } from './terrain-generation.service';
import { RoadNetworkBuilderService } from './road-network-builder.service';

@Injectable({
  providedIn: 'root'
})
export class RecursiveRoadBuilderService extends RoadNetworkBuilderService {
  
  constructor(
    collisionDetection: CollisionDetectionService,
    logger: GenerationLoggerService,
    terrainGeneration: TerrainGenerationService
  ) {
    super(collisionDetection, logger, terrainGeneration);
  }

  /**
   * Add perpendicular and diagonal segments at a dead end with random length 2-3 tiles
   * Enhanced for Task 8: Support diagonal road segments and recursive generation
   */
  protected override addPerpendicularAndDiagonalSegmentAtDeadEnd(
    deadEnd: Point, 
    state: RoadGenerationState, 
    rng: SeededRandom,
    depth: number = 0,
    maxDepth: number = 3
  ): void {
    if (depth >= maxDepth) {
      state.deadEnds.push(deadEnd);
      return;
    }

    // Get the current road tile to determine its direction
    const roadKey = `${deadEnd.x},${deadEnd.z}`;
    const roadTile = state.placedRoads.get(roadKey);
    
    if (!roadTile) {
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
    let leftExtension: Point[] = [];
    let rightExtension: Point[] = [];

    // Try to extend in each chosen perpendicular direction
    if (shouldGoLeft) {
      leftExtension = this.createPerpendicularExtension(
        deadEnd, mainDirection, perpendicularDirections.left, state, rng
      );
      if (leftExtension.length > 0) {
        hasAnyExtension = true;
        
        // Extend the perpendicular road by 1-2 segments in a straight line
        const extensionEnd = leftExtension[leftExtension.length - 1];
        const straightExtension = this.extendStraightRoad(
          extensionEnd, 
          perpendicularDirections.left, 
          1, 
          2, 
          state, 
          rng
        );
        
        // Add the straight extension points to our left extension
        leftExtension = [...leftExtension, ...straightExtension];
      }
    }

    if (shouldGoRight) {
      rightExtension = this.createPerpendicularExtension(
        deadEnd, mainDirection, perpendicularDirections.right, state, rng
      );
      if (rightExtension.length > 0) {
        hasAnyExtension = true;
        
        // Extend the perpendicular road by 1-2 segments in a straight line
        const extensionEnd = rightExtension[rightExtension.length - 1];
        const straightExtension = this.extendStraightRoad(
          extensionEnd, 
          perpendicularDirections.right, 
          1, 
          2, 
          state, 
          rng
        );
        
        // Add the straight extension points to our right extension
        rightExtension = [...rightExtension, ...straightExtension];
      }
    }

    // Add diagonal connections if chosen (but only if we're not too deep in recursion)
    if (shouldAddDiagonal && depth < maxDepth - 1) {
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
      
      // Recursively add more segments from the new endpoints
      if (leftExtension.length > 0) {
        const newDeadEnd = leftExtension[leftExtension.length - 1];
        this.addPerpendicularAndDiagonalSegmentAtDeadEnd(newDeadEnd, state, rng, depth + 1, maxDepth);
      }
      
      if (rightExtension.length > 0) {
        const newDeadEnd = rightExtension[rightExtension.length - 1];
        this.addPerpendicularAndDiagonalSegmentAtDeadEnd(newDeadEnd, state, rng, depth + 1, maxDepth);
      }
    } else {
      // No extensions were possible, keep as dead end
      state.deadEnds.push(deadEnd);
    }
  }

  /**
   * Override the buildInitialNetwork method to use our enhanced road generation
   */
  override buildInitialNetwork(centerX: number, centerZ: number, rng: SeededRandom): RoadNetwork {
    this.logger.info(`Building initial road network with recursive generation at center (${centerX}, ${centerZ})`);
    
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

      // Step 3: Add perpendicular segments and diagonal connections with recursive generation
      this.logger.info('Adding perpendicular and diagonal segments with recursive generation');
      const currentDeadEnds = [...state.deadEnds];
      state.deadEnds = [];
      
      // Process each dead end with our enhanced method
      currentDeadEnds.forEach(deadEnd => {
        this.addPerpendicularAndDiagonalSegmentAtDeadEnd(deadEnd, state, rng, 0, 3); // Max depth of 3
      });
      
      this.logger.info(`Added perpendicular and diagonal segments, now have ${state.corners.length} corners`);

      // Step 4: Classify road segments
      this.logger.info('Classifying road segments');
      this.classifyRoadSegments(state);
      this.logger.info(`Classification complete, total segments: ${state.currentSegments.length}`);

      this.logger.info(`Recursive road network generation complete with ${state.currentSegments.length} segments, ${state.intersections.length} intersections, ${state.deadEnds.length} dead ends, ${state.corners.length} corners`);

      return {
        segments: state.currentSegments,
        intersections: state.intersections,
        deadEnds: state.deadEnds
      };
    } catch (error) {
      this.logger.error(`Failed to build recursive road network at center (${centerX}, ${centerZ})`, error);
      
      // Fallback to minimal road network
      return {
        segments: [],
        intersections: [],
        deadEnds: []
      };
    }
  }
}
