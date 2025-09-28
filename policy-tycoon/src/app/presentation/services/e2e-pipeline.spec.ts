/**
 * End-to-end tests for complete generation and rendering pipeline
 * These tests verify the entire pipeline from city generation to rendering
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
import { City, CityTier } from '../../data/models/core-entities';
import { PerformanceConfigService } from '../../application/services/performance-config.service';

describe('End-to-End City Generation and Rendering Pipeline', () => {
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
    const environmentalFeatureService = new EnvironmentalFeatureService(modelFactory, new GenerationLoggerService());
    const terrainGenerationService = new TerrainGenerationService(new GenerationLoggerService());
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
    
    // Create a test BabylonJS scene
    engine = new NullEngine();
    scene = new Scene(engine);
    
    // Initialize services that need a scene
    cityNameGenerator.initialize(scene);
    // Stub heavy operations to keep tests lightweight
    (mapRenderer as any).generateAndRenderTerrain = () => {};
    (mapRenderer as any).generateEnvironmentalFeatures = () => {};
    mapRenderer.initialize(scene);
  });

  afterEach(() => {
    mapRenderer.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('should successfully generate and render a complete small town', () => {
    // Arrange
    const city: City = {
      id: 'e2e-small',
      name: 'E2E Small Town',
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

    // Act & Assert
    expect(() => {
      mapRenderer.renderCity(city);
    }).not.toThrow();

    // Verify that the city was added to the map
    const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(cityLayout).toBeDefined();
    expect(cityLayout.roads.length).toBeGreaterThan(0);
    expect(cityLayout.buildingPlots.length).toBeGreaterThan(0);
    
    console.log(`Successfully generated and rendered small town with ${cityLayout.roads.length} roads and ${cityLayout.buildingPlots.length} buildings`);
  });

  it('should successfully generate and render a complete growing town', () => {
    // Arrange
    const city: City = {
      id: 'e2e-growing',
      name: 'E2E Growing Town',
      position: new Vector3(50, 0, 50),
      population: 400,
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

    // Act & Assert
    expect(() => {
      mapRenderer.renderCity(city);
    }).not.toThrow();

    // Verify that the city was added to the map
    const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(cityLayout).toBeDefined();
    expect(cityLayout.roads.length).toBeGreaterThan(0);
    expect(cityLayout.buildingPlots.length).toBeGreaterThan(0);
    
    // Growing towns should have more roads and buildings than small towns
    const smallTownLayout = (mapRenderer as any).cityLayouts.get('e2e-small');
    if (smallTownLayout) {
      expect(cityLayout.roads.length).toBeGreaterThanOrEqual(smallTownLayout.roads.length);
      expect(cityLayout.buildingPlots.length).toBeGreaterThanOrEqual(smallTownLayout.buildingPlots.length);
    }
    
    console.log(`Successfully generated and rendered growing town with ${cityLayout.roads.length} roads and ${cityLayout.buildingPlots.length} buildings`);
  });

  it('should successfully generate and render multiple cities in the same scene', () => {
    // Arrange
    const cities: City[] = [
      {
        id: 'multi-1',
        name: 'Multi City 1',
        position: new Vector3(-50, 0, -50),
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
      },
      {
        id: 'multi-2',
        name: 'Multi City 2',
        position: new Vector3(50, 0, 50),
        population: 350,
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
      }
    ];

    // Act
    cities.forEach(city => {
      expect(() => {
        mapRenderer.renderCity(city);
      }).not.toThrow();
    });

    // Assert
    // Verify that both cities were added to the map
    cities.forEach(city => {
      const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
      expect(cityLayout).toBeDefined();
      expect(cityLayout.roads.length).toBeGreaterThan(0);
      expect(cityLayout.buildingPlots.length).toBeGreaterThan(0);
      
      console.log(`Successfully generated and rendered ${city.name} with ${cityLayout.roads.length} roads and ${cityLayout.buildingPlots.length} buildings`);
    });
  });

  it('should handle city updates and regeneration correctly', () => {
    // Arrange
    const city: City = {
      id: 'update-test',
      name: 'Update Test City',
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

    // Initial render
    mapRenderer.renderCity(city);
    
    // Get initial layout
    const initialLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(initialLayout).toBeDefined();
    
    // Update city (e.g., population growth)
    const updatedCity: City = {
      ...city,
      population: 400,
      tier: CityTier.GrowingTown
    };

    // Act
    mapRenderer.renderCity(updatedCity);

    // Assert
    const updatedLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(updatedLayout).toBeDefined();
    
    // The updated layout should be different from the initial layout
    expect(updatedLayout.roads.length).toBeGreaterThanOrEqual(initialLayout.roads.length);
    expect(updatedLayout.buildingPlots.length).toBeGreaterThanOrEqual(initialLayout.buildingPlots.length);
    
    console.log(`City updated from ${initialLayout.buildingPlots.length} to ${updatedLayout.buildingPlots.length} buildings`);
  });

  it('should properly clean up resources when cities are removed', () => {
    // Arrange
    const city: City = {
      id: 'cleanup-test',
      name: 'Cleanup Test City',
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

    // Render the city
    mapRenderer.renderCity(city);
    
    // Verify it exists
    let cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(cityLayout).toBeDefined();

    // Act
    mapRenderer.removeCity(city.id);

    // Assert
    cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
    expect(cityLayout).toBeUndefined();
    
    console.log('City successfully removed and resources cleaned up');
  });

  it('should maintain consistent rendering performance across multiple operations', () => {
    // Arrange
    const cities: City[] = [];
    for (let i = 0; i < 5; i++) {
      cities.push({
        id: `perf-${i}`,
        name: `Performance City ${i}`,
        position: new Vector3(i * 20, 0, i * 20),
        population: 200 + (i * 50),
        tier: i < 3 ? CityTier.SmallTown : CityTier.GrowingTown,
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
      });
    }

    const renderTimes: number[] = [];
    
    // Act
    cities.forEach(city => {
      const startTime = performance.now();
      mapRenderer.renderCity(city);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      renderTimes.push(renderTime);
      
      console.log(`Rendered ${city.name} in ${renderTime.toFixed(2)}ms`);
    });

    // Calculate average render time
    const averageTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    
    // Calculate standard deviation
    const variance = renderTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / renderTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Assert
    expect(averageTime).toBeLessThan(500); // Average render time should be less than 500ms
    expect(standardDeviation).toBeLessThan(200); // Standard deviation should be reasonable
    
    console.log(`Average render time: ${averageTime.toFixed(2)}ms ± ${standardDeviation.toFixed(2)}ms`);
    
    // Verify all cities were rendered
    cities.forEach(city => {
      const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
      expect(cityLayout).toBeDefined();
      expect(cityLayout.roads.length).toBeGreaterThan(0);
      expect(cityLayout.buildingPlots.length).toBeGreaterThan(0);
    });
  });
});