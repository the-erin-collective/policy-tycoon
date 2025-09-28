// Converted from Vitest to Jasmine (Karma)
import { TerrainGenerationService } from './terrain-generation.service';
import { SeededRandom } from '../../utils/seeded-random';

// Simple test to verify the terrain generation service is working
describe('TerrainGenerationService - Simple Test', () => {
  let service: TerrainGenerationService;

  // Mock logger
  const mockLogger = {
    info: jasmine.createSpy('info'),
    warn: jasmine.createSpy('warn'),
    error: jasmine.createSpy('error')
  };

  beforeEach(() => {
    service = new TerrainGenerationService(mockLogger as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate a terrain grid', () => {
    const config = {
      gridSize: 5,
      maxHeight: 10,
      steepness: 2,
      continuity: 5,
      waterLevel: 2,
      verticalScale: 0.5
    };

    const rng = new SeededRandom(12345);
    const grid = service.generateTerrainGrid(config, rng);

    expect(grid).toBeTruthy();
    expect(grid.length).toBe(config.gridSize);
    expect(grid[0].length).toBe(config.gridSize);
  });
});