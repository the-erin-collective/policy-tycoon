/**
 * Zoneless Testing Utilities
 * 
 * Provides utilities for testing Angular services and components in zoneless mode
 * without relying on TestBed or Zone.js
 */

import { Scene, Engine, NullEngine } from '@babylonjs/core';
import { ClassicCityGeneratorService } from '../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../application/services/building-placer.service';
import { CityNameGeneratorService } from '../application/services/city-name-generator.service';
import { CityConfigurationService } from '../application/services/city-configuration.service';
import { CollisionDetectionService } from '../application/services/collision-detection.service';
import { GenerationLoggerService } from '../application/services/generation-logger.service';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';

/**
 * Factory for creating service instances in zoneless mode
 */
export class ZonelessServiceFactory {
  private static babylonEngine: Engine | null = null;
  private static babylonScene: Scene | null = null;

  /**
   * Create a complete city generator with all dependencies
   */
  static createCityGenerator(): {
    cityGenerator: ClassicCityGeneratorService;
    services: {
      collisionDetection: CollisionDetectionService;
      cityConfiguration: CityConfigurationService;
      roadNetworkBuilder: RecursiveRoadBuilderService;
      buildingPlacer: BuildingPlacerService;
      cityNameGenerator: CityNameGeneratorService;
      logger: GenerationLoggerService;
    };
    cleanup: () => void;
  } {
    // Create BabylonJS scene for name labels
    const engine = new NullEngine();
    const scene = new Scene(engine);
    
    // Create service dependencies
    const collisionDetection = new CollisionDetectionService();
    const cityConfiguration = new CityConfigurationService();
    const logger = new GenerationLoggerService();
    const terrainGeneration = new TerrainGenerationService(logger);
    const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
    const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
    const cityNameGenerator = new CityNameGeneratorService();
    
    // Initialize city name generator with scene
    cityNameGenerator.initialize(scene);
    
    // Create main city generator
    const cityGenerator = new ClassicCityGeneratorService(
      roadNetworkBuilder,
      buildingPlacer,
      cityNameGenerator,
      cityConfiguration,
      logger,
      terrainGeneration
    );

    return {
      cityGenerator,
      services: {
        collisionDetection,
        cityConfiguration,
        roadNetworkBuilder,
        buildingPlacer,
        cityNameGenerator,
        logger
      },
      cleanup: () => {
        scene.dispose();
        engine.dispose();
      }
    };
  }

  /**
   * Create individual services for focused testing
   */
  static createCollisionDetectionService(): CollisionDetectionService {
    return new CollisionDetectionService();
  }

  static createCityConfigurationService(): CityConfigurationService {
    return new CityConfigurationService();
  }

  static createRoadNetworkBuilderService(): RecursiveRoadBuilderService {
    const collisionDetection = new CollisionDetectionService();
    const logger = new GenerationLoggerService();
    const terrainGeneration = new TerrainGenerationService(logger);
    return new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
  }

  static createBuildingPlacerService(): BuildingPlacerService {
    const collisionDetection = new CollisionDetectionService();
    const cityConfiguration = new CityConfigurationService();
    const logger = new GenerationLoggerService();
    const terrainGeneration = new TerrainGenerationService(logger);
    return new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
  }

  static createCityNameGeneratorService(): {
    service: CityNameGeneratorService;
    cleanup: () => void;
  } {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const service = new CityNameGeneratorService();
    service.initialize(scene);

    return {
      service,
      cleanup: () => {
        scene.dispose();
        engine.dispose();
      }
    };
  }

  /**
   * Create a shared BabylonJS scene for multiple tests
   */
  static getSharedBabylonScene(): { scene: Scene; engine: Engine } {
    if (!this.babylonEngine || !this.babylonScene) {
      this.babylonEngine = new NullEngine();
      this.babylonScene = new Scene(this.babylonEngine);
    }
    return { scene: this.babylonScene, engine: this.babylonEngine };
  }

  /**
   * Clean up shared BabylonJS resources
   */
  static cleanupSharedBabylonScene(): void {
    if (this.babylonScene) {
      this.babylonScene.dispose();
      this.babylonScene = null;
    }
    if (this.babylonEngine) {
      this.babylonEngine.dispose();
      this.babylonEngine = null;
    }
  }
}

/**
 * Test utilities for signal-based testing
 */
export class SignalTestUtils {
  /**
   * Wait for signal to update (useful for async signal updates)
   */
  static async waitForSignalUpdate<T>(
    signalGetter: () => T,
    expectedValue: T,
    timeout = 1000
  ): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentValue = signalGetter();
      if (currentValue === expectedValue) {
        return currentValue;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    throw new Error(`Signal did not update to expected value within ${timeout}ms`);
  }

  /**
   * Collect signal values over time for testing reactive behavior
   */
  static collectSignalValues<T>(
    signalGetter: () => T,
    duration = 100
  ): Promise<T[]> {
    const values: T[] = [];
    const startTime = Date.now();
    
    return new Promise(resolve => {
      const interval = setInterval(() => {
        values.push(signalGetter());
        
        if (Date.now() - startTime >= duration) {
          clearInterval(interval);
          resolve(values);
        }
      }, 10);
    });
  }

  /**
   * Test that a signal updates correctly when an action is performed
   */
  static testSignalUpdate<T>(
    signalGetter: () => T,
    action: () => void,
    expectedValue: T
  ): void {
    action();
    const actualValue = signalGetter();
    if (actualValue !== expectedValue) {
      throw new Error(`Expected ${expectedValue}, but got ${actualValue}`);
    }
  }
}

/**
 * Mock data generators for testing
 */
export class MockDataGenerator {
  /**
   * Generate mock road state for testing
   */
  static createMockRoadState(): any {
    return {
      placedRoads: new Map(),
      currentSegments: [],
      intersections: [],
      deadEnds: [],
      corners: []
    };
  }

  /**
   * Generate mock city names for testing
   */
  static createMockCityNames(count: number): Set<string> {
    const names = new Set<string>();
    for (let i = 0; i < count; i++) {
      names.add(`TestCity${i + 1}`);
    }
    return names;
  }

  /**
   * Generate deterministic test seeds
   */
  static getTestSeeds(): number[] {
    return [12345, 54321, 98765, 11111, 22222];
  }
}

/**
 * Performance testing utilities for zoneless mode
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static measureExecutionTime<T>(fn: () => T): { result: T; timeMs: number } {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    return {
      result,
      timeMs: endTime - startTime
    };
  }

  /**
   * Test that zoneless operations are faster than equivalent Zone.js operations
   */
  static async benchmarkZonelessVsZoned<T>(
    zonelessFn: () => T,
    zonedFn: () => T,
    iterations = 100
  ): Promise<{
    zonelessAvgMs: number;
    zonedAvgMs: number;
    performanceGain: number;
  }> {
    // Warm up
    zonelessFn();
    zonedFn();

    // Benchmark zoneless
    let zonelessTotal = 0;
    for (let i = 0; i < iterations; i++) {
      const { timeMs } = this.measureExecutionTime(zonelessFn);
      zonelessTotal += timeMs;
    }

    // Benchmark zoned
    let zonedTotal = 0;
    for (let i = 0; i < iterations; i++) {
      const { timeMs } = this.measureExecutionTime(zonedFn);
      zonedTotal += timeMs;
    }

    const zonelessAvgMs = zonelessTotal / iterations;
    const zonedAvgMs = zonedTotal / iterations;
    const performanceGain = ((zonedAvgMs - zonelessAvgMs) / zonedAvgMs) * 100;

    return {
      zonelessAvgMs,
      zonedAvgMs,
      performanceGain
    };
  }
}