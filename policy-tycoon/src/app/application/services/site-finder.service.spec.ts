import { TestBed } from '@angular/core/testing';
import { SiteFinderService } from './site-finder.service';
import { TerrainGenerationService } from './terrain-generation.service';
import { CollisionDetectionService } from './collision-detection.service';

describe('SiteFinderService', () => {
  let service: SiteFinderService;
  let terrainService: any;
  let collisionService: any;

  beforeEach(() => {
    const terrainSpy = jasmine.createSpyObj('TerrainGenerationService', ['isWaterAt', 'getHeightAt']);
    const collisionSpy = jasmine.createSpyObj('CollisionDetectionService', ['isBuildableLand']);

    TestBed.configureTestingModule({
      providers: [
        SiteFinderService,
        { provide: TerrainGenerationService, useValue: terrainSpy },
        { provide: CollisionDetectionService, useValue: collisionSpy }
      ]
    });

    service = TestBed.inject(SiteFinderService);
    terrainService = TestBed.inject(TerrainGenerationService);
    collisionService = TestBed.inject(CollisionDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('findCityStartPoints', () => {
    it('should find valid city start points', () => {
      // Setup mock data for a simple 5x5 flat area
      terrainService.isWaterAt.and.callFake((x: number, z: number) => {
        // Water outside the 5x5 area
        return x < 0 || x > 4 || z < 0 || z > 4;
      });

      collisionService.isBuildableLand.and.returnValue(true);

      const mapBounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
      const result = service.findCityStartPoints(1, 20, mapBounds);

      expect(result.length).toBe(1);
      expect(result[0].areaSize).toBeGreaterThanOrEqual(20);
    });

    it('should not select water tiles as start points', () => {
      // Setup all tiles as water
      terrainService.isWaterAt.and.returnValue(true);

      const mapBounds = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
      const result = service.findCityStartPoints(1, 5, mapBounds);

      expect(result.length).toBe(0);
    });

    it('should respect the minimum area size requirement', () => {
      // Setup a small valid area
      terrainService.isWaterAt.and.callFake((x: number, z: number) => {
        // Only a 2x2 area is valid (area = 4)
        return x < 5 || x > 6 || z < 5 || z > 6;
      });

      collisionService.isBuildableLand.and.returnValue(true);

      const mapBounds = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
      const result = service.findCityStartPoints(1, 10, mapBounds); // Require area of 10

      expect(result.length).toBe(0); // Should not find any sites meeting the requirement
    });
  });

  describe('calculateBuildableArea', () => {
    it('should calculate area using breadth-first search', () => {
      // Setup a simple 3x3 flat area
      terrainService.isWaterAt.and.callFake((x: number, z: number) => {
        // Water outside the 3x3 area centered at (5,5)
        return x < 4 || x > 6 || z < 4 || z > 6;
      });

      collisionService.isBuildableLand.and.returnValue(true);

      // @ts-ignore - accessing private method for testing
      const result = service.calculateBuildableArea(5, 5, new Set<string>());

      expect(result.areaSize).toBe(9); // 3x3 area
      expect(result.visitedInThisSearch.size).toBe(9);
    });

    it('should stop at water boundaries', () => {
      // Setup a cross shape with water in the middle
      terrainService.isWaterAt.and.callFake((x: number, z: number) => {
        // Water at the center (5,5)
        return x === 5 && z === 5;
      });

      collisionService.isBuildableLand.and.returnValue(true);

      // @ts-ignore - accessing private method for testing
      const result = service.calculateBuildableArea(5, 4, new Set<string>()); // Start north of water

      expect(result.areaSize).toBe(1); // Only the starting tile
    });

    it('should respect impassable terrain', () => {
      // Setup a 3x3 area but with impassable connections
      terrainService.isWaterAt.and.returnValue(false);
      
      collisionService.isBuildableLand.and.callFake((fromX: number, fromZ: number, toX: number, toZ: number) => {
        // Make the connection from (5,5) to (6,5) impassable
        return !(fromX === 5 && fromZ === 5 && toX === 6 && toZ === 5);
      });

      // @ts-ignore - accessing private method for testing
      const result = service.calculateBuildableArea(5, 5, new Set<string>());

      // Should only include the starting tile since the connection to the east is blocked
      expect(result.areaSize).toBe(1);
    });
  });
});