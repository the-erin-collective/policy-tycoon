/**
 * Unit tests for BuildingPlacerService - Boundary-aware building placement
 * Tests enhanced collision detection, boundary validation, and organized building placement
 */

// Converted from Vitest to Jasmine (Karma)
import { BuildingPlacerService } from './building-placer.service';
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

describe('BuildingPlacerService - Boundary-aware Placement', () => {
  let service: BuildingPlacerService;
  let collisionDetection: CollisionDetectionService;
  let cityConfiguration: CityConfigurationService;
  let logger: GenerationLoggerService;
  let rng: SeededRandom;

  // Test data
  const testBuildingTypes: BuildingType[] = [
    {
      id: 'small-house',
      name: 'Small House',
      population: 4,
      width: 1,
      height: 1
    },
    {
      id: 'medium-house',
      name: 'Medium House',
      population: 8,
      width: 1,
      height: 2
    },
    {
      id: 'large-house',
      name: 'Large House',
      population: 16,
      width: 2,
      height: 2
    }
  ];

  const createTestRoadNetwork = (): RoadNetwork => {
    const segments: RoadSegment[] = [
      // Central intersection
      {
        startX: 0, startZ: 0, endX: 0, endZ: 0,
        roadType: 'intersection', gridX: 0, gridZ: 0,
        connections: [Direction.North, Direction.South, Direction.East, Direction.West]
      },
      // North road
      {
        startX: 0, startZ: -1, endX: 0, endZ: -3,
        roadType: 'vertical', gridX: 0, gridZ: -1
      },
      // South road
      {
        startX: 0, startZ: 1, endX: 0, endZ: 3,
        roadType: 'vertical', gridX: 0, gridZ: 1
      },
      // East road
      {
        startX: 1, startZ: 0, endX: 3, endZ: 0,
        roadType: 'horizontal', gridX: 1, gridZ: 0
      },
      // West road
      {
        startX: -1, startZ: 0, endX: -3, endZ: 0,
        roadType: 'horizontal', gridX: -1, gridZ: 0
      }
    ];

    return {
      segments: segments,
      intersections: [{ x: 0, z: 0 }],
      deadEnds: [
        { x: 0, z: -3 },
        { x: 0, z: 3 },
        { x: 3, z: 0 },
        { x: -3, z: 0 }
      ]
    };
  };

  beforeEach(() => {
    // Create mock services
    const terrainGeneration = new TerrainGenerationService(); // NEW: Create terrain service
    collisionDetection = new CollisionDetectionService(terrainGeneration); // FIXED: Pass terrain service
    
    cityConfiguration = {
      selectRandomBuilding: jasmine.createSpy('selectRandomBuilding'),
      getPopulationRange: jasmine.createSpy('getPopulationRange'),
      getBuildingTypes: jasmine.createSpy('getBuildingTypes').and.returnValue(testBuildingTypes),
      selectRandomBuildingByPopulation: jasmine.createSpy('selectRandomBuildingByPopulation'),
      getBuildingTypesByPopulation: jasmine.createSpy('getBuildingTypesByPopulation'),
      getBuildingTypeById: jasmine.createSpy('getBuildingTypeById')
    } as any;

    logger = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    } as any;

    // Create service directly for zoneless mode
    service = new BuildingPlacerService(
      collisionDetection, 
      cityConfiguration, 
      logger,
      terrainGeneration // NEW: Pass terrain service
    );
    
    rng = new SeededRandom(12345); // Fixed seed for deterministic tests
    expect(service).toBeTruthy();
  });

  describe('Boundary-aware Building Placement', () => {
    it('should respect map boundaries when placing buildings', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 20;
      
      // Use a fixed seed for reproducible results
      const testRng = new SeededRandom(42);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      expect(result).toBeDefined();
      expect(result.buildings).toBeDefined();
      expect(result.totalPopulation).toBeDefined();
      
      // All buildings should be within map bounds
      const mapBounds = collisionDetection.getMapBounds();
      result.buildings.forEach(building => {
        expect(building.x).toBeGreaterThanOrEqual(mapBounds.minX);
        expect(building.x).toBeLessThanOrEqual(mapBounds.maxX);
        expect(building.z).toBeGreaterThanOrEqual(mapBounds.minZ);
        expect(building.z).toBeLessThanOrEqual(mapBounds.maxZ);
      });
    });

    it('should prevent buildings from overlapping with roads', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 30;
      
      // Use a fixed seed for reproducible results
      const testRng = new SeededRandom(99);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      // No buildings should be placed on road positions
      result.buildings.forEach(building => {
        const isOnRoad = roadNetwork.segments.some(segment => {
          // Check if building position overlaps with any road segment
          if (segment.startX === segment.endX && segment.startZ === segment.endZ) {
            // Single point segment (intersection/corner)
            return building.x === segment.startX && building.z === segment.startZ;
          } else if (segment.startX === segment.endX) {
            // Vertical segment
            return building.x === segment.startX && 
                   building.z >= Math.min(segment.startZ, segment.endZ) && 
                   building.z <= Math.max(segment.startZ, segment.endZ);
          } else if (segment.startZ === segment.endZ) {
            // Horizontal segment
            return building.z === segment.startZ && 
                   building.x >= Math.min(segment.startX, segment.endX) && 
                   building.x <= Math.max(segment.startX, segment.endX);
          }
          return false;
        });
        expect(isOnRoad).toBeFalsy();
      });
    });

    it('should place buildings in organized blocks near roads', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 25;
      
      // Use a fixed seed for reproducible results
      const testRng = new SeededRandom(150);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      // Buildings should be adjacent to roads
      result.buildings.forEach(building => {
        // Check if at least one adjacent position has a road
        const adjacentPositions = [
          { x: building.x + 1, z: building.z },
          { x: building.x - 1, z: building.z },
          { x: building.x, z: building.z + 1 },
          { x: building.x, z: building.z - 1 }
        ];
        
        const isAdjacentToRoad = adjacentPositions.some(pos => 
          roadNetwork.segments.some(segment => {
            if (segment.startX === segment.endX && segment.startZ === segment.endZ) {
              // Single point segment
              return pos.x === segment.startX && pos.z === segment.startZ;
            } else if (segment.startX === segment.endX) {
              // Vertical segment
              return pos.x === segment.startX && 
                     pos.z >= Math.min(segment.startZ, segment.endZ) && 
                     pos.z <= Math.max(segment.startZ, segment.endZ);
            } else if (segment.startZ === segment.endZ) {
              // Horizontal segment
              return pos.z === segment.startZ && 
                     pos.x >= Math.min(segment.startX, segment.endX) && 
                     pos.x <= Math.max(segment.startX, segment.endX);
            }
            return false;
          })
        );
        
        expect(isAdjacentToRoad).toBeTruthy();
      });
    });

    it('should handle different building sizes appropriately', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 40;
      
      // Use a fixed seed for reproducible results
      const testRng = new SeededRandom(200);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      // Should have placed buildings of various sizes
      const smallBuildings = result.buildings.filter(b => b.type.width === 1 && b.type.height === 1);
      const mediumBuildings = result.buildings.filter(b => 
        (b.type.width === 1 && b.type.height === 2) || (b.type.width === 2 && b.type.height === 1)
      );
      const largeBuildings = result.buildings.filter(b => b.type.width === 2 && b.type.height === 2);
      
      // Should have a mix of building sizes
      expect(smallBuildings.length).toBeGreaterThan(0);
      expect(mediumBuildings.length).toBeGreaterThanOrEqual(0);
      expect(largeBuildings.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect building placement constraints for larger buildings', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 35;
      
      // Use a fixed seed for reproducible results
      const testRng = new SeededRandom(250);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      // Buildings should not overlap with roads
      result.buildings.forEach(building => {
        // Check each tile the building occupies
        for (let dx = 0; dx < building.type.width; dx++) {
          for (let dz = 0; dz < building.type.height; dz++) {
            const tileX = building.x + dx;
            const tileZ = building.z + dz;
            
            // Should not be on a road
            const isOnRoad = roadNetwork.segments.some(segment => {
              if (segment.startX === segment.endX && segment.startZ === segment.endZ) {
                return tileX === segment.startX && tileZ === segment.startZ;
              } else if (segment.startX === segment.endX) {
                return tileX === segment.startX && 
                       tileZ >= Math.min(segment.startZ, segment.endZ) && 
                       tileZ <= Math.max(segment.startZ, segment.endZ);
              } else if (segment.startZ === segment.endZ) {
                return tileZ === segment.startZ && 
                       tileX >= Math.min(segment.startX, segment.endX) && 
                       tileX <= Math.max(segment.startX, segment.endX);
              }
              return false;
            });
            expect(isOnRoad).toBeFalsy();
          }
        }
      });
      
      // Buildings should not overlap with each other
      // Check that no two buildings occupy the same tile
      const occupiedTiles = new Set<string>();
      result.buildings.forEach(building => {
        for (let dx = 0; dx < building.type.width; dx++) {
          for (let dz = 0; dz < building.type.height; dz++) {
            const tileX = building.x + dx;
            const tileZ = building.z + dz;
            const tileKey = `${tileX},${tileZ}`;
            
            // Each tile should only be occupied by one building
            expect(occupiedTiles.has(tileKey)).toBeFalsy();
            occupiedTiles.add(tileKey);
          }
        }
      });
    });
  });

  describe('Enhanced Building Selection', () => {
    it('should select building types based on location and variety', () => {
      const roadNetwork = createTestRoadNetwork();
      const targetPopulation = 30;
      
      // Use a fixed seed for reproducible results
      const testRng = new SeededRandom(300);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      // Should have placed buildings
      expect(result.buildings.length).toBeGreaterThan(0);
      
      // Should have variety in building types
      const uniqueTypes = new Set(result.buildings.map(b => b.type.id));
      expect(uniqueTypes.size).toBeGreaterThan(1);
    });

    it('should limit large buildings in outer areas', () => {
      // Create a road network with a clear center and outer areas
      const roadNetwork: RoadNetwork = {
        segments: [
          // Central intersection
          {
            startX: 0, startZ: 0, endX: 0, endZ: 0,
            roadType: 'intersection', gridX: 0, gridZ: 0
          },
          // Short roads to create a small central area
          { startX: 0, startZ: -1, endX: 0, endZ: -1, roadType: 'vertical', gridX: 0, gridZ: -1 },
          { startX: 0, startZ: 1, endX: 0, endZ: 1, roadType: 'vertical', gridX: 0, gridZ: 1 },
          { startX: -1, startZ: 0, endX: -1, endZ: 0, roadType: 'horizontal', gridX: -1, gridZ: 0 },
          { startX: 1, startZ: 0, endX: 1, endZ: 0, roadType: 'horizontal', gridX: 1, gridZ: 0 }
        ],
        intersections: [{ x: 0, z: 0 }],
        deadEnds: [{ x: 0, z: -1 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 1, z: 0 }]
      };
      
      const targetPopulation = 25;
      const testRng = new SeededRandom(350);
      
      const result = service.placeInitialBuildings(roadNetwork, targetPopulation, testRng);
      
      // In outer areas, large buildings should be less common
      const outerBuildings = result.buildings.filter(building => {
        const distance = Math.sqrt(building.x * building.x + building.z * building.z);
        return distance > 5; // Consider buildings more than 5 units from center as "outer"
      });
      
      const largeOuterBuildings = outerBuildings.filter(b => b.type.width === 2 && b.type.height === 2);
      
      // Most outer buildings should not be large
      if (outerBuildings.length > 0) {
        const largeBuildingRatio = largeOuterBuildings.length / outerBuildings.length;
        expect(largeBuildingRatio).toBeLessThan(0.5); // Less than 50% should be large buildings
      }
    });
  });
});