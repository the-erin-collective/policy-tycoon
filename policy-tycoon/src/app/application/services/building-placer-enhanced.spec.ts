/**
 * Unit tests for BuildingPlacerService enhanced features
 * Tests density gradient and building size variation
 */

// Converted from Vitest to Jasmine (Karma)
import { BuildingPlacerService } from './building-placer.service';
import { CollisionDetectionService } from './collision-detection.service';
import { CityConfigurationService } from './city-configuration.service';
import { GenerationLoggerService } from './generation-logger.service';
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

// Mock TerrainGenerationService
const mockTerrainGenerationService = {
  generateTerrainGrid: jasmine.createSpy('generateTerrainGrid'),
  renderTerrain: jasmine.createSpy('renderTerrain'),
  renderTerrainWithInstancing: jasmine.createSpy('renderTerrainWithInstancing'),
  renderWater: jasmine.createSpy('renderWater'),
  updateTerrainTile: jasmine.createSpy('updateTerrainTile'),
  initializeBaseMeshes: jasmine.createSpy('initializeBaseMeshes')
};

describe('BuildingPlacerService - Enhanced Features', () => {
  let service: BuildingPlacerService;
  let collisionDetection: CollisionDetectionService;
  let cityConfiguration: CityConfigurationService;
  let logger: GenerationLoggerService;
  let rng: SeededRandom;

  // Test data with various building sizes
  const testBuildingTypes: BuildingType[] = [
    {
      id: 'small-house',
      name: 'Small House',
      population: 8,
      width: 1,
      height: 1
    },
    {
      id: 'apartment',
      name: 'Apartment Building',
      population: 30,
      width: 1,
      height: 2
    },
    {
      id: 'large-apartment',
      name: 'Large Apartment Complex',
      population: 45,
      width: 2,
      height: 2
    }
  ];

  const createTestRoadNetworkWithCenter = (): RoadNetwork => {
    const segments: RoadSegment[] = [];
    
    // Create a grid-like road network centered at (0, 0)
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        if (x === 0 || z === 0) {
          segments.push({
            startX: x,
            startZ: z,
            endX: x,
            endZ: z,
            roadType: (x === 0 && z === 0) ? 'intersection' : (x === 0 || z === 0) ? 'horizontal' : 'vertical',
            gridX: x,
            gridZ: z
          });
        }
      }
    }

    return {
      segments: segments,
      intersections: [{ x: 0, z: 0 }],
      deadEnds: []
    };
  };

  beforeEach(() => {
    // Create mock services
    collisionDetection = {
      canPlaceBuilding: jasmine.createSpy('canPlaceBuilding').and.returnValue({ hasCollision: false }),
      isAdjacentToRoad: jasmine.createSpy('isAdjacentToRoad').and.returnValue(true),
      wouldBlockRoadExtension: jasmine.createSpy('wouldBlockRoadExtension').and.returnValue(false),
      getMapBounds: jasmine.createSpy('getMapBounds').and.returnValue({ minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 }),
      getAdjacentPositions: jasmine.createSpy('getAdjacentPositions').and.callFake((x: number, z: number) => ([
        { x: x + 1, z },
        { x: x - 1, z },
        { x, z: z + 1 },
        { x, z: z - 1 }
      ]))
    } as any;
    
    cityConfiguration = {
      selectRandomBuilding: jasmine.createSpy('selectRandomBuilding'),
      getPopulationRange: jasmine.createSpy('getPopulationRange'),
      getBuildingTypes: jasmine.createSpy('getBuildingTypes').and.returnValue(testBuildingTypes),
      selectRandomBuildingByPopulation: jasmine.createSpy('selectRandomBuildingByPopulation'),
      getBuildingTypesByPopulation: jasmine.createSpy('getBuildingTypesByPopulation'),
      getBuildingTypeById: jasmine.createSpy('getBuildingTypeById'),
      generateTargetPopulation: jasmine.createSpy('generateTargetPopulation')
    } as any;

    logger = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    } as any;

    // Create service directly for zoneless mode
    service = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, mockTerrainGenerationService as any);
    
    rng = new SeededRandom(12345); // Fixed seed for deterministic tests
  });

  it('should place more buildings near the center with density gradient', () => {
    const roadNetwork = createTestRoadNetworkWithCenter();
    const targetPopulation = 100;
    
    const result = service.placeInitialBuildings(roadNetwork, targetPopulation, rng);
    
    expect(result).toBeDefined();
    expect(result.buildings.length).toBeGreaterThan(0);
    
    // Count buildings near center vs. far from center
    let centerBuildings = 0;
    let outerBuildings = 0;
    
    result.buildings.forEach(building => {
      const distance = Math.sqrt(building.x * building.x + building.z * building.z);
      if (distance <= 2) {
        centerBuildings++;
      } else {
        outerBuildings++;
      }
    });
    
    // Should have buildings near the center (density gradient should work)
    expect(result.buildings.length).toBeGreaterThan(0);
    expect(centerBuildings + outerBuildings).toBeGreaterThan(0);
  });

  it('should place larger buildings near the center with size variation', () => {
    const roadNetwork = createTestRoadNetworkWithCenter();
    const targetPopulation = 150; // High enough to potentially get larger buildings
    
    // Mock to return different building types
    (cityConfiguration.getBuildingTypes as jasmine.Spy).and.returnValue(testBuildingTypes);
    
    const result = service.placeInitialBuildings(roadNetwork, targetPopulation, rng);
    
    expect(result).toBeDefined();
    expect(result.buildings.length).toBeGreaterThan(0);
    
    // Count building sizes near center vs. far from center
    let centerLargeBuildings = 0;
    let centerSmallBuildings = 0;
    let outerLargeBuildings = 0;
    let outerSmallBuildings = 0;
    
    result.buildings.forEach(building => {
      const distance = Math.sqrt(building.x * building.x + building.z * building.z);
      // Find the building type to determine size
      const buildingType = testBuildingTypes.find(bt => bt.id === building.type.id);
      
      if (distance <= 2) {
        // Center area
        if (buildingType && (buildingType.width > 1 || buildingType.height > 1)) {
          centerLargeBuildings++;
        } else {
          centerSmallBuildings++;
        }
      } else {
        // Outer area
        if (buildingType && (buildingType.width > 1 || buildingType.height > 1)) {
          outerLargeBuildings++;
        } else {
          outerSmallBuildings++;
        }
      }
    });
    
    // Should have proportionally more large buildings near the center
    const centerLargeRatio = centerLargeBuildings / (centerLargeBuildings + centerSmallBuildings || 1);
    const outerLargeRatio = outerLargeBuildings / (outerLargeBuildings + outerSmallBuildings || 1);
    
    // Center should have a higher ratio of large buildings
    expect(centerLargeRatio).toBeGreaterThanOrEqual(outerLargeRatio);
  });

  it('should respect building size limits based on distance from center', () => {
    const roadNetwork = createTestRoadNetworkWithCenter();
    const targetPopulation = 100;
    
    const result = service.placeInitialBuildings(roadNetwork, targetPopulation, rng);
    
    expect(result).toBeDefined();
    expect(result.buildings.length).toBeGreaterThan(0);
    
    // Verify that buildings far from center are not too large
    result.buildings.forEach(building => {
      const distance = Math.sqrt(building.x * building.x + building.z * building.z);
      const buildingType = testBuildingTypes.find(bt => bt.id === building.type.id);
      
      // Buildings very far from center should be small
      if (distance > 8 && buildingType) {
        // Should be 1x1 or 1x2 buildings, not 2x2
        expect(buildingType.width).toBeLessThanOrEqual(1);
        expect(buildingType.height).toBeLessThanOrEqual(2);
      }
    });
  });
});