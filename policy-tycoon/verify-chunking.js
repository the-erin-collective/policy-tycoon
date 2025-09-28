// Simple verification script to test the chunking implementation
const { TerrainGenerationService } = require('./src/app/application/services/terrain-generation.service');

// Mock logger
const mockLogger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message) => console.log(`[ERROR] ${message}`)
};

// Create terrain generation service
const terrainService = new TerrainGenerationService(mockLogger);

// Test configuration
const config = {
  gridSize: 16, // Small grid for testing
  maxHeight: 10,
  steepness: 2,
  continuity: 5,
  waterLevel: 3,
  verticalScale: 0.5
};

console.log('Testing Terrain Chunking Implementation...');

try {
  // Test 1: Generate terrain chunks
  console.log('Test 1: Generating terrain chunks...');
  const rng = { nextFloat: () => Math.random() }; // Simple mock RNG
  const chunks = terrainService.generateTerrainChunks(config, rng);
  
  console.log(`Generated ${chunks.length} rows of chunks`);
  if (chunks.length > 0) {
    console.log(`First row has ${chunks[0].length} chunks`);
  }
  
  // Test 2: Check chunk structure
  console.log('Test 2: Checking chunk structure...');
  if (chunks.length > 0 && chunks[0].length > 0) {
    const firstChunk = chunks[0][0];
    console.log(`First chunk: x=${firstChunk.x}, z=${firstChunk.z}, isGenerated=${firstChunk.isGenerated}`);
    console.log(`First chunk grid size: ${firstChunk.grid.length}x${firstChunk.grid[0]?.length || 0}`);
  }
  
  console.log('Chunking implementation test completed successfully!');
  
} catch (error) {
  console.error('Error during chunking test:', error);
}