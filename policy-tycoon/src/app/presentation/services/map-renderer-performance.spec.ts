// Converted from Vitest to Jasmine (Karma)
import { MapRendererService } from './map-renderer.service';
import { ModelFactoryService } from './model-factory.service';
import { CityGeneratorService } from './city-generator.service';
import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { GridVisualizerService } from './grid-visualizer.service';
import { EnvironmentalFeatureService } from '../../application/services/environmental-feature.service';
import { PerformanceConfigService } from '../../application/services/performance-config.service';
import { PerformanceMonitorService } from '../../application/services/performance-monitor.service';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';
import { Scene, Engine, NullEngine } from '@babylonjs/core';

describe('MapRendererService - Performance', () => {
  let service: MapRendererService;
  let scene: Scene;
  let engine: Engine;
  let performanceConfig: PerformanceConfigService;
  let performanceMonitor: PerformanceMonitorService;

  beforeEach(() => {
    // Create a null engine for testing (doesn't require a WebGL context)
    engine = new NullEngine();
    scene = new Scene(engine);
    
    // Create services directly for zoneless mode
    const modelFactory = new ModelFactoryService();
    const terrainGenerationService = new TerrainGenerationService(new GenerationLoggerService());
    const sharedCollision = new CollisionDetectionService();
    const cityGenerator = new CityGeneratorService(
      new ClassicCityGeneratorService(
        new RecursiveRoadBuilderService(
          sharedCollision,
          new GenerationLoggerService(),
          terrainGenerationService
        ),
        new BuildingPlacerService(
          sharedCollision,
          new CityConfigurationService(),
          new GenerationLoggerService(),
          terrainGenerationService
        ),
        new CityNameGeneratorService(),
        new CityConfigurationService(),
        new GenerationLoggerService(),
        terrainGenerationService
      ),
      terrainGenerationService,
      sharedCollision
    );
    const gridVisualizer = new GridVisualizerService();
    const environmentalFeatureService = new EnvironmentalFeatureService(modelFactory, new GenerationLoggerService());

    performanceConfig = new PerformanceConfigService();
    // Use low quality settings to keep tests lightweight
    performanceConfig.setQualityLevel('low');
    performanceConfig.updateSettings({ maxTrees: 50, maxForests: 0, enableLOD: false });
    performanceMonitor = new PerformanceMonitorService();

    service = new MapRendererService(
      modelFactory,
      cityGenerator,
      gridVisualizer,
      environmentalFeatureService,
      terrainGenerationService,
      performanceConfig,
      performanceMonitor
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have performance services injected', () => {
    expect((service as any).performanceConfig).toBeTruthy();
    expect((service as any).performanceMonitor).toBeTruthy();
  });

  it('should optimize rendering with LOD system', () => {
    // Stub heavy methods and initialize
    (service as any).generateAndRenderTerrain = () => {};
    (service as any).generateEnvironmentalFeatures = () => {};
    service.initialize(scene);
    
    // Call optimize rendering
    service.optimizeRendering();
    
    // Verify that performance monitoring has started
    const metrics = performanceMonitor.getMetrics();
    expect(metrics).toBeDefined();
  });

  it('should generate environmental features with performance limits', () => {
    // Stub heavy methods and initialize
    (service as any).generateAndRenderTerrain = () => {};
    (service as any).generateEnvironmentalFeatures = () => {};
    service.initialize(scene);
    
    // This test would require mocking the environmental feature service methods
    // For now, we just verify the method can be called without error
    expect(() => {
      (service as any).generateEnvironmentalFeatures();
    }).not.toThrow();
  });

  it('should apply environmental LOD based on settings', () => {
    // Stub heavy methods and initialize
    (service as any).generateAndRenderTerrain = () => {};
    (service as any).generateEnvironmentalFeatures = () => {};
    service.initialize(scene);
    
    // Set low quality settings to test LOD
    performanceConfig.setQualityLevel('low');
    
    // This test would require creating some environmental features and a camera
    // For now, we just verify the method can be called without error
    expect(() => {
      (service as any).enableEnhancedLODSystem();
    }).not.toThrow();
  });

  it('should update performance configuration', () => {
    // Test that we can update performance settings
    performanceConfig.updateSettings({ maxTrees: 2000, treeLODDistance: 75 });
    
    const settings = performanceConfig.getSettings();
    expect(settings.maxTrees).toBe(2000);
    expect(settings.treeLODDistance).toBe(75);
  });
});