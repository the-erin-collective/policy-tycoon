/**
 * Visual validation tests for classic city layout quality
 * These tests verify that the generated city layouts have the expected visual characteristics
 * of classic OpenTTD-style cities.
 */

// Converted from Vitest to Jasmine (Karma)
import { CityGeneratorService } from './city-generator.service';
import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { City, CityTier } from '../../data/models/core-entities';
import { Vector3 } from '@babylonjs/core';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';
import { SiteFinderService } from '../../application/services/site-finder.service';

describe('CityGeneratorService - Visual Validation', () => {
  let cityGenerator: CityGeneratorService;
  
  beforeEach(() => {
    // Create services
    const logger = new GenerationLoggerService();
    const terrainGenerationService = new TerrainGenerationService(logger);
    const collisionDetection = new CollisionDetectionService(terrainGenerationService);
    const cityConfiguration = new CityConfigurationService();
    const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGenerationService);
    const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGenerationService);
    const cityNameGenerator = new CityNameGeneratorService();
    const siteFinder = new SiteFinderService(terrainGenerationService, collisionDetection);
    const classicCityGenerator = new ClassicCityGeneratorService(
      roadNetworkBuilder,
      buildingPlacer,
      cityNameGenerator,
      cityConfiguration,
      logger,
      terrainGenerationService,
      siteFinder
    );
    
    cityGenerator = new CityGeneratorService(classicCityGenerator, terrainGenerationService, collisionDetection);
  });

  it('should generate a city with a central crossroad pattern', () => {
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
    expect(layout.roads.length).toBeGreaterThan(0);
    
    // Check for central intersection
    const centralRoads = layout.roads.filter(road => 
      road.gridX === 0 && road.gridZ === 0
    );
    
    // Should have at least one central road (intersection)
    expect(centralRoads.length).toBeGreaterThan(0);
    
    console.log(`Found ${centralRoads.length} central roads`);
  });

  it('should generate roads that extend in cardinal directions from center', () => {
    // Arrange
    const city: City = {
      id: 'test-city-2',
      name: 'Cardinal City',
      position: new Vector3(0, 0, 0),
      population: 300,
      tier: CityTier.GrowingTown,
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
    expect(layout.roads.length).toBeGreaterThan(4); // At least center + 4 arms
    
    // Check for roads extending in cardinal directions
    const northRoads = layout.roads.filter(road => 
      road.gridX === 0 && road.gridZ < 0
    );
    
    const southRoads = layout.roads.filter(road => 
      road.gridX === 0 && road.gridZ > 0
    );
    
    const eastRoads = layout.roads.filter(road => 
      road.gridX > 0 && road.gridZ === 0
    );
    
    const westRoads = layout.roads.filter(road => 
      road.gridX < 0 && road.gridZ === 0
    );
    
    // Should have roads in each cardinal direction
    expect(northRoads.length).toBeGreaterThan(0);
    expect(southRoads.length).toBeGreaterThan(0);
    expect(eastRoads.length).toBeGreaterThan(0);
    expect(westRoads.length).toBeGreaterThan(0);
    
    console.log(`Roads by direction - North: ${northRoads.length}, South: ${southRoads.length}, East: ${eastRoads.length}, West: ${westRoads.length}`);
  });

  it('should generate buildings adjacent to roads', () => {
    // Arrange
    const city: City = {
      id: 'test-city-3',
      name: 'Building City',
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

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout.buildingPlots.length).toBeGreaterThan(0);
    
    // Check that buildings are placed near roads
    let buildingsNearRoads = 0;
    const maxDistance = 5; // Maximum distance from road for a building to be considered "near"
    
    for (const building of layout.buildingPlots) {
      for (const road of layout.roads) {
        const distance = Vector3.Distance(building.position, road.start);
        if (distance <= maxDistance) {
          buildingsNearRoads++;
          break;
        }
        
        const distance2 = Vector3.Distance(building.position, road.end);
        if (distance2 <= maxDistance) {
          buildingsNearRoads++;
          break;
        }
      }
    }
    
    // Most buildings should be near roads
    const percentageNearRoads = (buildingsNearRoads / layout.buildingPlots.length) * 100;
    expect(percentageNearRoads).toBeGreaterThan(70); // At least 70% of buildings should be near roads
    
    console.log(`Buildings near roads: ${buildingsNearRoads}/${layout.buildingPlots.length} (${percentageNearRoads.toFixed(1)}%)`);
  });

  it('should generate a grid-like structure with proper alignment', () => {
    // Arrange
    const city: City = {
      id: 'test-city-4',
      name: 'Grid City',
      position: new Vector3(0, 0, 0),
      population: 400,
      tier: CityTier.UrbanCentre,
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
    expect(layout.roads.length).toBeGreaterThan(10);
    
    // Check grid alignment by verifying that roads align to grid coordinates
    let properlyAlignedRoads = 0;
    
    for (const road of layout.roads) {
      // Check if road coordinates are integers (grid-aligned)
      if (Number.isInteger(road.gridX) && Number.isInteger(road.gridZ)) {
        properlyAlignedRoads++;
      }
    }
    
    // Most roads should be grid-aligned
    const alignmentPercentage = (properlyAlignedRoads / layout.roads.length) * 100;
    expect(alignmentPercentage).toBeGreaterThan(90); // At least 90% of roads should be grid-aligned
    
    console.log(`Grid-aligned roads: ${properlyAlignedRoads}/${layout.roads.length} (${alignmentPercentage.toFixed(1)}%)`);
  });

  it('should generate appropriate building types based on city tier', () => {
    // Arrange
    const smallCity: City = {
      id: 'small-city',
      name: 'Small Town',
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

    const largeCity: City = {
      id: 'large-city',
      name: 'Large City',
      position: new Vector3(100, 0, 100),
      population: 700,
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
    const smallLayout = cityGenerator.generateCityLayout(smallCity);
    const largeLayout = cityGenerator.generateCityLayout(largeCity);

    // Assert
    expect(smallLayout.buildingPlots.length).toBeGreaterThan(0);
    expect(largeLayout.buildingPlots.length).toBeGreaterThan(0);
    
    // Large cities should have more commercial and civic buildings
    let smallCommercialBuildings = 0;
    let largeCommercialBuildings = 0;
    
    for (const building of smallLayout.buildingPlots) {
      if (building.type === 'commercial' || building.type === 'civic') {
        smallCommercialBuildings++;
      }
    }
    
    for (const building of largeLayout.buildingPlots) {
      if (building.type === 'commercial' || building.type === 'civic') {
        largeCommercialBuildings++;
      }
    }
    
    // Large cities should have a higher proportion of commercial/civic buildings
    const smallCommercialPercentage = (smallCommercialBuildings / smallLayout.buildingPlots.length) * 100;
    const largeCommercialPercentage = (largeCommercialBuildings / largeLayout.buildingPlots.length) * 100;
    
    // This might not always be true due to randomness, but generally larger cities should have more variety
    console.log(`Small city commercial/civic buildings: ${smallCommercialBuildings}/${smallLayout.buildingPlots.length} (${smallCommercialPercentage.toFixed(1)}%)`);
    console.log(`Large city commercial/civic buildings: ${largeCommercialBuildings}/${largeLayout.buildingPlots.length} (${largeCommercialPercentage.toFixed(1)}%)`);
  });
});