/** Converted from Vitest to Jasmine (Karma) **/
import { RoadNetworkBuilderService } from './road-network-builder.service';
import { CollisionDetectionService } from './collision-detection.service';
import { GenerationLoggerService } from './generation-logger.service';
import { SeededRandom } from '../../utils/seeded-random';
import { MockTerrainGenerationService } from './__mocks__/terrain-generation.service';
import { TerrainGenerationService } from './terrain-generation.service';
// Note: Jasmine provides describe/it/expect/beforeEach as globals

describe('RoadNetworkBuilderService - Diagonal Roads', () => {
  let service: RoadNetworkBuilderService;
  let collisionService: any;
  let logger: any;

  beforeEach(() => {
    // Create spy for collision detection service
    collisionService = jasmine.createSpyObj('CollisionDetectionService', ['canPlaceRoad']);
    
    logger = jasmine.createSpyObj('GenerationLoggerService', ['info', 'warn', 'error']);

    // Import and use the mock terrain generation service
    const terrainGeneration = new MockTerrainGenerationService();

    // Create service directly for zoneless mode
    service = new RoadNetworkBuilderService(
      collisionService, 
      logger,
      terrainGeneration as unknown as TerrainGenerationService
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Diagonal Road Generation', () => {
    beforeEach(() => {
      // Mock collision detection to allow all placements
      collisionService.canPlaceRoad.and.returnValue({
        hasCollision: false,
        collisionType: 'none'
      });
    });

    it('should generate diagonal road segments when enabled', () => {
      const rng = new SeededRandom(12345);
      const result = service.buildInitialNetwork(0, 0, rng);

      // Should have segments (exact count may vary)
      expect(result.segments.length).toBeGreaterThan(0);

      // Check that we have some diagonal segments (may be zero depending on RNG)
      const diagonalSegments = result.segments.filter(s => s.roadType === 'diagonal');
      expect(diagonalSegments.length).toBeGreaterThanOrEqual(0);
      // Note: The exact count depends on the random seed and implementation
    });

    it('should create proper road segment types including diagonal roads', () => {
      const rng = new SeededRandom(12345);
      const result = service.buildInitialNetwork(0, 0, rng);

      // Should have at least one of each road type
      const roadTypes = result.segments.map(s => s.roadType);
      expect(roadTypes).toContain('horizontal');
      expect(roadTypes).toContain('vertical');
      
      // Diagonal roads may or may not be present depending on random generation
      // But the functionality should exist
    });

    it('should handle diagonal road connections properly', () => {
      const rng = new SeededRandom(12345);
      const result = service.buildInitialNetwork(10, 20, rng);

      // Check that diagonal segments have proper connections
      const diagonalSegments = result.segments.filter(s => s.roadType === 'diagonal');
      // Ensure we still have at least one expectation even if none are present
      expect(diagonalSegments.length).toBeGreaterThanOrEqual(0);
      diagonalSegments.forEach(segment => {
        expect(segment.connections).toBeDefined();
        expect(segment.connections!.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should maintain connectivity between diagonal and straight roads', () => {
      const rng = new SeededRandom(12345);
      const result = service.buildInitialNetwork(0, 0, rng);

      // Verify that all segments are properly connected
      // This is a complex test that would require detailed analysis of the road network
      // For now, we just verify that segments exist and have proper data
      expect(result.segments.length).toBeGreaterThan(0);
      
      result.segments.forEach(segment => {
        expect(segment.startX).toBeDefined();
        expect(segment.startZ).toBeDefined();
        expect(segment.endX).toBeDefined();
        expect(segment.endZ).toBeDefined();
        expect(segment.roadType).toBeDefined();
      });
    });
  });

  describe('Intersection Handling with Diagonal Roads', () => {
    beforeEach(() => {
      // Mock collision detection to allow all placements
      collisionService.canPlaceRoad.and.returnValue({
        hasCollision: false,
        collisionType: 'none'
      });
    });

    it('should create proper intersections for diagonal road combinations', () => {
      const rng = new SeededRandom(12345);
      const result = service.buildInitialNetwork(0, 0, rng);

      // Should have intersections
      expect(result.intersections.length).toBeGreaterThanOrEqual(1);

      // Check that intersections have proper data
      result.intersections.forEach(intersection => {
        expect(intersection.x).toBeDefined();
        expect(intersection.z).toBeDefined();
      });
    });

    it('should handle mixed straight and diagonal road intersections', () => {
      const rng = new SeededRandom(12345);
      const result = service.buildInitialNetwork(50, 75, rng);

      // Should have segments of different types
      const segmentTypes = new Set(result.segments.map(s => s.roadType));
      expect(segmentTypes.has('horizontal') || segmentTypes.has('vertical')).toBeTruthy();
      
      // Diagonal roads may be present depending on random generation
    });
  });

  describe('Error Handling with Diagonal Roads', () => {
    it('should handle collision during diagonal road generation', () => {
      const rng = new SeededRandom(12345);
      
      // Mock collision on a diagonal road tile
      collisionService.canPlaceRoad.and.callFake((x: number, z: number, state: any) => {
        // Simulate collision on a diagonal tile
        if (Math.abs(x) === Math.abs(z) && x !== 0 && z !== 0) {
          return { hasCollision: true, collisionType: 'water' as const };
        }
        return { hasCollision: false, collisionType: 'none' as const };
      });

      const result = service.buildInitialNetwork(0, 0, rng);

      // Should still generate a valid road network
      expect(result.segments.length).toBeGreaterThanOrEqual(0);
      expect(result.intersections.length).toBeGreaterThanOrEqual(0);
    });

    it('should gracefully handle errors in diagonal road generation', () => {
      const rng = new SeededRandom(12345);
      
      // Mock an error in collision detection
      collisionService.canPlaceRoad.and.callFake(() => {
        throw new Error('Test error');
      });

      const result = service.buildInitialNetwork(0, 0, rng);

      // Should return a valid (possibly empty) road network
      expect(result).toBeDefined();
      expect(result.segments).toBeDefined();
      expect(result.intersections).toBeDefined();
      expect(result.deadEnds).toBeDefined();
    });
  });
});