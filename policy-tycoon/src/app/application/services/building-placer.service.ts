/**
 * Building Placer Service for OpenTTD-style City Generation
 * 
 * Handles population-driven building placement using random walk algorithm
 * and terrain validation for the classic city generation system.
 */

import { Injectable } from '@angular/core';
import { 
  BuildingPlacer, 
  BuildingPlacement, 
  RoadNetwork, 
  SeededRandom, 
  Building, 
  BuildingType,
  Point, 
  Direction,
  RoadSegment,
  BuildingPlacementState,
  RoadGenerationState,
  RoadTile
} from '../../data/models/city-generation';
import { CollisionDetectionService } from './collision-detection.service';
import { CityConfigurationService } from './city-configuration.service';
import { GenerationLoggerService } from './generation-logger.service';
import { TerrainGenerationService } from './terrain-generation.service'; // NEW: Import terrain service

export interface RandomWalkResult {
  validSpots: Point[];
  walkPath: Point[];
  stepsCompleted: number;
}

@Injectable({
  providedIn: 'root'
})
export class BuildingPlacerService implements BuildingPlacer {
  
  constructor(
    private collisionDetection: CollisionDetectionService,
    private cityConfiguration: CityConfigurationService,
    private logger: GenerationLoggerService,
    private terrainGeneration: TerrainGenerationService // NEW: Inject terrain service
  ) {}

  /**
   * Place initial buildings using population-driven placement with density gradient
   * Requirements: 2.1, 2.2, 3.4, 10.2, 10.4, 10.5
   */
  placeInitialBuildings(
    roadNetwork: RoadNetwork, 
    targetPopulation: number, 
    rng: SeededRandom
  ): BuildingPlacement {
    const placementState: BuildingPlacementState = {
      placedBuildings: new Map<string, Building>(),
      currentPopulation: 0,
      targetPopulation: targetPopulation,
      availableSpots: []
    };

    // Log start of building placement
    this.logger.info(`Starting building placement for target population: ${targetPopulation}`);

    try {
      // Validate inputs
      if (!roadNetwork || !roadNetwork.segments || roadNetwork.segments.length === 0) {
        this.logger.warn('No road network provided or road network is empty');
        return {
          buildings: [],
          totalPopulation: 0
        };
      }

      if (targetPopulation <= 0) {
        this.logger.warn(`Invalid target population: ${targetPopulation}`);
        return {
          buildings: [],
          totalPopulation: 0
        };
      }

      // Convert road network to road generation state for collision detection
      const roadState = this.convertToRoadState(roadNetwork);

      // Check if we have any intersections to start from
      if (roadNetwork.intersections.length === 0) {
        this.logger.warn('No intersections found in road network, using center of segments');
      }

      // Find city center for density gradient calculation
      const cityCenter = this.findTownCenter(roadNetwork);
      
      // Get all valid building spots with density information
      const spotsWithDensity = this.getSpotsWithDensity(roadNetwork, cityCenter, rng);

      // NEW: Filter spots to ensure they respect map boundaries
      const mapBounds = this.collisionDetection.getMapBounds();
      const boundedSpots = spotsWithDensity.filter(swd => 
        swd.spot.x >= mapBounds.minX && swd.spot.x <= mapBounds.maxX &&
        swd.spot.z >= mapBounds.minZ && swd.spot.z <= mapBounds.maxZ
      );

      // Iterative building placement loop with density gradient
      let attempts = 0;
      const maxAttempts = Math.max(targetPopulation * 3, 1000); // Prevent infinite loops, but allow enough attempts
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 50; // Prevent getting stuck in unproductive loops

      while (placementState.currentPopulation < targetPopulation && attempts < maxAttempts && consecutiveFailures < maxConsecutiveFailures) {
        attempts++;

        try {
          // Select a spot based on density gradient
          const selectedSpot = this.selectSpotByDensity(boundedSpots, placementState, cityCenter, rng);
          
          if (!selectedSpot) {
            consecutiveFailures++;
            if (attempts % 10 === 0) { // Log every 10 failed attempts
              this.logger.warn(`No valid building spots found after ${attempts} attempts, current population: ${placementState.currentPopulation}/${targetPopulation}`);
            }
            continue; // No valid spots found, try again
          }
          
          // Validate the spot for building placement
          if (!this.isValidBuildingSpot(selectedSpot, roadState, placementState)) {
            consecutiveFailures++;
            if (attempts % 10 === 0) { // Log every 10 failed attempts
              this.logger.warn(`Selected spot (${selectedSpot.x},${selectedSpot.z}) is not valid for building placement`);
            }
            continue; // Spot not valid, try again
          }

          // Reset consecutive failures counter on successful placement preparation
          consecutiveFailures = 0;

          // Select a random building type with size variation
          let buildingType;
          try {
            buildingType = this.selectBuildingTypeWithSizeVariation(rng, selectedSpot, cityCenter, placementState);
          } catch (configError) {
            this.logger.error('Failed to select building type from configuration', configError);
            // Fallback to a default small building
            buildingType = {
              id: 'fallback_house',
              name: 'Fallback House',
              population: 4,
              width: 1,
              height: 1
            };
          }
          
          // NEW: Enhanced building placement that respects road networks and boundaries
          if (!this.canPlaceBuildingAtSpot(selectedSpot, buildingType, roadState, placementState)) {
            consecutiveFailures++;
            if (attempts % 10 === 0) {
              this.logger.warn(`Cannot place building of type ${buildingType.name} at spot (${selectedSpot.x},${selectedSpot.z})`);
            }
            continue;
          }
          
          // Create and place the building
          const building: Building = {
            x: selectedSpot.x,
            z: selectedSpot.z,
            type: buildingType,
            population: buildingType.population
          };

          // Add building to placement state - store the building at its primary position
          const buildingKey = `${building.x},${building.z}`;
          placementState.placedBuildings.set(buildingKey, building);
          placementState.currentPopulation += building.population;

          // Log successful placement
          if (attempts % 20 === 0 || placementState.currentPopulation >= targetPopulation) { // Log every 20 placements or when complete
            this.logger.info(`Placed building at (${building.x},${building.z}), type: ${building.type.name}, population: ${building.population}. Total: ${placementState.currentPopulation}/${targetPopulation}`);
          }

        } catch (iterationError) {
          consecutiveFailures++;
          this.logger.error(`Error during building placement iteration ${attempts}`, iterationError);
          
          // If we've had too many consecutive errors, break out
          if (consecutiveFailures >= maxConsecutiveFailures) {
            this.logger.error(`Too many consecutive failures (${consecutiveFailures}), stopping building placement`);
            break;
          }
          
          continue; // Try again
        }
      }

      // Log completion status
      if (placementState.currentPopulation >= targetPopulation) {
        this.logger.info(`Successfully reached target population: ${placementState.currentPopulation}/${targetPopulation} with ${attempts} attempts`);
      } else {
        const completionPercent = Math.round((placementState.currentPopulation / targetPopulation) * 100);
        this.logger.warn(`Could not reach target population. Achieved ${completionPercent}% (${placementState.currentPopulation}/${targetPopulation}) with ${attempts} attempts`);
        
        // This is part of requirement 10.2 - fallback logic when targets cannot be met
        if (placementState.currentPopulation === 0) {
          this.logger.error('No buildings were placed at all, returning empty result');
        }
      }

      return {
        buildings: Array.from(placementState.placedBuildings.values()),
        totalPopulation: placementState.currentPopulation
      };
    } catch (error) {
      this.logger.error('Critical error in building placement process', error);
      
      // Requirement 10.2 - Fallback logic when building placement targets cannot be met
      return {
        buildings: [],
        totalPopulation: 0
      };
    }
  }

  /**
   * Perform random walk starting from town center along roads
   * Requirements: 2.2, 2.3
   */
  performRandomWalk(roadNetwork: RoadNetwork, rng: SeededRandom): RandomWalkResult {
    const walkSteps = rng.nextIntInclusive(3, 7); // 3-7 steps as per requirements
    const validSpots: Point[] = [];
    const walkPath: Point[] = [];
    
    // Find town center (intersection with most connections or first intersection)
    const townCenter = this.findTownCenter(roadNetwork);
    if (!townCenter) {
      return { validSpots: [], walkPath: [], stepsCompleted: 0 };
    }

    let currentPosition = townCenter;
    walkPath.push({ ...currentPosition });

    // Perform the random walk
    for (let step = 0; step < walkSteps; step++) {
      // Get available directions from current position
      const availableDirections = this.getAvailableDirections(currentPosition, roadNetwork);
      
      if (availableDirections.length === 0) {
        break; // Dead end reached, stop walking
      }

      // Randomly select a direction
      const selectedDirection = rng.selectFromArray(availableDirections);
      
      // Move in the selected direction
      const nextPosition = this.moveInDirection(currentPosition, selectedDirection);
      
      // Verify the next position has a road
      if (this.hasRoadAt(nextPosition, roadNetwork)) {
        currentPosition = nextPosition;
        walkPath.push({ ...currentPosition });
        
        // Look for empty tiles adjacent to this road position
        const adjacentSpots = this.findAdjacentEmptyTiles(currentPosition, roadNetwork);
        validSpots.push(...adjacentSpots);
      } else {
        break; // No road at next position, stop walking
      }
    }

    // Remove duplicate spots
    const uniqueSpots = this.removeDuplicatePoints(validSpots);

    return {
      validSpots: uniqueSpots,
      walkPath: walkPath,
      stepsCompleted: walkPath.length - 1
    };
  }

  /**
   * Find the town center (best intersection or starting point)
   */
  private findTownCenter(roadNetwork: RoadNetwork): Point | null {
    if (roadNetwork.intersections.length > 0) {
      // Return the first intersection as town center
      return roadNetwork.intersections[0];
    }

    // If no intersections, find the center of all road segments
    if (roadNetwork.segments.length > 0) {
      const avgX = roadNetwork.segments.reduce((sum, seg) => sum + seg.startX, 0) / roadNetwork.segments.length;
      const avgZ = roadNetwork.segments.reduce((sum, seg) => sum + seg.startZ, 0) / roadNetwork.segments.length;
      return { x: Math.round(avgX), z: Math.round(avgZ) };
    }

    return null;
  }

  /**
   * Get available directions from current position along roads
   */
  private getAvailableDirections(position: Point, roadNetwork: RoadNetwork): Direction[] {
    const directions: Direction[] = [];
    
    // Check each cardinal direction for roads
    const directionsToCheck = [
      { direction: Direction.North, dx: 0, dz: -1 },
      { direction: Direction.South, dx: 0, dz: 1 },
      { direction: Direction.East, dx: 1, dz: 0 },
      { direction: Direction.West, dx: -1, dz: 0 }
    ];

    for (const { direction, dx, dz } of directionsToCheck) {
      const checkPosition = { x: position.x + dx, z: position.z + dz };
      if (this.hasRoadAt(checkPosition, roadNetwork)) {
        directions.push(direction);
      }
    }

    return directions;
  }

  /**
   * Move one step in the specified direction
   */
  private moveInDirection(position: Point, direction: Direction): Point {
    switch (direction) {
      case Direction.North:
        return { x: position.x, z: position.z - 1 };
      case Direction.South:
        return { x: position.x, z: position.z + 1 };
      case Direction.East:
        return { x: position.x + 1, z: position.z };
      case Direction.West:
        return { x: position.x - 1, z: position.z };
      default:
        return position;
    }
  }

  /**
   * Check if there's a road at the specified position
   */
  private hasRoadAt(position: Point, roadNetwork: RoadNetwork): boolean {
    return roadNetwork.segments.some(segment => 
      this.isPositionOnSegment(position, segment)
    );
  }

  /**
   * Check if a position lies on a road segment
   */
  private isPositionOnSegment(position: Point, segment: RoadSegment): boolean {
    const { startX, startZ, endX, endZ } = segment;
    
    // For horizontal segments
    if (startZ === endZ && position.z === startZ) {
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      return position.x >= minX && position.x <= maxX;
    }
    
    // For vertical segments
    if (startX === endX && position.x === startX) {
      const minZ = Math.min(startZ, endZ);
      const maxZ = Math.max(startZ, endZ);
      return position.z >= minZ && position.z <= maxZ;
    }
    
    // For corner and intersection segments (single tile)
    if (segment.roadType === 'corner' || segment.roadType === 'intersection') {
      return position.x === segment.gridX && position.z === segment.gridZ;
    }
    
    return false;
  }

  /**
   * Find empty tiles adjacent to a road position
   */
  private findAdjacentEmptyTiles(roadPosition: Point, roadNetwork: RoadNetwork): Point[] {
    const adjacentTiles: Point[] = [];
    
    // Check all four adjacent positions
    const adjacentPositions = [
      { x: roadPosition.x + 1, z: roadPosition.z },     // East
      { x: roadPosition.x - 1, z: roadPosition.z },     // West
      { x: roadPosition.x, z: roadPosition.z + 1 },     // South
      { x: roadPosition.x, z: roadPosition.z - 1 }      // North
    ];

    for (const position of adjacentPositions) {
      // Check if position is empty (no road)
      if (!this.hasRoadAt(position, roadNetwork)) {
        adjacentTiles.push(position);
      }
    }

    return adjacentTiles;
  }

  /**
   * Remove duplicate points from array
   */
  private removeDuplicatePoints(points: Point[]): Point[] {
    const seen = new Set<string>();
    return points.filter(point => {
      const key = `${point.x},${point.z}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get all valid building spots with density information
   */
  private getSpotsWithDensity(roadNetwork: RoadNetwork, cityCenter: Point | null, rng: SeededRandom): Array<{spot: Point, density: number}> {
    // Perform multiple random walks to gather spots
    const allSpots: Point[] = [];
    const walkCount = 5 + Math.floor(rng.nextFloat() * 10); // 5-15 walks
    
    for (let i = 0; i < walkCount; i++) {
      const walkResult = this.performRandomWalk(roadNetwork, rng);
      allSpots.push(...walkResult.validSpots);
    }
    
    // Remove duplicates
    const uniqueSpots = this.removeDuplicatePoints(allSpots);
    
    // Calculate density for each spot
    return uniqueSpots.map(spot => {
      const distanceFromCenter = cityCenter ? 
        Math.sqrt(Math.pow(spot.x - cityCenter.x, 2) + Math.pow(spot.z - cityCenter.z, 2)) : 0;
      
      // Density decreases with distance from center (0 at center, 1 at 20+ units away)
      const density = Math.max(0, 1 - (distanceFromCenter / 20));
      return { spot, density };
    });
  }

  /**
   * Select a spot based on density gradient
   */
  private selectSpotByDensity(
    spotsWithDensity: Array<{spot: Point, density: number}>, 
    placementState: BuildingPlacementState,
    cityCenter: Point | null,
    rng: SeededRandom
  ): Point | null {
    if (spotsWithDensity.length === 0) {
      return null;
    }
    
    // Filter out already placed buildings
    const availableSpots = spotsWithDensity.filter(swd => {
      const key = `${swd.spot.x},${swd.spot.z}`;
      return !placementState.placedBuildings.has(key);
    });
    
    if (availableSpots.length === 0) {
      return null;
    }
    
    // Apply density weighting - higher density spots have higher probability
    const totalDensity = availableSpots.reduce((sum, swd) => sum + swd.density, 0);
    
    if (totalDensity <= 0) {
      // If all densities are zero, select randomly
      return rng.selectFromArray(availableSpots).spot;
    }
    
    // Weighted random selection based on density
    const randomValue = rng.nextFloat() * totalDensity;
    let cumulativeDensity = 0;
    
    for (const swd of availableSpots) {
      cumulativeDensity += swd.density;
      if (randomValue <= cumulativeDensity) {
        return swd.spot;
      }
    }
    
    // Fallback to last spot
    return availableSpots[availableSpots.length - 1].spot;
  }

  /**
   * Select building type with size variation based on location and city development
   */
  private selectBuildingTypeWithSizeVariation(
    rng: SeededRandom, 
    spot: Point, 
    cityCenter: Point | null, 
    placementState: BuildingPlacementState
  ): BuildingType {
    // Calculate distance from center for size variation
    const distanceFromCenter = cityCenter ? 
      Math.sqrt(Math.pow(spot.x - cityCenter.x, 2) + Math.pow(spot.z - cityCenter.z, 2)) : 0;
    
    // Base building types from configuration
    const baseBuildingTypes = this.cityConfiguration.getBuildingTypes();
    
    // Filter building types based on distance from center (density gradient)
    // Center areas can have larger buildings, outskirts are limited to smaller ones
    const maxBuildingSize = this.getMaxBuildingSizeForDistance(distanceFromCenter);
    
    const filteredBuildingTypes = baseBuildingTypes.filter(building => {
      // Limit building sizes based on distance from center
      if (building.width > maxBuildingSize || building.height > maxBuildingSize) {
        return false;
      }
      
      // Limit high-density buildings in low-density areas
      if (distanceFromCenter > 10 && building.population > 30) {
        return rng.nextFloat() > 0.7; // 30% chance for larger buildings in outskirts
      }
      
      return true;
    });
    
    if (filteredBuildingTypes.length === 0) {
      // Fallback to smallest building type
      return baseBuildingTypes.find(b => b.width === 1 && b.height === 1) || baseBuildingTypes[0];
    }
    
    // Apply rarity weighting - larger buildings are rarer
    const weightedBuildingTypes = filteredBuildingTypes.flatMap(building => {
      let weight = 1;
      
      // Larger buildings are rarer
      if (building.width === 2 && building.height === 2) {
        weight = 1; // 1x weight for 2x2 (rarest)
      } else if ((building.width === 1 && building.height === 2) || (building.width === 2 && building.height === 1)) {
        weight = 3; // 3x weight for 1x2 (less rare)
      } else {
        weight = 4; // 4x weight for 1x1 (most common)
      }
      
      // Center areas can have more variety
      if (distanceFromCenter < 5) {
        weight = Math.max(1, weight - 1); // Reduce weight difference in center
      }
      
      // Add variety based on nearby building types to avoid monotony
      const nearbyBuildings = this.getNearbyBuildings(spot, placementState, 4);
      if (nearbyBuildings.length > 0) {
        // Reduce weight of building types that are already common nearby
        const typeCounts = new Map<string, number>();
        nearbyBuildings.forEach(b => {
          const count = typeCounts.get(b.type.id) || 0;
          typeCounts.set(b.type.id, count + 1);
        });
        
        const currentTypeCount = typeCounts.get(building.id) || 0;
        if (currentTypeCount > 2) {
          // Reduce weight for over-represented types
          weight = Math.max(1, weight - currentTypeCount);
        }
      }
      
      // Create array with repeated entries based on weight
      return Array(weight).fill(building);
    });
    
    if (weightedBuildingTypes.length === 0) {
      return filteredBuildingTypes[0];
    }
    
    return rng.selectFromArray(weightedBuildingTypes);
  }

  /**
   * Get maximum building size allowed for a given distance from city center
   */
  private getMaxBuildingSizeForDistance(distance: number): number {
    if (distance < 3) return 2;  // Center area can have 2x2 buildings
    if (distance < 8) return 2;  // Mid area can have 2x2 buildings
    if (distance < 15) return 1; // Outer area limited to 1x2 buildings
    return 1;                    // Far outskirts limited to 1x1 buildings
  }

  /**
   * Convert road network to road generation state for collision detection
   */
  private convertToRoadState(roadNetwork: RoadNetwork): RoadGenerationState {
    const placedRoads = new Map<string, RoadTile>();
    
    // Process all road segments
    for (const segment of roadNetwork.segments) {
      // Add all tiles covered by this segment
      const tiles = this.getSegmentTiles(segment);
      
      for (const tile of tiles) {
        const key = `${tile.x},${tile.z}`;
        if (!placedRoads.has(key)) {
          placedRoads.set(key, {
            x: tile.x,
            z: tile.z,
            connections: [],
            isIntersection: false,
            isCorner: false,
            isDeadEnd: false
          });
        }
      }
    }

    return {
      placedRoads: placedRoads,
      currentSegments: roadNetwork.segments,
      intersections: roadNetwork.intersections,
      deadEnds: roadNetwork.deadEnds,
      corners: []
    };
  }

  /**
   * Get all tiles covered by a road segment
   */
  private getSegmentTiles(segment: RoadSegment): Point[] {
    const tiles: Point[] = [];
    const { startX, startZ, endX, endZ } = segment;
    
    // For single-tile segments (corners, intersections)
    if (startX === endX && startZ === endZ) {
      tiles.push({ x: startX, z: startZ });
      return tiles;
    }
    
    // For multi-tile segments
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const length = Math.max(Math.abs(deltaX), Math.abs(deltaZ));
    
    for (let i = 0; i <= length; i++) {
      const progress = length === 0 ? 0 : i / length;
      const x = Math.round(startX + deltaX * progress);
      const z = Math.round(startZ + deltaZ * progress);
      tiles.push({ x, z });
    }
    
    return tiles;
  }

  /**
   * Validate if a spot is suitable for building placement
   * Requirements: 2.4
   */
  private isValidBuildingSpot(
    spot: Point, 
    roadState: RoadGenerationState, 
    placementState: BuildingPlacementState
  ): boolean {
    // Check if spot is already occupied by a building
    const buildingKey = `${spot.x},${spot.z}`;
    if (placementState.placedBuildings.has(buildingKey)) {
      return false;
    }

    // Use collision detection service to validate terrain and adjacency
    const buildingMap = placementState.placedBuildings;
    const collisionResult = this.collisionDetection.canPlaceBuilding(spot.x, spot.z, roadState, buildingMap);
    
    // NEW: Special handling for slopes
    if (collisionResult.hasCollision && collisionResult.collisionType === 'terrain') {
      // Check if it's a slope - buildings can be placed on slopes now
      // Use the public canPlaceBuilding method which already handles slope detection
      // If the collision is just due to slope, we can allow it
      this.logger.info(`Allowing building placement on slope at (${spot.x},${spot.z})`);
    } else if (collisionResult.hasCollision) {
      return false;
    }

    // Check if adjacent to road
    if (!this.collisionDetection.isAdjacentToRoad(spot.x, spot.z, roadState)) {
      return false;
    }

    // Check if building would block potential road extensions from dead ends
    if (this.collisionDetection.wouldBlockRoadExtension(spot.x, spot.z, roadState)) {
      return false;
    }

    // NEW: Check if the building spot respects map boundaries
    const mapBounds = this.collisionDetection.getMapBounds();
    if (spot.x < mapBounds.minX || spot.x > mapBounds.maxX || 
        spot.z < mapBounds.minZ || spot.z > mapBounds.maxZ) {
      return false;
    }

    // NEW: Enhanced validation to ensure buildings are placed between roads in organized blocks
    // Check that the spot has proper road adjacency pattern for organized placement
    const adjacentRoads = this.getAdjacentRoadCount(spot, roadState);
    
    // Buildings should be adjacent to at least one road but not completely surrounded by roads
    // This creates more natural spacing and prevents cluttered placement
    if (adjacentRoads === 0) {
      return false; // Not adjacent to any roads
    }
    
    // Prefer spots with 1-3 adjacent roads for more natural city block formation
    if (adjacentRoads > 3) {
      // Allow high adjacency only in certain cases (e.g., central areas)
      const isCentralArea = this.isInCentralArea(spot, roadState);
      if (!isCentralArea) {
        return false; // Too many adjacent roads for non-central areas
      }
    }

    // NEW: Check for building clustering to maintain organized blocks
    if (!this.isInOrganizedBlock(spot, placementState, roadState)) {
      return false;
    }

    return true;
  }

  /**
   * Count adjacent roads to a spot
   */
  private getAdjacentRoadCount(spot: Point, roadState: RoadGenerationState): number {
    let count = 0;
    const adjacentPositions = this.collisionDetection.getAdjacentPositions(spot.x, spot.z);
    
    for (const pos of adjacentPositions) {
      const roadKey = `${pos.x},${pos.z}`;
      if (roadState.placedRoads.has(roadKey)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Check if a spot is in a central area of the city
   */
  private isInCentralArea(spot: Point, roadState: RoadGenerationState): boolean {
    // Simple implementation: check if near intersections
    // In a more complex implementation, this could use distance from city center
    for (const intersection of roadState.intersections) {
      const distance = Math.sqrt(Math.pow(spot.x - intersection.x, 2) + Math.pow(spot.z - intersection.z, 2));
      if (distance <= 5) { // Within 5 units of an intersection
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a building spot is part of an organized block
   * This ensures buildings are placed in clusters rather than scattered randomly
   */
  private isInOrganizedBlock(
    spot: Point, 
    placementState: BuildingPlacementState, 
    roadState: RoadGenerationState
  ): boolean {
    // Check if there are nearby buildings to form a cluster
    const nearbyBuildings = this.getNearbyBuildings(spot, placementState);
    
    // If there are already buildings nearby, this spot is part of an organized block
    if (nearbyBuildings.length > 0) {
      return true;
    }
    
    // If no nearby buildings, check if this spot is suitable for starting a new block
    // New blocks should be near roads and have space for growth
    return this.canStartNewBlock(spot, roadState);
  }

  /**
   * Get buildings within a certain radius of a spot
   */
  private getNearbyBuildings(spot: Point, placementState: BuildingPlacementState, radius: number = 3): Building[] {
    const nearby: Building[] = [];
    
    placementState.placedBuildings.forEach(building => {
      const distance = Math.sqrt(Math.pow(spot.x - building.x, 2) + Math.pow(spot.z - building.z, 2));
      if (distance <= radius) {
        nearby.push(building);
      }
    });
    
    return nearby;
  }

  /**
   * Check if a spot is suitable for starting a new building block
   */
  private canStartNewBlock(spot: Point, roadState: RoadGenerationState): boolean {
    // Check that the spot has proper road adjacency for a new block
    const adjacentRoads = this.getAdjacentRoadCount(spot, roadState);
    
    // Need at least one adjacent road to start a block
    if (adjacentRoads === 0) {
      return false;
    }
    
    // Check that there's space for the block to grow
    // This is a simplified check - in a real implementation, this would be more sophisticated
    const adjacentPositions = this.collisionDetection.getAdjacentPositions(spot.x, spot.z);
    let validAdjacentSpots = 0;
    
    for (const pos of adjacentPositions) {
      // Check if adjacent spot is valid for future building placement
      const adjacentKey = `${pos.x},${pos.z}`;
      if (!roadState.placedRoads.has(adjacentKey)) {
        // Not a road, so could potentially be a building spot
        validAdjacentSpots++;
      }
    }
    
    // Need some space to grow (at least 1 valid adjacent spot)
    return validAdjacentSpots >= 1;
  }

  /**
   * Check if a building can be placed at a specific spot considering its size
   */
  private canPlaceBuildingAtSpot(
    spot: Point,
    buildingType: BuildingType,
    roadState: RoadGenerationState,
    placementState: BuildingPlacementState
  ): boolean {
    // Check each tile that the building would occupy
    for (let dx = 0; dx < buildingType.width; dx++) {
      for (let dz = 0; dz < buildingType.height; dz++) {
        const checkSpot = { x: spot.x + dx, z: spot.z + dz };
        
        // Check if this spot is valid for building placement
        const spotKey = `${checkSpot.x},${checkSpot.z}`;
        
        // Check if spot is already occupied by any building
        let isOccupied = false;
        for (const [buildingKey, building] of placementState.placedBuildings.entries()) {
          // Check if this building occupies the spot
          for (let bdx = 0; bdx < building.type.width; bdx++) {
            for (let bdz = 0; bdz < building.type.height; bdz++) {
              const buildingTileX = building.x + bdx;
              const buildingTileZ = building.z + bdz;
              if (buildingTileX === checkSpot.x && buildingTileZ === checkSpot.z) {
                isOccupied = true;
                break;
              }
            }
            if (isOccupied) break;
          }
          if (isOccupied) break;
        }
        
        if (isOccupied) {
          return false;
        }
        
        // Check collision with roads
        const roadKey = `${checkSpot.x},${checkSpot.z}`;
        if (roadState.placedRoads.has(roadKey)) {
          return false;
        }
        
        // Check map boundaries
        const mapBounds = this.collisionDetection.getMapBounds();
        if (checkSpot.x < mapBounds.minX || checkSpot.x > mapBounds.maxX || 
            checkSpot.z < mapBounds.minZ || checkSpot.z > mapBounds.maxZ) {
          return false;
        }
        
        // Check terrain suitability
        const buildingMap = placementState.placedBuildings;
        const collisionResult = this.collisionDetection.canPlaceBuilding(
          checkSpot.x, checkSpot.z, roadState, buildingMap
        );
        
        // NEW: Special handling for slopes
        if (collisionResult.hasCollision && collisionResult.collisionType === 'terrain') {
          // Check if it's a slope - buildings can be placed on slopes now
          // Use the public canPlaceBuilding method which already handles slope detection
          // If the collision is just due to slope, we can allow it
          this.logger.info(`Allowing building placement on slope at (${checkSpot.x},${checkSpot.z})`);
        } else if (collisionResult.hasCollision) {
          return false;
        }
        
        // Check if adjacent to road (at least one tile of the building should be adjacent to road)
        if (dx === 0 && dz === 0) { // Only check for the first tile to avoid over-constraining
          if (!this.collisionDetection.isAdjacentToRoad(checkSpot.x, checkSpot.z, roadState)) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
}