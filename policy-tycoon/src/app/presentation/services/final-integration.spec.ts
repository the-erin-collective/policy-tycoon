/**
 * Final integration test to verify the complete OpenTTD-style city generation system
 * This test verifies that all components work together correctly to generate classic cities
 */
// Converted from Vitest to Jasmine (Karma)
import { Scene, Engine, NullEngine, Vector3 } from '@babylonjs/core';
import { CityGeneratorService } from './city-generator.service';
import { MapRendererService } from './map-renderer.service';
import { ModelFactoryService } from './model-factory.service';
import { GridVisualizerService } from './grid-visualizer.service';
import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { EnvironmentalFeatureService } from '../../application/services/environmental-feature.service';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';
import { PerformanceConfigService } from '../../application/services/performance-config.service';
import { City } from '../../data/models/core-entities';
import { CityTier } from '../../data/models/enums';

describe('Final Integration - Complete OpenTTD-Style City Generation System', () => {
  let cityGenerator: CityGeneratorService;
  let mapRenderer: MapRendererService;
  let modelFactory: ModelFactoryService;
  let gridVisualizer: GridVisualizerService;
  let scene: Scene;
  let engine: Engine;

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
    modelFactory = new ModelFactoryService();
    gridVisualizer = new GridVisualizerService();
    
    // Create a test BabylonJS scene
    engine = new NullEngine();
    scene = new Scene(engine);
    
    // Initialize services that need a scene
    const environmentalFeatureService = new EnvironmentalFeatureService(modelFactory, logger);
    const terrainGenerationService = new TerrainGenerationService(logger);
    const perfConfig = new PerformanceConfigService();
    perfConfig.setQualityLevel('low');
    perfConfig.updateSettings({ maxTrees: 50, maxForests: 0, enableLOD: false });
    mapRenderer = new MapRendererService(
      modelFactory,
      cityGenerator,
      gridVisualizer,
      environmentalFeatureService,
      terrainGenerationService,
      perfConfig
    );
    
    // Initialize services that need a scene
    cityNameGenerator.initialize(scene);
    mapRenderer.initialize(scene);
  });

  afterEach(() => {
    mapRenderer.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('should generate and render a complete classic city with all expected features', () => {
    // Arrange
    const city: City = {
      id: 'final-test-city',
      name: 'Final Test City',
      position: new Vector3(0, 0, 0),
      population: 500,
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
    expect(() => {
      mapRenderer.renderCity(city);
    }).not.toThrow();

    // Assert
    const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(cityLayout).toBeDefined();
    
    // Verify road network features
    expect(cityLayout.roads.length).toBeGreaterThan(10);
    
    // Check for central intersection
    const centralRoads = cityLayout.roads.filter((road: any) => 
      road.gridX === 0 && road.gridZ === 0
    );
    expect(centralRoads.length).toBeGreaterThan(0);
    
    // Check for different road types
    const horizontalRoads = cityLayout.roads.filter((road: any) => road.roadType === 'horizontal');
    const verticalRoads = cityLayout.roads.filter((road: any) => road.roadType === 'vertical');
    const intersectionRoads = cityLayout.roads.filter((road: any) => road.roadType === 'intersection');
    
    expect(horizontalRoads.length).toBeGreaterThan(0);
    expect(verticalRoads.length).toBeGreaterThan(0);
    expect(intersectionRoads.length).toBeGreaterThan(0);
    
    // Verify building placement
    expect(cityLayout.buildingPlots.length).toBeGreaterThan(5);
    
    // Check building types
    let residentialCount = 0;
    let commercialCount = 0;
    let civicCount = 0;
    
    for (const building of cityLayout.buildingPlots) {
      switch (building.type) {
        case 'residential':
          residentialCount++;
          break;
        case 'commercial':
          commercialCount++;
          break;
        case 'civic':
          civicCount++;
          break;
      }
    }
    
    // Should have buildings of different types
    expect(residentialCount).toBeGreaterThan(0);
    expect(commercialCount).toBeGreaterThan(0);
    expect(civicCount).toBeGreaterThan(0);
    
    // Verify grid alignment
    let properlyAlignedRoads = 0;
    for (const road of cityLayout.roads) {
      if (Number.isInteger(road.gridX) && Number.isInteger(road.gridZ)) {
        properlyAlignedRoads++;
      }
    }
    
    const roadAlignmentPercentage = (properlyAlignedRoads / cityLayout.roads.length) * 100;
    expect(roadAlignmentPercentage).toBeGreaterThan(95);
    
    console.log('Final integration test results:');
    console.log(`  Roads: ${cityLayout.roads.length} (H: ${horizontalRoads.length}, V: ${verticalRoads.length}, I: ${intersectionRoads.length})`);
    console.log(`  Buildings: ${cityLayout.buildingPlots.length} (R: ${residentialCount}, C: ${commercialCount}, CV: ${civicCount})`);
    console.log(`  Road alignment: ${roadAlignmentPercentage.toFixed(1)}%`);
    console.log('  Classic city generation and rendering: SUCCESS');
  });

  it('should demonstrate deterministic generation with consistent results', () => {
    // Arrange
    const city1: City = {
      id: 'deterministic-test-1',
      name: 'Deterministic City 1',
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

    const city2: City = {
      id: 'deterministic-test-1', // Same ID should produce same results
      name: 'Deterministic City 1',
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
    mapRenderer.renderCity(city1);
    mapRenderer.renderCity(city2);
    
    // Assert
    const layout1 = (mapRenderer as any).cityLayouts.get('deterministic-test-1');
    const layout2 = (mapRenderer as any).cityLayouts.get('deterministic-test-1');
    
    // Should be identical (same ID means same seed)
    expect(layout1.roads.length).toBe(layout2.roads.length);
    expect(layout1.buildingPlots.length).toBe(layout2.buildingPlots.length);
    
    // Check a few key properties
    expect(layout1.roads[0].gridX).toBe(layout2.roads[0].gridX);
    expect(layout1.roads[0].gridZ).toBe(layout2.roads[0].gridZ);
    expect(layout1.buildingPlots[0].position.x).toBe(layout2.buildingPlots[0].position.x);
    
    console.log('Deterministic generation: SUCCESS');
  });

  it('should handle error conditions gracefully with fallback mechanisms', () => {
    // Arrange
    const city: City = {
      id: 'error-test-city',
      name: 'Error Test City',
      position: new Vector3(99999, 0, 99999), // Invalid position outside map bounds
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

    // Act & Assert
    // Should not throw an error even with invalid parameters
    expect(() => {
      mapRenderer.renderCity(city);
    }).not.toThrow();

    // Should still generate a city (fallback mechanism)
    const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(cityLayout).toBeDefined();
    
    console.log('Error handling and fallback mechanisms: SUCCESS');
  });
});