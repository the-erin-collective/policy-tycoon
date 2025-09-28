/**
 * Collision Detection Service for OpenTTD-style City Generation
 * 
 * Handles terrain validation, road overlap detection, and water/impassable terrain checking
 * for the classic city generation system.
 */

import { Injectable } from '@angular/core';
import { Point, RoadGenerationState, RoadTile } from '../../data/models/city-generation';

export interface TerrainType {
  isWater: boolean;
  isImpassable: boolean;
  elevation: number;
  slope: number;
  // NEW: Track if this is a slope that can have artificial structures
  isSlope: boolean;
  slopeDirection?: 'north' | 'south' | 'east' | 'west';
  heightDifference?: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  collisionType: 'road' | 'terrain' | 'water' | 'impassable' | 'bounds' | 'none';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CollisionDetectionService {
  // Map boundary configuration - should match MapConfig
  private mapBounds = {
    minX: -1000,
    maxX: 1000,
    minZ: -1000,
    maxZ: 1000
  };

  // Terrain elevation tolerance for road placement
  private readonly maxElevationDifference = 2.0;
  private readonly maxSlope = 0.3; // 30% grade maximum

  /**
   * Check if a road segment can be placed at the specified coordinates
   */
  canPlaceRoad(x: number, z: number, roadState: RoadGenerationState): CollisionResult {
    // Check map bounds first
    if (!this.isWithinMapBounds(x, z)) {
      return {
        hasCollision: true,
        collisionType: 'bounds',
        message: `Position (${x}, ${z}) is outside map bounds`
      };
    }

    // Check for existing road at this position
    const roadKey = `${x},${z}`;
    if (roadState.placedRoads.has(roadKey)) {
      return {
        hasCollision: true,
        collisionType: 'road',
        message: `Road already exists at position (${x}, ${z})`
      };
    }

    // Check terrain suitability
    const terrainResult = this.validateTerrain(x, z);
    if (terrainResult.hasCollision) {
      return terrainResult;
    }

    return {
      hasCollision: false,
      collisionType: 'none'
    };
  }

  /**
   * Check if a building can be placed at the specified coordinates
   */
  canPlaceBuilding(x: number, z: number, roadState: RoadGenerationState, buildingMap: Map<string, any>): CollisionResult {
    // Check map bounds
    if (!this.isWithinMapBounds(x, z)) {
      return {
        hasCollision: true,
        collisionType: 'bounds',
        message: `Position (${x}, ${z}) is outside map bounds`
      };
    }

    // Check for existing road
    const roadKey = `${x},${z}`;
    if (roadState.placedRoads.has(roadKey)) {
      return {
        hasCollision: true,
        collisionType: 'road',
        message: `Cannot place building on road at position (${x}, ${z})`
      };
    }

    // Check for existing building
    if (buildingMap.has(roadKey)) {
      return {
        hasCollision: true,
        collisionType: 'terrain',
        message: `Building already exists at position (${x}, ${z})`
      };
    }

    // Check terrain suitability for buildings (stricter than roads)
    const terrainResult = this.validateBuildingTerrain(x, z);
    if (terrainResult.hasCollision) {
      return terrainResult;
    }

    return {
      hasCollision: false,
      collisionType: 'none'
    };
  }

  /**
   * Validate terrain suitability for road placement
   */
  private validateTerrain(x: number, z: number): CollisionResult {
    const terrain = this.getTerrainAt(x, z);

    // Check for water
    if (terrain.isWater) {
      return {
        hasCollision: true,
        collisionType: 'water',
        message: `Cannot place road on water at position (${x}, ${z})`
      };
    }

    // Check for impassable terrain
    if (terrain.isImpassable) {
      return {
        hasCollision: true,
        collisionType: 'impassable',
        message: `Terrain is impassable at position (${x}, ${z})`
      };
    }

    // NEW: Roads can now be placed on slopes (but will require a full ramp)
    if (terrain.isSlope) {
      // Roads are allowed on slopes now - they will be handled by creating full ramps
      return {
        hasCollision: false,
        collisionType: 'none'
      };
    }

    // Check slope - roads can handle moderate slopes
    if (terrain.slope > this.maxSlope) {
      return {
        hasCollision: true,
        collisionType: 'terrain',
        message: `Terrain too steep for road at position (${x}, ${z}), slope: ${terrain.slope.toFixed(2)}`
      };
    }

    return {
      hasCollision: false,
      collisionType: 'none'
    };
  }

  /**
   * Validate terrain suitability for building placement (stricter than roads)
   */
  private validateBuildingTerrain(x: number, z: number): CollisionResult {
    const terrain = this.getTerrainAt(x, z);

    // Check for water
    if (terrain.isWater) {
      return {
        hasCollision: true,
        collisionType: 'water',
        message: `Cannot place building on water at position (${x}, ${z})`
      };
    }

    // Check for impassable terrain
    if (terrain.isImpassable) {
      return {
        hasCollision: true,
        collisionType: 'impassable',
        message: `Terrain is impassable at position (${x}, ${z})`
      };
    }

    // NEW: Buildings can now be placed on slopes (but will require a man-made block)
    if (terrain.isSlope) {
      // Buildings are allowed on slopes now - they will be handled by creating man-made blocks
      return {
        hasCollision: false,
        collisionType: 'none'
      };
    }

    // Buildings require flatter terrain than roads
    const maxBuildingSlope = this.maxSlope * 0.5; // 15% grade maximum for buildings
    if (terrain.slope > maxBuildingSlope) {
      return {
        hasCollision: true,
        collisionType: 'terrain',
        message: `Terrain too steep for building at position (${x}, ${z}), slope: ${terrain.slope.toFixed(2)}`
      };
    }

    return {
      hasCollision: false,
      collisionType: 'none'
    };
  }

  /**
   * Check if coordinates are within map bounds
   */
  private isWithinMapBounds(x: number, z: number): boolean {
    return x >= this.mapBounds.minX && 
           x <= this.mapBounds.maxX &&
           z >= this.mapBounds.minZ && 
           z <= this.mapBounds.maxZ;
  }

  /**
   * Get terrain information at specified coordinates
   * This is a simplified implementation - in a real game this would query actual terrain data
   */
  private getTerrainAt(x: number, z: number): TerrainType {
    // Simplified terrain generation for testing
    // In a real implementation, this would query actual terrain/heightmap data
    
    // Create some water areas for testing
    const isNearWater = this.isNearWaterBody(x, z);
    
    // Create some impassable areas (mountains, cliffs)
    const isImpassable = this.isImpassableTerrain(x, z);
    
    // Calculate elevation and slope based on position
    const elevation = this.calculateElevation(x, z);
    const slope = this.calculateSlope(x, z);
    
    // NEW: Check if this is a slope by comparing with neighbors
    const isSlope = this.isPositionOnSlope(x, z);
    const slopeInfo = isSlope ? this.getSlopeDirectionAndHeight(x, z) : undefined;

    return {
      isWater: isNearWater,
      isImpassable: isImpassable,
      elevation: elevation,
      slope: slope,
      isSlope: isSlope,
      slopeDirection: slopeInfo?.direction,
      heightDifference: slopeInfo?.heightDifference
    };
  }

  /**
   * Check if a position is on a slope by comparing elevation with neighbors
   */
  private isPositionOnSlope(x: number, z: number): boolean {
    const currentElevation = this.calculateElevation(x, z);
    
    // Check all four neighbors
    const neighbors = [
      { dx: 1, dz: 0 },   // East
      { dx: -1, dz: 0 },  // West
      { dx: 0, dz: 1 },   // South
      { dx: 0, dz: -1 }   // North
    ];
    
    for (const n of neighbors) {
      const nx = x + n.dx;
      const nz = z + n.dz;
      const neighborElevation = this.calculateElevation(nx, nz);
      
      // If there's a height difference of exactly 1, it's a slope
      if (Math.abs(currentElevation - neighborElevation) === 1) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get slope direction and height difference
   */
  private getSlopeDirectionAndHeight(x: number, z: number): { direction: 'north' | 'south' | 'east' | 'west', heightDifference: number } | null {
    const currentElevation = this.calculateElevation(x, z);
    
    // Check all four neighbors
    const neighbors = [
      { dx: 1, dz: 0, dir: 'east' as const },
      { dx: -1, dz: 0, dir: 'west' as const },
      { dx: 0, dz: 1, dir: 'south' as const },
      { dx: 0, dz: -1, dir: 'north' as const }
    ];
    
    for (const n of neighbors) {
      const nx = x + n.dx;
      const nz = z + n.dz;
      const neighborElevation = this.calculateElevation(nx, nz);
      
      // If there's a height difference of exactly 1, it's a slope
      const heightDiff = currentElevation - neighborElevation;
      if (Math.abs(heightDiff) === 1) {
        return {
          direction: n.dir,
          heightDifference: heightDiff
        };
      }
    }
    
    return null;
  }

  /**
   * Check if position is near a water body
   */
  private isNearWaterBody(x: number, z: number): boolean {
    // Create some test water bodies
    const waterBodies = [
      { centerX: 100, centerZ: 200, radius: 50 },
      { centerX: -300, centerZ: -150, radius: 30 },
      { centerX: 500, centerZ: -400, radius: 40 }
    ];

    return waterBodies.some(water => {
      const distance = Math.sqrt((x - water.centerX) ** 2 + (z - water.centerZ) ** 2);
      return distance <= water.radius;
    });
  }

  /**
   * Check if terrain is impassable (mountains, cliffs, etc.)
   */
  private isImpassableTerrain(x: number, z: number): boolean {
    // Create some test impassable areas
    const impassableAreas = [
      { centerX: -200, centerZ: 300, radius: 25 },
      { centerX: 400, centerZ: 100, radius: 35 }
    ];

    return impassableAreas.some(area => {
      const distance = Math.sqrt((x - area.centerX) ** 2 + (z - area.centerZ) ** 2);
      return distance <= area.radius;
    });
  }

  /**
   * Calculate elevation at position using simple noise function
   */
  private calculateElevation(x: number, z: number): number {
    // Simple elevation calculation using sine waves
    const baseElevation = 10;
    const variation = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 5;
    return baseElevation + variation;
  }

  /**
   * Calculate slope at position
   */
  private calculateSlope(x: number, z: number): number {
    // Calculate slope by comparing elevation with nearby points
    const currentElevation = this.calculateElevation(x, z);
    const eastElevation = this.calculateElevation(x + 1, z);
    const northElevation = this.calculateElevation(x, z + 1);
    
    const slopeX = Math.abs(eastElevation - currentElevation);
    const slopeZ = Math.abs(northElevation - currentElevation);
    
    return Math.max(slopeX, slopeZ);
  }

  /**
   * Check if a road segment would overlap with existing roads
   */
  checkRoadOverlap(startX: number, startZ: number, endX: number, endZ: number, roadState: RoadGenerationState): CollisionResult {
    // Check each tile along the road segment
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const length = Math.max(Math.abs(deltaX), Math.abs(deltaZ));
    
    for (let i = 0; i <= length; i++) {
      const progress = length === 0 ? 0 : i / length;
      const checkX = Math.round(startX + deltaX * progress);
      const checkZ = Math.round(startZ + deltaZ * progress);
      
      const result = this.canPlaceRoad(checkX, checkZ, roadState);
      if (result.hasCollision) {
        return result;
      }
    }

    return {
      hasCollision: false,
      collisionType: 'none'
    };
  }

  /**
   * Check if building placement would block potential road extensions from dead ends
   */
  wouldBlockRoadExtension(x: number, z: number, roadState: RoadGenerationState): boolean {
    // Check if any nearby dead ends would be blocked by this building
    return roadState.deadEnds.some(deadEnd => {
      const distance = Math.sqrt((x - deadEnd.x) ** 2 + (z - deadEnd.z) ** 2);
      
      // If building is within 2 tiles of a dead end, check if it blocks extension
      if (distance <= 2) {
        // Check if the building is in the direction the dead end could extend
        const deltaX = x - deadEnd.x;
        const deltaZ = z - deadEnd.z;
        
        // If building is directly adjacent in cardinal direction, it blocks extension
        return (Math.abs(deltaX) === 1 && deltaZ === 0) || 
               (Math.abs(deltaZ) === 1 && deltaX === 0);
      }
      
      return false;
    });
  }

  /**
   * Get all adjacent positions to a given coordinate
   */
  getAdjacentPositions(x: number, z: number): Point[] {
    return [
      { x: x + 1, z: z },     // East
      { x: x - 1, z: z },     // West
      { x: x, z: z + 1 },     // South
      { x: x, z: z - 1 }      // North
    ];
  }

  /**
   * Check if a position is adjacent to any road
   */
  isAdjacentToRoad(x: number, z: number, roadState: RoadGenerationState): boolean {
    const adjacentPositions = this.getAdjacentPositions(x, z);
    
    return adjacentPositions.some(pos => {
      const roadKey = `${pos.x},${pos.z}`;
      return roadState.placedRoads.has(roadKey);
    });
  }

  /**
   * Validate that a road segment can be built from start to end
   */
  validateRoadSegment(startX: number, startZ: number, endX: number, endZ: number, roadState: RoadGenerationState): CollisionResult {
    // Check if segment is within bounds
    if (!this.isWithinMapBounds(startX, startZ) || !this.isWithinMapBounds(endX, endZ)) {
      return {
        hasCollision: true,
        collisionType: 'bounds',
        message: `Road segment extends outside map bounds`
      };
    }

    // Check for overlaps along the entire segment
    return this.checkRoadOverlap(startX, startZ, endX, endZ, roadState);
  }

  /**
   * Get map bounds for external use
   */
  getMapBounds() {
    return { ...this.mapBounds };
  }

  /**
   * Set custom terrain data for testing
   */
  setTestTerrain(waterBodies: Array<{centerX: number, centerZ: number, radius: number}>, 
                 impassableAreas: Array<{centerX: number, centerZ: number, radius: number}>) {
    // This method would be used for unit testing to set up specific terrain scenarios
    // Implementation would store these in instance variables to override the default terrain generation
  }

  /**
   * Set map bounds to match MapRendererService
   */
  setMapBounds(width: number, height: number) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    this.mapBounds = {
      minX: -halfWidth,
      maxX: halfWidth,
      minZ: -halfHeight,
      maxZ: halfHeight
    };
  }
}