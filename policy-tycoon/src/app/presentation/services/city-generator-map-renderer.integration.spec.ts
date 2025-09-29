/**
 * Integration tests for CityGeneratorService and MapRendererService
 * Tests that the new ClassicCityGenerator integration works properly with MapRenderer
 */
import { Scene, Engine, NullEngine, Vector3 } from '@babylonjs/core';
import { CityGeneratorService } from './city-generator.service';
import { MapRendererService } from './map-renderer.service';
import { ModelFactoryService } from './model-factory.service';
import { GridVisualizerService } from './grid-visualizer.service';
import { City, CityTier } from '../../data/models';
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
import { SiteFinderService } from '../../application/services/site-finder.service';

describe('CityGeneratorService - MapRendererService Integration - Zoneless', () => {
  let cityGenerator: CityGeneratorService;
  let mapRenderer: MapRendererService;
  let modelFactory: ModelFactoryService;
  let gridVisualizer: GridVisualizerService;
  let scene: Scene;
  let engine: Engine;
  let cityNameGenerator: CityNameGeneratorService;

  beforeEach(() => {
    // Create services directly for zoneless mode
    const logger = new GenerationLoggerService();
    const terrainGeneration = new TerrainGenerationService(logger); // NEW: Create terrain service
    const collisionDetection = new CollisionDetectionService(terrainGeneration);
    const cityConfiguration = new CityConfigurationService();
    const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration); // Using recursive road builder
    const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration); // NEW: Provide terrain service
    cityNameGenerator = new CityNameGeneratorService();
    const siteFinder = new SiteFinderService(terrainGeneration, collisionDetection);
    const classicCityGenerator = new ClassicCityGeneratorService(
      roadNetworkBuilder,
      buildingPlacer,
      cityNameGenerator,
      cityConfiguration,
      logger,
      terrainGeneration, // NEW: Provide terrain service
      siteFinder
    );
    
    cityGenerator = new CityGeneratorService(classicCityGenerator, terrainGeneration, collisionDetection); // NEW: Provide all required services
    modelFactory = new ModelFactoryService();
    gridVisualizer = new GridVisualizerService();
    const environmentalFeatureService = new EnvironmentalFeatureService(modelFactory, new GenerationLoggerService());
    const terrainGenerationService = new TerrainGenerationService(new GenerationLoggerService());
    // Use low performance settings in tests to avoid heavy allocations
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
  });

  afterEach(() => {
    mapRenderer.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('City Layout Generation', () => {
    it('should generate a valid city layout that can be rendered', () => {
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
      
      // Debug logging
      console.log('Generated layout:', layout);
      console.log('Roads count:', layout.roads.length);
      console.log('Building plots count:', layout.buildingPlots.length);
      
      if (layout.roads.length > 0) {
        console.log('First road:', layout.roads[0]);
      }
      
      if (layout.buildingPlots.length > 0) {
        console.log('First building plot:', layout.buildingPlots[0]);
      }

      // Assert
      expect(layout).toBeDefined();
      expect(layout.cityCenter).toBeDefined();
      expect(layout.roads).toBeDefined();
      expect(layout.buildingPlots).toBeDefined();
      expect(layout.industrialZones).toBeDefined();
      expect(layout.buildingClusters).toBeDefined();
      
      // Should have generated some roads and buildings
      expect(layout.roads.length).toBeGreaterThan(0);
      expect(layout.buildingPlots.length).toBeGreaterThan(0);
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

      // Assert
      expect(layoutSmall).toBeDefined();
      expect(layoutLarge).toBeDefined();
      
      // Debug logging
      console.log(`Small city: ${layoutSmall.roads.length} roads, ${layoutSmall.buildingPlots.length} buildings`);
      console.log(`Large city: ${layoutLarge.roads.length} roads, ${layoutLarge.buildingPlots.length} buildings`);
      
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

  describe('Map Renderer Integration', () => {
    it('should successfully render a city generated by CityGeneratorService', () => {
      // Arrange
      const city: City = {
        id: 'test-city-render',
        name: 'Render Test City',
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

      // Initialize and stub heavy operations
      (mapRenderer as any).generateAndRenderTerrain = () => {};
      (mapRenderer as any).generateEnvironmentalFeatures = () => {};
      mapRenderer.initialize(scene);

      // Act & Assert
      expect(() => {
        mapRenderer.renderCity(city);
      }).not.toThrow();

      // Verify that the city was added to the map
      const cityLayout = (mapRenderer as any).cityLayouts.get(city.id);
      expect(cityLayout).toBeDefined();
      expect(cityLayout.roads.length).toBeGreaterThan(0);
      expect(cityLayout.buildingPlots.length).toBeGreaterThan(0);
    });

    it('should handle city rendering for all tier levels', () => {
      // Arrange
      const tiers = [
        CityTier.Hamlet,
        CityTier.SmallTown,
        CityTier.GrowingTown,
        CityTier.UrbanCentre,
        CityTier.ExpandingCity,
        CityTier.Metropolis,
        CityTier.AdvancedCity
      ];

      mapRenderer.initialize(scene);

      tiers.forEach(tier => {
        const city: City = {
          id: `test-city-${tier}`,
          name: `${tier} City`,
          position: new Vector3(0, 0, 0),
          population: 100 * (tier + 1), // Different population for each tier
          tier: tier,
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
      });
    });
  });

  describe('Boundary Checking', () => {
    it('should properly check if positions are within map bounds', () => {
      // Arrange
      const insidePosition = new Vector3(0, 0, 0); // Should be within bounds
      const outsidePosition = new Vector3(2000, 0, 2000); // Should be outside bounds

      // Act
      const insideResult = cityGenerator.isWithinMapBounds(insidePosition);
      const outsideResult = cityGenerator.isWithinMapBounds(outsidePosition);

      // Assert
      expect(insideResult).toBe(true);
      expect(outsideResult).toBe(false);
    });

    it('should clamp positions to map bounds', () => {
      // Arrange
      const outsidePosition = new Vector3(2000, 5, 2000); // Outside bounds
      const expectedClampedPosition = new Vector3(1000, 5, 1000); // Clamped to max bounds

      // Act
      const clampedPosition = cityGenerator.clampPositionToBounds(outsidePosition);

      // Assert
      expect(clampedPosition.x).toBe(expectedClampedPosition.x);
      expect(clampedPosition.y).toBe(expectedClampedPosition.y);
      expect(clampedPosition.z).toBe(expectedClampedPosition.z);
    });
  });
});