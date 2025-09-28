// Converted from Vitest to Jasmine (Karma)
import { TerrainGenerationService } from './terrain-generation.service';
import { GenerationLoggerService } from './generation-logger.service';
import { SeededRandom } from '../../utils/seeded-random';

describe('TerrainGenerationService', () => {
  let service: TerrainGenerationService;
  let loggerSpy: { info: any; warn: any; error: any };

  beforeEach(() => {
    loggerSpy = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    service = new TerrainGenerationService(loggerSpy as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate a terrain grid with correct dimensions', () => {
    const config = {
      gridSize: 10,
      maxHeight: 20,
      steepness: 2,
      continuity: 5,
      waterLevel: 3,
      verticalScale: 0.5
    };

    const rng = new SeededRandom(12345);
    const grid = service.generateTerrainGrid(config, rng);

    expect(grid.length).toBe(config.gridSize);
    expect(grid[0].length).toBe(config.gridSize);
    
    // Check that all cells have been processed
    let collapsedCount = 0;
    for (let z = 0; z < config.gridSize; z++) {
      for (let x = 0; x < config.gridSize; x++) {
        if (grid[z][x].collapsed) {
          collapsedCount++;
        }
      }
    }
    
    // All cells should be collapsed
    expect(collapsedCount).toBe(config.gridSize * config.gridSize);
  });

  it('should assign tile types based on height', () => {
    const config = {
      gridSize: 5,
      maxHeight: 20,
      steepness: 2,
      continuity: 5,
      waterLevel: 3,
      verticalScale: 0.5
    };

    const rng = new SeededRandom(12345);
    const grid = service.generateTerrainGrid(config, rng);

    // Check that all cells have a tile type assigned
    for (let z = 0; z < config.gridSize; z++) {
      for (let x = 0; x < config.gridSize; x++) {
        if (grid[z][x].height !== null) {
          expect(grid[z][x].tileType).toBeTruthy();
        }
      }
    }
  });
});