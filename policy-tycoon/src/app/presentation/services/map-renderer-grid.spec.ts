// Converted from Vitest to Jasmine (Karma)
import { Scene, Engine, NullEngine } from '@babylonjs/core';
import { MapRendererService } from './map-renderer.service';
import { ModelFactoryService } from './model-factory.service';
import { CityGeneratorService } from './city-generator.service';
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

describe('MapRendererService - Grid Integration - Zoneless', () => {
  let service: MapRendererService;
  let gridVisualizer: GridVisualizerService;
  let scene: Scene;
  let engine: Engine;

  beforeEach(() => {
    // Core dependencies
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

    // High-level services
    const terrainGenerationService = new TerrainGenerationService(logger);
    const cityGenerator = new CityGeneratorService(classicCityGenerator, terrainGenerationService, collisionDetection);
    const modelFactory = new ModelFactoryService();
    gridVisualizer = new GridVisualizerService();
    const environmentalFeatureService = new EnvironmentalFeatureService(modelFactory, logger);
    const perfConfig = new PerformanceConfigService();
    perfConfig.setQualityLevel('low');
    perfConfig.updateSettings({ maxTrees: 50, maxForests: 0, enableLOD: false });

    service = new MapRendererService(
      modelFactory,
      cityGenerator,
      gridVisualizer,
      environmentalFeatureService,
      terrainGenerationService,
      perfConfig
    );

    // Scene
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    service.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('Grid Integration', () => {
    beforeEach(() => {
      (service as any).generateAndRenderTerrain = () => {};
      (service as any).generateEnvironmentalFeatures = () => {};
      service.initialize(scene);
    });

    it('should initialize grid visualizer during map renderer initialization', () => {
      // Grid should be rendered and visible by default
      expect(service.isGridVisible()).toBe(true);
      
      const gridMeshAfterInit = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMeshAfterInit).toBeTruthy();
    });
  });

  describe('Grid Alignment', () => {
    beforeEach(() => {
      (service as any).generateAndRenderTerrain = () => {};
      (service as any).generateEnvironmentalFeatures = () => {};
      service.initialize(scene);
    });

    it('should align grid with OpenTTD tile boundaries', () => {
      // OpenTTD uses 4-unit tiles, grid should align with this
      service.updateGridPosition(18, 22); // Should snap to 16, 20 or 20, 24
      
      const gridOptions = gridVisualizer.getGridOptions();
      expect(gridOptions.gridSize).toBe(4);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      (service as any).generateAndRenderTerrain = () => {};
      (service as any).generateEnvironmentalFeatures = () => {};
      service.initialize(scene);
    });

    it('should not affect picking performance', () => {
      service.toggleGrid(true);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh?.isPickable).toBe(false);
    });

    it('should render grid between terrain and entities', () => {
      service.toggleGrid(true);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh?.renderingGroupId).toBe(1);
    });
  });
});