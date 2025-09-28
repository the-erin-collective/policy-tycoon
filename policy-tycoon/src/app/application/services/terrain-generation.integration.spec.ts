// Converted from Vitest to Jasmine (Karma)

import { TerrainGenerationService } from './terrain-generation.service';
import { GenerationLoggerService } from './generation-logger.service';
import { SeededRandom } from '../../utils/seeded-random';
import { Engine, Scene, Mesh } from '@babylonjs/core';

describe('TerrainGenerationService Integration', () => {
  let service: TerrainGenerationService;
  let loggerSpy: { info: any; warn: any; error: any };
  let engine: Engine;
  let scene: Scene;

  beforeEach(() => {
    loggerSpy = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    // Set up a minimal BabylonJS environment for testing
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    document.body.appendChild(canvas);

    engine = new Engine(canvas, true);
    scene = new Scene(engine);

    service = new TerrainGenerationService(loggerSpy as any);
  });

  afterEach(() => {
    // Clean up
    const canvases = document.getElementsByTagName('canvas');
    for (let i = 0; i < canvases.length; i++) {
      document.body.removeChild(canvases[i]);
    }
  });

  it('should generate and render terrain without errors', () => {
    const config = {
      gridSize: 10, // Small grid for testing
      maxHeight: 10,
      steepness: 2,
      continuity: 5,
      waterLevel: 3,
      verticalScale: 0.5
    };

    const rng = new SeededRandom(12345);
    
    // Generate terrain grid
    const grid = service.generateTerrainGrid(config, rng);
    expect(grid).toBeTruthy();
    expect(grid.length).toBe(config.gridSize);

    // Render terrain
    const terrain = service.renderTerrain(grid, config, scene);
    expect(terrain).toBeTruthy();
    expect(terrain instanceof Mesh).toBe(true);
    
    // Render water
    const water = service.renderWater(config, scene);
    expect(water).toBeTruthy();
    expect(water instanceof Mesh).toBe(true);
  });

  it('should generate terrain with varying heights', () => {
    const config = {
      gridSize: 20,
      maxHeight: 15,
      steepness: 3,
      continuity: 5,
      waterLevel: 2,
      verticalScale: 0.5
    };

    const rng = new SeededRandom(54321);
    const grid = service.generateTerrainGrid(config, rng);

    // Check that we have a range of heights
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    
    for (let z = 0; z < config.gridSize; z++) {
      for (let x = 0; x < config.gridSize; x++) {
        if (grid[z][x].height !== null) {
          const height = grid[z][x].height!;
          if (height < minHeight) minHeight = height;
          if (height > maxHeight) maxHeight = height;
        }
      }
    }
    
    // We should have some variation in heights
    expect(maxHeight).toBeGreaterThan(minHeight);
    expect(minHeight).toBeGreaterThanOrEqual(0);
    expect(maxHeight).toBeLessThanOrEqual(config.maxHeight);
  });
});