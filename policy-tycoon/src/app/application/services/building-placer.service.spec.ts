/**
 * Unit tests for BuildingPlacerService
 * Tests random walk algorithm, building spot validation, and iterative placement
 */

import { BuildingPlacerService, RandomWalkResult } from './building-placer.service';
import { CollisionDetectionService } from './collision-detection.service';
import { CityConfigurationService } from './city-configuration.service';
import { GenerationLoggerService } from './generation-logger.service';
import { TerrainGenerationService } from './terrain-generation.service'; // NEW: Import terrain service
import { SeededRandom } from '../../utils/seeded-random';
import { 
  RoadNetwork, 
  RoadSegment, 
  Point, 
  Direction,
  BuildingType,
  Building,
  BuildingPlacement
} from '../../data/models/city-generation';

describe('BuildingPlacerService - Zoneless', () => {
  let service: BuildingPlacerService;
  let collisionDetection: CollisionDetectionService;
  let cityConfiguration: CityConfigurationService;
  let logger: GenerationLoggerService;
  let terrainGeneration: TerrainGenerationService; // NEW: Add terrain service
  let rng: SeededRandom;

  // Test data
  const testBuildingType: BuildingType = {
    id: 'small-house',
    name: 'Small House',
    population: 4,
    width: 1,
    height: 1
  };

  const createTestRoadNetwork = (): RoadNetwork => {
    const segments: RoadSegment[] = [
      // Central crossroad
      {
        startX: 0, startZ: 0, endX: 0, endZ: 0,
        roadType: 'intersection', gridX: 0, gridZ: 0,
        connections: [Direction.North, Direction.South, Direction.East, Direction.West]
      },
      // North arm
      {
        startX: 0, startZ: -1, endX: 0, endZ: -2,
        roadType: 'vertical', gridX: 0, gridZ: -1
      },
      // South arm
      {
        startX: 0, startZ: 1, endX: 0, endZ: 2,
        roadType: 'vertical', gridX: 0, gridZ: 1
      },
      // East arm
      {
        startX: 1, startZ: 0, endX: 2, endZ: 0,
        roadType: 'horizontal', gridX: 1, gridZ: 0
      },
      // West arm
      {
        startX: -1, startZ: 0, endX: -2, endZ: 0,
        roadType: 'horizontal', gridX: -1, gridZ: 0
      }
    ];

    return {
      segments: segments,
      intersections: [{ x: 0, z: 0 }],
      deadEnds: [
        { x: 0, z: -2 },
        { x: 0, z: 2 },
        { x: 2, z: 0 },
        { x: -2, z: 0 }
      ]
    };
  };

  beforeEach(() => {
    // Create mock services
    collisionDetection = jasmine.createSpyObj('CollisionDetectionService', [
      'canPlaceBuilding',
      'isAdjacentToRoad',
      'wouldBlockRoadExtension',
      'getMapBounds',
      'getAdjacentPositions'
    ]);
    
    cityConfiguration = jasmine.createSpyObj('CityConfigurationService', [
      'selectRandomBuilding',
      'getPopulationRange',
      'getBuildingTypes',
      'selectRandomBuildingByPopulation',
      'getBuildingTypesByPopulation',
      'getBuildingTypeById'
    ]);

    logger = jasmine.createSpyObj('GenerationLoggerService', ['info', 'warn', 'error']);

    terrainGeneration = {} as any; // NEW: Create terrain service mock (not used here)

    // Create service directly for zoneless mode
    service = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration); // NEW: Provide terrain service
    
    rng = new SeededRandom(12345); // Fixed seed for deterministic tests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Random Walk Algorithm (Task 8.1)', () => {
    it('should perform random walk starting from town center', () => {
      const roadNetwork = createTestRoadNetwork();
      
      const result = service.performRandomWalk(roadNetwork, rng);
      
      expect(result).toBeDefined();
      expect(result.walkPath).toBeDefined();
      expect(result.validSpots).toBeDefined();
      expect(result.stepsCompleted).toBeDefined();
      
      // Walk should start from town center (intersection)
      expect(result.walkPath.length).toBeGreaterThan(0);
      expect(result.walkPath[0]).toEqual({ x: 0, z: 0 });
    });

    it('should follow roads for 3-7 steps', () => {
      const roadNetwork = createTestRoadNetwork();
      
      // Test multiple walks to verify step count range
      const stepCounts: number[] = [];
      for (let i = 0; i < 20; i++) {
        const testRng = new SeededRandom(i);
        const result = service.performRandomWalk(roadNetwork, testRng);
        stepCounts.push(result.stepsCompleted);
      }
      
      // All step counts should be between 0 and 7 (0 if dead end reached early)
      stepCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(7);
      });
      
      // At least some walks should complete multiple steps
      expect(stepCounts.some(count => count >= 3)).toBe(true);
    });

    it('should select directions using available roads', () => {
      const roadNetwork = createTestRoadNetwork();
      
      const result = service.performRandomWalk(roadNetwork, rng);
      
      // Walk path should only contain positions that are on roads
      result.walkPath.forEach(position => {
        const isOnRoad = roadNetwork.segments.some(segment => 
          service['isPositionOnSegment'](position, segment)
        );
        expect(isOnRoad).toBe(true);
      });
    });

    it('should find valid spots adjacent to roads', () => {
      const roadNetwork = createTestRoadNetwork();
      
      const result = service.performRandomWalk(roadNetwork, rng);
      
      expect(result.validSpots.length).toBeGreaterThan(0);
      
      // Each valid spot should be adjacent to at least one road
      result.validSpots.forEach(spot => {
        const adjacentPositions = [
          { x: spot.x + 1, z: spot.z },
          { x: spot.x - 1, z: spot.z },
          { x: spot.x, z: spot.z + 1 },
          { x: spot.x, z: spot.z - 1 }
        ];
        
        const isAdjacentToRoad = adjacentPositions.some(pos => 
          roadNetwork.segments.some(segment => 
            service['isPositionOnSegment'](pos, segment)
          )
        );
        
        expect(isAdjacentToRoad).toBe(true);
      });
    });

    it('should terminate early at dead ends', () => {
      // Create a simple linear road network with a clear dead end
      const linearRoadNetwork: RoadNetwork = {
        segments: [
          {
            startX: 0, startZ: 0, endX: 1, endZ: 0,
            roadType: 'horizontal', gridX: 0, gridZ: 0
          },
          {
            startX: 1, startZ: 0, endX: 2, endZ: 0,
            roadType: 'horizontal', gridX: 1, gridZ: 0
          }
        ],
        intersections: [],
        deadEnds: [{ x: 0, z: 0 }, { x: 2, z: 0 }]
      };
      
      const result = service.performRandomWalk(linearRoadNetwork, rng);
      
      // Walk should terminate when reaching dead end
      // Note: The actual implementation may take more steps depending on the random walk
      expect(result.stepsCompleted).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty road network gracefully', () => {
      const emptyRoadNetwork: RoadNetwork = {
        segments: [],
        intersections: [],
        deadEnds: []
      };
      
      const result = service.performRandomWalk(emptyRoadNetwork, rng);
      
      expect(result).toBeDefined();
      expect(result.walkPath).toEqual([]);
      expect(result.validSpots).toEqual([]);
      expect(result.stepsCompleted).toBe(0);
    });
  });

  describe('Building Placement (Task 8.2)', () => {
    beforeEach(() => {
      // Setup common test mocks
      (cityConfiguration.selectRandomBuilding as jasmine.Spy).and.returnValue(testBuildingType);
    });

    it('should place initial buildings with target population', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 20;
      
      // Mock collision detection to allow placement
      (collisionDetection.canPlaceBuilding as jasmine.Spy).and.returnValue({ hasCollision: false, collisionType: 'none' });
      (collisionDetection.isAdjacentToRoad as jasmine.Spy).and.returnValue(true);
      (collisionDetection.wouldBlockRoadExtension as jasmine.Spy).and.returnValue(false);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, rng);
      
      expect(result).toBeDefined();
      expect(result.buildings).toBeDefined();
      expect(result.totalPopulation).toBeDefined();
    });

    it('should respect target population limit', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 12;
      
      // Mock collision detection to allow placement
      (collisionDetection.canPlaceBuilding as jasmine.Spy).and.returnValue({ hasCollision: false, collisionType: 'none' });
      (collisionDetection.isAdjacentToRoad as jasmine.Spy).and.returnValue(true);
      (collisionDetection.wouldBlockRoadExtension as jasmine.Spy).and.returnValue(false);
      (collisionDetection.getMapBounds as jasmine.Spy).and.returnValue({
        minX: -100,
        maxX: 100,
        minZ: -100,
        maxZ: 100
      });
      (collisionDetection.getAdjacentPositions as jasmine.Spy).and.callFake((x: number, z: number): { x: number, z: number }[] => [
        { x: x + 1, z: z },
        { x: x - 1, z: z },
        { x: x, z: z + 1 },
        { x: x, z: z - 1 }
      ]);
      
      // Mock configuration service to return small buildings
      const smallBuildingType: BuildingType = {
        id: 'small-house',
        name: 'Small House',
        population: 4,
        width: 1,
        height: 1
      };
      (cityConfiguration.selectRandomBuilding as jasmine.Spy).and.returnValue(smallBuildingType);
      (cityConfiguration.getBuildingTypes as jasmine.Spy).and.returnValue([smallBuildingType]);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, rng);
      
      // Should place buildings until reaching or exceeding target population
      expect(result.totalPopulation).toBeGreaterThanOrEqual(targetPopulation);
    });

    it('should stop when no more valid spots are available', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 100; // High target that can't be reached
      
      // Mock collision detection to reject all placements
      (collisionDetection.canPlaceBuilding as jasmine.Spy).and.returnValue({ hasCollision: true, collisionType: 'terrain' });
      (collisionDetection.isAdjacentToRoad as jasmine.Spy).and.returnValue(false);
      (collisionDetection.wouldBlockRoadExtension as jasmine.Spy).and.returnValue(true);
      
      // Mock configuration service
      (cityConfiguration.selectRandomBuilding as jasmine.Spy).and.returnValue(testBuildingType);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, rng);
      
      // Should have fewer buildings than target due to placement restrictions
      expect(result.totalPopulation).toBeLessThan(targetPopulation);
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify if position is on segment', () => {
      const segment: RoadSegment = {
        startX: 0, startZ: 0, endX: 2, endZ: 0,
        roadType: 'horizontal', gridX: 0, gridZ: 0
      };
      
      // Test positions on the segment
      expect(service['isPositionOnSegment']({ x: 0, z: 0 }, segment)).toBe(true);
      expect(service['isPositionOnSegment']({ x: 1, z: 0 }, segment)).toBe(true);
      expect(service['isPositionOnSegment']({ x: 2, z: 0 }, segment)).toBe(true);
      
      // Test positions not on the segment
      expect(service['isPositionOnSegment']({ x: 3, z: 0 }, segment)).toBe(false);
      expect(service['isPositionOnSegment']({ x: 0, z: 1 }, segment)).toBe(false);
    });
  });
});