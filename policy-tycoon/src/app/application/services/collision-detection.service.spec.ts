/**
 * Unit tests for CollisionDetectionService
 * 
 * Tests various collision scenarios including terrain validation,
 * road overlap detection, and water/impassable terrain checking.
 */

// Converted from Vitest to Jasmine (Karma)
// import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionDetectionService, CollisionResult } from './collision-detection.service';
import { RoadGenerationState, RoadTile, Direction, Point } from '../../data/models/city-generation';

// Mock TerrainGenerationService
class MockTerrainGenerationService {
  getHeightAt(x: number, z: number): number {
    // Simple height function for testing
    return Math.abs(x) + Math.abs(z);
  }
  
  isWaterAt(x: number, z: number): boolean {
    // Water at positions near origin
    return Math.abs(x) < 5 && Math.abs(z) < 5;
  }
}

describe('CollisionDetectionService - Zoneless', () => {
  let service: CollisionDetectionService;
  let mockRoadState: RoadGenerationState;

  beforeEach(() => {
    // Create service with mock terrain service
    const mockTerrainService = new MockTerrainGenerationService() as any;
    service = new CollisionDetectionService(mockTerrainService);
    
    // Initialize mock road state
    mockRoadState = {
      placedRoads: new Map<string, RoadTile>(),
      currentSegments: [],
      intersections: [],
      deadEnds: [],
      corners: []
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('canPlaceRoad', () => {
    it('should allow road placement on empty valid terrain', () => {
      const result = service.canPlaceRoad(10, 10, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should detect collision with existing road', () => {
      // Place a road at (5, 5)
      mockRoadState.placedRoads.set('5,5', {
        x: 5,
        z: 5,
        connections: [Direction.North, Direction.South],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      const result = service.canPlaceRoad(5, 5, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('road');
      expect(result.message).toContain('Road already exists');
    });

    it('should detect collision with map bounds', () => {
      const result = service.canPlaceRoad(-2000, 0, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('bounds');
      expect(result.message).toContain('outside map bounds');
    });

    it('should detect collision with water', () => {
      // Test position near water (near origin)
      const result = service.canPlaceRoad(2, 2, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');
      expect(result.message).toContain('Cannot place road on water');
    });
  });

  describe('canPlaceBuilding', () => {
    let mockBuildingMap: Map<string, any>;

    beforeEach(() => {
      mockBuildingMap = new Map();
    });

    it('should allow building placement on empty valid terrain', () => {
      const result = service.canPlaceBuilding(10, 10, mockRoadState, mockBuildingMap);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should prevent building placement on roads', () => {
      // Place a road at (15, 15)
      mockRoadState.placedRoads.set('15,15', {
        x: 15,
        z: 15,
        connections: [Direction.East, Direction.West],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      const result = service.canPlaceBuilding(15, 15, mockRoadState, mockBuildingMap);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('road');
      expect(result.message).toContain('Cannot place building on road');
    });

    it('should prevent building placement on existing buildings', () => {
      mockBuildingMap.set('20,20', { type: 'house', population: 4 });

      const result = service.canPlaceBuilding(20, 20, mockRoadState, mockBuildingMap);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('terrain');
      expect(result.message).toContain('Building already exists');
    });

    it('should detect collision with water for buildings', () => {
      const result = service.canPlaceBuilding(2, 2, mockRoadState, mockBuildingMap);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');
      expect(result.message).toContain('Cannot place building on water');
    });
  });

  describe('isPassable', () => {
    it('should allow movement between tiles with small height difference', () => {
      // Height difference of 1 should be passable
      expect(service.isPassable(0, 0, 1, 0)).toBeTruthy(); // Height 0 to 1
    });

    it('should prevent movement between tiles with large height difference', () => {
      // Height difference of 3 should not be passable
      expect(service.isPassable(0, 0, 3, 0)).toBeFalsy(); // Height 0 to 3
    });

    it('should allow movement between tiles with same height', () => {
      // Same height should be passable
      expect(service.isPassable(1, 1, 2, 1)).toBeTruthy(); // Both height 2
    });
  });

  describe('validateBuildingTerrain', () => {
    it('should allow building placement on flat terrain', () => {
      // 1x1 building on flat terrain
      const result = service.validateBuildingTerrain(10, 10, { width: 1, height: 1 });
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should prevent building placement on uneven terrain', () => {
      // 2x2 building spanning different heights
      const result = service.validateBuildingTerrain(0, 0, { width: 2, height: 2 });
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('terrain');
      expect(result.message).toContain('Terrain too uneven');
    });

    it('should detect water at building corners', () => {
      // Building with a corner in water
      const result = service.validateBuildingTerrain(3, 3, { width: 2, height: 2 });
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');
      expect(result.message).toContain('Cannot place building on water');
    });
  });

  describe('checkRoadOverlap', () => {
    it('should detect no overlap on empty terrain', () => {
      const result = service.checkRoadOverlap(0, 0, 5, 0, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should detect overlap with existing road along segment', () => {
      // Place a road at (2, 0) - in the middle of our test segment
      mockRoadState.placedRoads.set('2,0', {
        x: 2,
        z: 0,
        connections: [Direction.North, Direction.South],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      const result = service.checkRoadOverlap(0, 0, 5, 0, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('road');
    });

    it('should handle diagonal road segments', () => {
      const result = service.checkRoadOverlap(0, 0, 3, 3, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should detect water collision along road segment', () => {
      // Try to build road through water area
      const result = service.checkRoadOverlap(2, 2, 4, 4, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');
    });
  });

  describe('validateRoadSegment', () => {
    it('should validate a simple horizontal road segment', () => {
      const result = service.validateRoadSegment(0, 0, 5, 0, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should validate a simple vertical road segment', () => {
      const result = service.validateRoadSegment(0, 0, 0, 5, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });

    it('should reject road segment extending outside map bounds', () => {
      const result = service.validateRoadSegment(-1000, 0, -2000, 0, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('bounds');
      expect(result.message).toContain('outside map bounds');
    });

    it('should handle zero-length segments', () => {
      const result = service.validateRoadSegment(10, 10, 10, 10, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });
  });

  describe('wouldBlockRoadExtension', () => {
    it('should detect when building would block dead end extension', () => {
      // Add a dead end at (10, 10)
      mockRoadState.deadEnds.push({ x: 10, z: 10 });
      
      // Check if building at (11, 10) would block eastward extension
      const result = service.wouldBlockRoadExtension(11, 10, mockRoadState);
      
      expect(result).toBeTruthy();
    });

    it('should allow building placement that does not block extensions', () => {
      // Add a dead end at (10, 10)
      mockRoadState.deadEnds.push({ x: 10, z: 10 });
      
      // Check if building at (12, 12) would block extension (it should not)
      const result = service.wouldBlockRoadExtension(12, 12, mockRoadState);
      
      expect(result).toBeFalsy();
    });

    it('should handle multiple dead ends', () => {
      // Add multiple dead ends
      mockRoadState.deadEnds.push({ x: 5, z: 5 });
      mockRoadState.deadEnds.push({ x: 15, z: 15 });
      
      // Check building that would block one of them
      const result = service.wouldBlockRoadExtension(6, 5, mockRoadState);
      
      expect(result).toBeTruthy();
    });

    it('should not block when no dead ends exist', () => {
      // Empty dead ends array
      const result = service.wouldBlockRoadExtension(10, 10, mockRoadState);
      
      expect(result).toBeFalsy();
    });
  });

  describe('isAdjacentToRoad', () => {
    it('should detect adjacency to existing road', () => {
      // Place a road at (5, 5)
      mockRoadState.placedRoads.set('5,5', {
        x: 5,
        z: 5,
        connections: [Direction.North, Direction.South],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      // Check position adjacent to the road
      const result = service.isAdjacentToRoad(6, 5, mockRoadState);
      
      expect(result).toBeTruthy();
    });

    it('should not detect adjacency when no roads nearby', () => {
      const result = service.isAdjacentToRoad(100, 100, mockRoadState);
      
      expect(result).toBeFalsy();
    });

    it('should check all four cardinal directions', () => {
      // Place a road at (10, 10)
      mockRoadState.placedRoads.set('10,10', {
        x: 10,
        z: 10,
        connections: [Direction.North, Direction.South],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      // Check all adjacent positions
      expect(service.isAdjacentToRoad(11, 10, mockRoadState)).toBeTruthy(); // East
      expect(service.isAdjacentToRoad(9, 10, mockRoadState)).toBeTruthy();  // West
      expect(service.isAdjacentToRoad(10, 11, mockRoadState)).toBeTruthy(); // South
      expect(service.isAdjacentToRoad(10, 9, mockRoadState)).toBeTruthy();  // North
      
      // Check diagonal (should not be adjacent)
      expect(service.isAdjacentToRoad(11, 11, mockRoadState)).toBeFalsy();
    });
  });

  describe('getAdjacentPositions', () => {
    it('should return all four cardinal adjacent positions', () => {
      const positions = service.getAdjacentPositions(5, 5);

      expect(positions.length).toBe(4);
      
      // Check that each expected position is present using deep equality
      const expectedPositions = [
        { x: 6, z: 5 }, // East
        { x: 4, z: 5 }, // West
        { x: 5, z: 6 }, // South
        { x: 5, z: 4 }  // North
      ];
      
      expectedPositions.forEach(expected => {
        const found = positions.some(pos => 
          pos.x === expected.x && pos.z === expected.z
        );
        expect(found).toBe(true);
      });
    });

    it('should handle negative coordinates', () => {
      const positions = service.getAdjacentPositions(-10, -10);

      expect(positions.length).toBe(4);
      
      // Check that each expected position is present using deep equality
      const expectedPositions = [
        { x: -9, z: -10 }, // East
        { x: -11, z: -10 }, // West
        { x: -10, z: -9 }, // South
        { x: -10, z: -11 }  // North
      ];
      
      expectedPositions.forEach(expected => {
        const found = positions.some(pos => 
          pos.x === expected.x && pos.z === expected.z
        );
        expect(found).toBe(true);
      });
    });
  });

  describe('getMapBounds', () => {
    it('should return map bounds', () => {
      const bounds = service.getMapBounds();
      
      expect(bounds).toEqual({
        minX: -1000,
        maxX: 1000,
        minZ: -1000,
        maxZ: 1000
      });
    });

    it('should return a copy of bounds (not reference)', () => {
      const bounds1 = service.getMapBounds();
      const bounds2 = service.getMapBounds();
      
      expect(bounds1).not.toBe(bounds2); // Different objects
      expect(bounds1).toEqual(bounds2);  // Same values
    });
  });

  describe('terrain validation edge cases', () => {
    it('should handle coordinates at map boundary', () => {
      const bounds = service.getMapBounds();
      
      // Test exactly at boundaries
      expect(service.canPlaceRoad(bounds.minX, bounds.minZ, mockRoadState).hasCollision).toBeFalsy();
      expect(service.canPlaceRoad(bounds.maxX, bounds.maxZ, mockRoadState).hasCollision).toBeFalsy();
      
      // Test just outside boundaries
      expect(service.canPlaceRoad(bounds.minX - 1, bounds.minZ, mockRoadState).hasCollision).toBeTruthy();
      expect(service.canPlaceRoad(bounds.maxX + 1, bounds.maxZ, mockRoadState).hasCollision).toBeTruthy();
    });

    it('should handle water body edge cases', () => {
      // Test positions at the edge of water bodies
      // Water body near origin
      
      // Just inside water
      const insideResult = service.canPlaceRoad(2, 2, mockRoadState);
      expect(insideResult.hasCollision).toBeTruthy();
      expect(insideResult.collisionType).toBe('water');
      
      // Just outside water (should be valid)
      const outsideResult = service.canPlaceRoad(6, 6, mockRoadState);
      expect(outsideResult.hasCollision).toBeFalsy();
    });
  });

  describe('complex collision scenarios', () => {
    it('should handle multiple collision types in sequence', () => {
      // Place some roads
      mockRoadState.placedRoads.set('0,0', {
        x: 0, z: 0,
        connections: [Direction.East],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      // Try to place road at same position (road collision)
      let result = service.canPlaceRoad(0, 0, mockRoadState);
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('road');

      // Try to place road in water (water collision)
      result = service.canPlaceRoad(2, 2, mockRoadState);
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');

      // Try to place road outside bounds (bounds collision)
      result = service.canPlaceRoad(-2000, 0, mockRoadState);
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('bounds');
    });

    it('should handle building placement with complex constraints', () => {
      // Place a road
      mockRoadState.placedRoads.set('10,10', {
        x: 10, z: 10,
        connections: [Direction.North, Direction.South],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      const mockBuildingMap = new Map<string, any>();

      // Try to place building on road (should fail)
      let result = service.canPlaceBuilding(10, 10, mockRoadState, mockBuildingMap);
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('road');

      // Try to place building in water (should fail)
      result = service.canPlaceBuilding(2, 2, mockRoadState, mockBuildingMap);
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');

      // Try to place building outside bounds (should fail)
      result = service.canPlaceBuilding(-2000, 0, mockRoadState, mockBuildingMap);
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('bounds');

      // Try to place building on valid terrain (should succeed)
      result = service.canPlaceBuilding(15, 15, mockRoadState, mockBuildingMap);
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
    });
  });
});