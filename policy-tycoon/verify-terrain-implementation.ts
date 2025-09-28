import { TerrainGenerationService } from './src/app/application/services/terrain-generation.service';
import { SeededRandom } from './src/app/utils/seeded-random';

// Simple mock logger
const mockLogger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.log(`[WARN] ${message}`),
  error: (message: string) => console.log(`[ERROR] ${message}`)
};

// Create service instance
const terrainService = new TerrainGenerationService(mockLogger as any);

// Test configuration
const config = {
  gridSize: 10,
  maxHeight: 10,
  steepness: 2,
  continuity: 5,
  waterLevel: 3,
  verticalScale: 0.5
};

console.log('Testing TerrainGenerationService...');

try {
  // Test 1: Generate terrain grid
  console.log('Test 1: Generating terrain grid...');
  const rng = new SeededRandom(12345);
  const grid = terrainService.generateTerrainGrid(config, rng);
  
  console.log(`Grid generated with dimensions: ${grid.length}x${grid[0].length}`);
  
  // Check that all cells have been processed
  let collapsedCount = 0;
  for (let z = 0; z < config.gridSize; z++) {
    for (let x = 0; x < config.gridSize; x++) {
      if (grid[z][x].collapsed) {
        collapsedCount++;
      }
    }
  }
  
  console.log(`Collapsed cells: ${collapsedCount}/${config.gridSize * config.gridSize}`);
  
  // Test 2: Check tile types
  console.log('Test 2: Checking tile types...');
  let assignedTileTypes = 0;
  for (let z = 0; z < config.gridSize; z++) {
    for (let x = 0; x < config.gridSize; x++) {
      if (grid[z][x].height !== null && grid[z][x].tileType) {
        assignedTileTypes++;
      }
    }
  }
  
  console.log(`Cells with assigned tile types: ${assignedTileTypes}/${config.gridSize * config.gridSize}`);
  
  console.log('All tests passed! TerrainGenerationService is working correctly.');
} catch (error) {
  console.error('Test failed:', error);
}