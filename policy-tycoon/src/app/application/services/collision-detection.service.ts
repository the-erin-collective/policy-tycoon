/**
 * Collision Detection Service for OpenTTD-style City Generation
 * 
 * Handles terrain validation, road overlap detection, and water/impassable terrain checking
 * for the classic city generation system.
 */

import { Injectable } from '@angular/core';
import { Point, RoadGenerationState, RoadTile } from '../../data/models/city-generation';
import { TerrainGenerationService } from './terrain-generation.service'; // Import TerrainGenerationService

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

  constructor(private terrainService: TerrainGenerationService) {}

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

    // Check for water
    const isWater = this.terrainService.isWaterAt(x, z);
    if (isWater) {
      return {
        hasCollision: true,
        collisionType: 'water',
        message: `Cannot place road on water at position (${x}, ${z})`
      };
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

    // Note: We can't fully validate building terrain here without knowing the building type
    // The full validation will be done in the BuildingPlacerService when the building type is known

    return {
      hasCollision: false,
      collisionType: 'none'
    };
  }

  /**
   * Validate building terrain across its footprint
   * @param x The x coordinate of the building
   * @param z The z coordinate of the building
   * @param buildingType The type of building being placed
   * @returns CollisionResult indicating if the building can be placed
   */
  public validateBuildingTerrain(x: number, z: number, buildingType: any): CollisionResult {
    const footprintCorners = [
      { x: x, z: z },
      { x: x + buildingType.width - 1, z: z },
      { x: x, z: z + buildingType.height - 1 },
      { x: x + buildingType.width - 1, z: z + buildingType.height - 1 },
    ];

    const cornerHeights = footprintCorners.map(p => this.terrainService.getHeightAt(p.x, p.z));

    const minHeight = Math.min(...cornerHeights);
    const maxHeight = Math.max(...cornerHeights);

    // Allow placement only if the ground is flat or has a max difference of 1 (a gentle, consistent slope)
    if (maxHeight - minHeight > 1) {
      return {
        hasCollision: true,
        collisionType: 'terrain',
        message: `Terrain too uneven for building at (${x}, ${z}). Height difference is ${maxHeight - minHeight}.`
      };
    }
    
    // Check for water at any corner
    // TODO: Get water level from terrain service
    const isAnyCornerWater = footprintCorners.some(corner => this.terrainService.isWaterAt(corner.x, corner.z));
    if (isAnyCornerWater) {
      return {
        hasCollision: true,
        collisionType: 'water',
        message: `Cannot place building on water at position (${x}, ${z})`
      };
    }

    return { hasCollision: false, collisionType: 'none' };
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
   * Checks if movement is possible between two adjacent tiles based on height difference.
   * @returns true if the height difference is 1 or less.
   */
  public isPassable(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    const fromHeight = this.terrainService.getHeightAt(fromX, fromZ);
    const toHeight = this.terrainService.getHeightAt(toX, toZ);

    // Passable if the height difference is at most 1 unit
    return Math.abs(fromHeight - toHeight) <= 1;
  }

  /**
   * Checks if a tile is a valid, buildable land tile for the purpose of calculating city area.
   * A tile is considered valid if it is not water and is within a passable height difference
   * from the previous tile.
   * @returns {boolean} True if the tile is a valid land tile for a city.
   */
  public isBuildableLand(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    // First, explicitly check if the destination tile is water. This is the most important check.
    if (this.terrainService.isWaterAt(toX, toZ)) {
      return false;
    }

    // Then, check if the height difference is acceptable.
    if (!this.isPassable(fromX, fromZ, toX, toZ)) {
      return false;
    }

    // If it's not water and the slope is acceptable, it's buildable land.
    return true;
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