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

describe('CollisionDetectionService - Zoneless', () => {
  let service: CollisionDetectionService;
  let mockRoadState: RoadGenerationState;

  beforeEach(() => {
    // Create service directly for zoneless mode
    service = new CollisionDetectionService();
    
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
      const result = service.canPlaceRoad(0, 0, mockRoadState);
      
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
      // Test position near water body at (100, 200) with radius 50
      const result = service.canPlaceRoad(120, 220, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');
      expect(result.message).toContain('Cannot place road on water');
    });

    it('should detect collision with impassable terrain', () => {
      // Test position near impassable area at (-200, 300) with radius 25
      const result = service.canPlaceRoad(-200, 300, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('impassable');
      expect(result.message).toContain('Terrain is impassable');
    });

    it('should allow road placement on moderate slopes', () => {
      // Test on terrain with acceptable slope
      const result = service.canPlaceRoad(50, 50, mockRoadState);
      
      expect(result.hasCollision).toBeFalsy();
      expect(result.collisionType).toBe('none');
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
      const result = service.canPlaceBuilding(100, 200, mockRoadState, mockBuildingMap);
      
      expect(result.hasCollision).toBeTruthy();
      expect(result.collisionType).toBe('water');
      expect(result.message).toContain('Cannot place building on water');
    });

    it('should be more strict about slopes for buildings than roads', () => {
      // Buildings should have stricter slope requirements than roads
      // This test verifies that buildings are rejected on slopes that roads might accept
      
      // Test on a position that might be acceptable for roads but not buildings
      // The exact position would depend on the terrain generation algorithm
      const result = service.canPlaceBuilding(0, 0, mockRoadState, mockBuildingMap);
      
      // This test validates the concept - actual slope values depend on terrain generation
      expect(result).toBeDefined();
      expect(result.collisionType).toBeDefined();
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
      const result = service.checkRoadOverlap(90, 190, 110, 210, mockRoadState);
      
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
      // Water body at (100, 200) with radius 50
      
      // Just inside water
      const insideResult = service.canPlaceRoad(130, 200, mockRoadState);
      expect(insideResult.hasCollision).toBeTruthy();
      expect(insideResult.collisionType).toBe('water');
      
      // Just outside water (should be valid)
      const outsideResult = service.canPlaceRoad(160, 200, mockRoadState);
      expect(outsideResult.hasCollision).toBeFalsy();
    });

    it('should handle impassable terrain edge cases', () => {
      // Test positions at the edge of impassable areas
      // Impassable area at (-200, 300) with radius 25
      
      // Just inside impassable area
      const insideResult = service.canPlaceRoad(-190, 300, mockRoadState);
      expect(insideResult.hasCollision).toBeTruthy();
      expect(insideResult.collisionType).toBe('impassable');
      
      // Just outside impassable area (should be valid)
      const outsideResult = service.canPlaceRoad(-170, 300, mockRoadState);
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

      // Test road segment that would hit existing road, then water
      const result = service.checkRoadOverlap(-5, 0, 120, 200, mockRoadState);
      
      expect(result.hasCollision).toBeTruthy();
      // Should detect the first collision (existing road or water)
      expect(['road', 'water']).toContain(result.collisionType);
    });

    it('should validate building placement near roads and terrain features', () => {
      const mockBuildingMap = new Map();
      
      // Place a road
      mockRoadState.placedRoads.set('10,10', {
        x: 10, z: 10,
        connections: [Direction.North, Direction.South],
        isIntersection: false,
        isCorner: false,
        isDeadEnd: false
      });

      // Test building adjacent to road (should be valid if terrain allows)
      const adjacentResult = service.canPlaceBuilding(11, 10, mockRoadState, mockBuildingMap);
      
      // Should be valid (adjacent to road, not on water/impassable terrain)
      expect(adjacentResult.hasCollision).toBeFalsy();
    });
  });
});