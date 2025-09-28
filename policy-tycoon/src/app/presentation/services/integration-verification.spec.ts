/**
 * Simple verification test for the ClassicCityGenerator integration
 * This test verifies that the integration between CityGeneratorService and ClassicCityGeneratorService is working correctly
 */

// Converted from Vitest to Jasmine (Karma)
import { Vector3 } from '@babylonjs/core';
import { CityGeneratorService } from './city-generator.service';
import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { CityTier } from '../../data/models/enums';
import { City } from '../../data/models/core-entities';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';

describe('ClassicCityGenerator Integration Verification', () => {
  let cityGenerator: CityGeneratorService;
  
  beforeEach(() => {
    // Create services
    const collisionDetection = new CollisionDetectionService();
    const cityConfiguration = new CityConfigurationService();
    const logger = new GenerationLoggerService();
    const terrainGeneration = new TerrainGenerationService(logger);
    const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
    const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
    const cityNameGenerator = new CityNameGeneratorService();
    const classicCityGenerator = new ClassicCityGeneratorService(
      roadNetworkBuilder,
      buildingPlacer,
      cityNameGenerator,
      cityConfiguration,
      logger,
      terrainGeneration
    );
    
    cityGenerator = new CityGeneratorService(classicCityGenerator, terrainGeneration, collisionDetection);
  });

  it('should generate a city layout with roads and buildings using ClassicCityGenerator', () => {
    // Arrange
    const city: City = {
      id: 'test-city-1',
      name: 'Test City',
      position: new Vector3(0, 0, 0),
      population: 250,
      tier: CityTier.SmallTown,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout).toBeDefined();
    expect(layout.cityCenter).toBeDefined();
    expect(layout.roads).toBeDefined();
    expect(layout.buildingPlots).toBeDefined();
    
    // Should have generated some roads and buildings
    expect(layout.roads.length).toBeGreaterThan(0);
    expect(layout.buildingPlots.length).toBeGreaterThan(0);
    
    // Verify road structure
    const firstRoad = layout.roads[0];
    expect(firstRoad.start).toBeDefined();
    expect(firstRoad.end).toBeDefined();
    expect(firstRoad.width).toBeDefined();
    expect(firstRoad.type).toBeDefined();
    expect(firstRoad.id).toBeDefined();
    expect(firstRoad.roadType).toBeDefined();
    expect(firstRoad.gridX).toBeDefined();
    expect(firstRoad.gridZ).toBeDefined();
    
    // Verify building structure
    const firstBuilding = layout.buildingPlots[0];
    expect(firstBuilding.position).toBeDefined();
    expect(firstBuilding.size).toBeDefined();
    expect(firstBuilding.tier).toBeDefined();
    
    console.log(`Generated ${layout.roads.length} roads and ${layout.buildingPlots.length} buildings`);
  });

  it('should generate different layouts for different city tiers', () => {
    // Arrange
    const citySmall: City = {
      id: 'test-city-small',
      name: 'Small City',
      position: new Vector3(0, 0, 0),
      population: 200,
      tier: CityTier.SmallTown,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    const cityLarge: City = {
      id: 'test-city-large',
      name: 'Large City',
      position: new Vector3(100, 0, 100),
      population: 600,
      tier: CityTier.Metropolis,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layoutSmall = cityGenerator.generateCityLayout(citySmall);
    const layoutLarge = cityGenerator.generateCityLayout(cityLarge);

    // Debug logging
    console.log(`Small city: ${layoutSmall.roads.length} roads, ${layoutSmall.buildingPlots.length} buildings`);
    console.log(`Large city: ${layoutLarge.roads.length} roads, ${layoutLarge.buildingPlots.length} buildings`);

    // Assert
    expect(layoutSmall).toBeDefined();
    expect(layoutLarge).toBeDefined();
    
    // Large city should have more or equal buildings than small city
    expect(layoutLarge.buildingPlots.length).toBeGreaterThanOrEqual(layoutSmall.buildingPlots.length);
    
    // Check if the large city has a reasonable number of buildings
    // The exact number may vary, but it should be at least 1.1x the small city (more relaxed requirement)
    const minExpectedBuildings = Math.ceil(layoutSmall.buildingPlots.length * 1.1);
    expect(layoutLarge.buildingPlots.length).toBeGreaterThanOrEqual(minExpectedBuildings);
    
    // Total elements (roads + buildings) should be greater or equal for large city
    const smallTotalElements = layoutSmall.roads.length + layoutSmall.buildingPlots.length;
    const largeTotalElements = layoutLarge.roads.length + layoutLarge.buildingPlots.length;
    expect(largeTotalElements).toBeGreaterThanOrEqual(smallTotalElements);
  });
});
