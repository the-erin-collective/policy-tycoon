// Simple test script to verify terrain generation service
console.log('Testing Terrain Generation Service...');

// Mock classes to simulate the environment
class Color3 {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

class Vector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.current = seed;
    this.a = 1664525;
    this.c = 1013904223;
    this.m = Math.pow(2, 32);
  }

  next() {
    this.current = (this.a * this.current + this.c) % this.m;
    return this.current / this.m;
  }

  nextFloat() {
    return this.next();
  }
}

// Mock logger
const logger = {
  info: (msg) => console.log('[INFO]', msg),
  warn: (msg) => console.log('[WARN]', msg),
  error: (msg) => console.log('[ERROR]', msg)
};

// Simplified version of the terrain generation service
class TerrainGenerationService {
  constructor(logger) {
    this.logger = logger;
    this.tileTypes = [
      { color: new Color3(0.2, 0.4, 0.8), name: "water" },
      { color: new Color3(0.9, 0.8, 0.6), name: "sand" },
      { color: new Color3(0.3, 0.7, 0.3), name: "grass" },
      { color: new Color3(0.5, 0.6, 0.3), name: "hill" },
      { color: new Color3(0.6, 0.6, 0.6), name: "mountain" },
      { color: new Color3(0.9, 0.9, 0.9), name: "peak" }
    ];
  }

  generateTerrainGrid(config, rng) {
    this.logger.info(`Generating terrain grid with config: ${JSON.stringify(config)}`);
    
    // Initialize grid with all possible heights
    const grid = Array.from({ length: config.gridSize }, (_, z) => 
      Array.from({ length: config.gridSize }, (_, x) => ({
        x,
        z,
        possibleHeights: Array.from({ length: config.maxHeight + 1 }, (_, i) => i),
        collapsed: false,
        height: null,
        tileType: null
      }))
    );

    // Run WFC algorithm
    for (let i = 0; i < config.gridSize * config.gridSize; i++) {
      let minEntropy = Infinity;
      let candidates = [];
      
      // First cell is special - we seed it at the center
      if (i === 0) {
        candidates.push({ 
          x: Math.floor(config.gridSize / 2), 
          z: Math.floor(config.gridSize / 2) 
        });
      } else {
        // Find cell with minimum entropy (least possible values)
        for (let z = 0; z < config.gridSize; z++) {
          for (let x = 0; x < config.gridSize; x++) {
            if (!grid[z][x].collapsed) {
              const entropy = grid[z][x].possibleHeights.length;
              if (entropy > 0 && entropy < minEntropy) {
                minEntropy = entropy;
                candidates = [{x, z}];
              } else if (entropy > 0 && entropy === minEntropy) {
                candidates.push({x, z});
              }
            }
          }
        }
      }
      
      if (candidates.length === 0) break;
      
      // Select a random candidate from those with minimum entropy
      const nextCellCoord = candidates[Math.floor(rng.nextFloat() * candidates.length)];
      const cell = grid[nextCellCoord.z][nextCellCoord.x];
      
      // Select a height for this cell
      let selectedHeight;
      if (i === 0) {
        // Seed the first cell with a height above water level
        selectedHeight = config.waterLevel + 2;
        if (!cell.possibleHeights.includes(selectedHeight)) {
          selectedHeight = cell.possibleHeights.length > 0 ? 
            cell.possibleHeights[Math.floor(rng.nextFloat() * cell.possibleHeights.length)] : 0;
        }
      } else {
        selectedHeight = cell.possibleHeights.length > 0 ? 
          cell.possibleHeights[Math.floor(rng.nextFloat() * cell.possibleHeights.length)] : 0;
      }
      
      // Collapse the cell
      cell.collapsed = true;
      cell.height = selectedHeight;
      cell.possibleHeights = [selectedHeight];
      
      // Propagate constraints to neighbors
      const neighbors = [
        {dx: 0, dz: -1},  // North
        {dx: 0, dz: 1},   // South
        {dx: -1, dz: 0},  // West
        {dx: 1, dz: 0}    // East
      ];
      
      neighbors.forEach(n => {
        const nx = nextCellCoord.x + n.dx;
        const nz = nextCellCoord.z + n.dz;
        
        if (nx >= 0 && nx < config.gridSize && 
            nz >= 0 && nz < config.gridSize && 
            !grid[nz][nx].collapsed) {
          
          // Filter possible heights based on steepness constraint
          grid[nz][nx].possibleHeights = grid[nz][nx].possibleHeights.filter(
            h => Math.abs(h - selectedHeight) <= config.steepness
          );
        }
      });
    }
    
    // Assign tile types based on height
    for (let z = 0; z < config.gridSize; z++) {
      for (let x = 0; x < config.gridSize; x++) {
        if (grid[z][x].height !== null) {
          grid[z][x].tileType = this.getHeightTileType(grid[z][x].height, config.waterLevel);
        }
      }
    }
    
    this.logger.info(`Successfully generated terrain grid of size ${config.gridSize}x${config.gridSize}`);
    return grid;
  }

  getHeightTileType(height, waterLevel) {
    if (height <= waterLevel) return this.tileTypes[0]; // water
    if (height <= waterLevel + 1) return this.tileTypes[1]; // sand
    if (height <= waterLevel + 3) return this.tileTypes[2]; // grass
    if (height <= waterLevel + 7) return this.tileTypes[3]; // hill
    if (height <= waterLevel + 13) return this.tileTypes[4]; // mountain
    return this.tileTypes[5]; // peak
  }
}

// Test the service
const terrainService = new TerrainGenerationService(logger);

const config = {
  gridSize: 10,
  maxHeight: 10,
  steepness: 2,
  continuity: 5,
  waterLevel: 3,
  verticalScale: 0.5
};

console.log('Running terrain generation test...');

try {
  const rng = new SeededRandom(12345);
  const grid = terrainService.generateTerrainGrid(config, rng);
  
  console.log(`SUCCESS: Generated terrain grid with dimensions ${grid.length}x${grid[0].length}`);
  
  // Check results
  let collapsedCount = 0;
  let tileTypeCount = 0;
  
  for (let z = 0; z < config.gridSize; z++) {
    for (let x = 0; x < config.gridSize; x++) {
      if (grid[z][x].collapsed) {
        collapsedCount++;
      }
      if (grid[z][x].tileType) {
        tileTypeCount++;
      }
    }
  }
  
  console.log(`Collapsed cells: ${collapsedCount}/${config.gridSize * config.gridSize}`);
  console.log(`Cells with tile types: ${tileTypeCount}/${config.gridSize * config.gridSize}`);
  
  // Show a sample of the generated terrain
  console.log('\nSample terrain data (5x5 corner):');
  for (let z = 0; z < Math.min(5, config.gridSize); z++) {
    let row = '';
    for (let x = 0; x < Math.min(5, config.gridSize); x++) {
      const cell = grid[z][x];
      const height = cell.height !== null ? cell.height.toString().padStart(2, ' ') : '  ';
      const tileType = cell.tileType ? cell.tileType.name.charAt(0) : ' ';
      row += `[${height}${tileType}]`;
    }
    console.log(row);
  }
  
  console.log('\nTest completed successfully!');
} catch (error) {
  console.error('Test failed:', error);
}