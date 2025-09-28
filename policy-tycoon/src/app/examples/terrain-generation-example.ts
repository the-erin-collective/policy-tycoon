import { Scene, Engine, NullEngine, Vector3, Color3, Mesh, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { SeededRandom } from '../utils/seeded-random';

/**
 * Example demonstrating how to use the TerrainGenerationService
 * This shows the Wave Function Collapse algorithm for terrain generation
 */
export class TerrainGenerationExample {
  private terrainService: TerrainGenerationService;
  private scene: Scene;
  private engine: Engine;

  constructor() {
    // Create a null engine for testing (no WebGL context needed)
    this.engine = new NullEngine();
    this.scene = new Scene(this.engine);
    
    // Create a simple mock logger
    const mockLogger = {
      info: (message: string) => console.log(`[INFO] ${message}`),
      warn: (message: string) => console.log(`[WARN] ${message}`),
      error: (message: string) => console.log(`[ERROR] ${message}`)
    };
    
    this.terrainService = new TerrainGenerationService(mockLogger as any);
  }

  /**
   * Example: Generate and render terrain using Wave Function Collapse
   */
  runTerrainGenerationExample(): void {
    console.log('=== Terrain Generation Example ===');

    // Configure terrain generation parameters
    const terrainConfig = {
      gridSize: 20,      // 20x20 grid
      maxHeight: 15,     // Maximum height of 15 units
      steepness: 2,      // Maximum height difference between adjacent cells
      continuity: 5,     // Continuity parameter for WFC
      waterLevel: 3,     // Water level at height 3
      verticalScale: 0.5 // Scale factor for vertical heights
    };

    // Create seeded random generator for deterministic results
    const rng = new SeededRandom(12345);
    
    console.log(`Generating terrain with config: ${JSON.stringify(terrainConfig)}`);
    
    // Generate terrain grid using WFC algorithm
    console.time('Terrain Generation');
    const terrainGrid = this.terrainService.generateTerrainGrid(terrainConfig, rng);
    console.timeEnd('Terrain Generation');
    
    // Count statistics
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    let totalCells = 0;
    let validCells = 0;
    
    for (let z = 0; z < terrainConfig.gridSize; z++) {
      for (let x = 0; x < terrainConfig.gridSize; x++) {
        totalCells++;
        const cell = terrainGrid[z][x];
        if (cell.height !== null) {
          validCells++;
          const height = cell.height;
          if (height < minHeight) minHeight = height;
          if (height > maxHeight) maxHeight = height;
        }
      }
    }
    
    console.log(`Terrain Statistics:`);
    console.log(`  - Grid Size: ${terrainConfig.gridSize}x${terrainConfig.gridSize}`);
    console.log(`  - Valid Cells: ${validCells}/${totalCells}`);
    console.log(`  - Height Range: ${minHeight} to ${maxHeight}`);
    console.log(`  - Water Level: ${terrainConfig.waterLevel}`);
    
    // Show a sample of the generated terrain
    console.log(`\nSample Terrain Data (5x5 corner):`);
    for (let z = 0; z < Math.min(5, terrainConfig.gridSize); z++) {
      let row = '';
      for (let x = 0; x < Math.min(5, terrainConfig.gridSize); x++) {
        const cell = terrainGrid[z][x];
        const height = cell.height !== null ? cell.height.toString().padStart(2, ' ') : '  ';
        row += `[${height}]`;
      }
      console.log(row);
    }
    
    // Demonstrate rendering (this would normally be done in a real scene)
    console.log('\n=== Rendering Example ===');
    console.time('Terrain Rendering');
    
    try {
      // In a real implementation, we would render the terrain here
      // For this example, we'll just show what would be rendered
      console.log('Terrain would be rendered with the following features:');
      console.log('  - Blocky terrain with varying heights');
      console.log('  - Sloped transitions between different height levels');
      console.log('  - Vertical walls where appropriate');
      console.log('  - Water plane at the specified water level');
      console.log('  - Color-coded terrain based on height (water, sand, grass, hills, mountains, peaks)');
      
      console.timeEnd('Terrain Rendering');
      console.log('\nTerrain generation and rendering example completed successfully!');
    } catch (error) {
      console.error('Error during terrain rendering:', error);
    }
  }

  /**
   * Example: Show different terrain configurations
   */
  runTerrainVariationExample(): void {
    console.log('\n=== Terrain Variation Example ===');
    
    const configs = [
      {
        name: 'Mountainous',
        gridSize: 15,
        maxHeight: 20,
        steepness: 3,
        continuity: 5,
        waterLevel: 2,
        verticalScale: 0.6
      },
      {
        name: 'Flatlands',
        gridSize: 15,
        maxHeight: 8,
        steepness: 1,
        continuity: 5,
        waterLevel: 3,
        verticalScale: 0.3
      },
      {
        name: 'Island',
        gridSize: 15,
        maxHeight: 12,
        steepness: 2,
        continuity: 5,
        waterLevel: 5,
        verticalScale: 0.4
      }
    ];
    
    configs.forEach((config, index) => {
      console.log(`\n${index + 1}. ${config.name} Terrain:`);
      
      const rng = new SeededRandom(54321 + index);
      const grid = this.terrainService.generateTerrainGrid(config, rng);
      
      // Calculate height statistics
      let minHeight = Infinity;
      let maxHeight = -Infinity;
      let totalHeight = 0;
      let cellCount = 0;
      
      for (let z = 0; z < config.gridSize; z++) {
        for (let x = 0; x < config.gridSize; x++) {
          const cell = grid[z][x];
          if (cell.height !== null) {
            const height = cell.height;
            if (height < minHeight) minHeight = height;
            if (height > maxHeight) maxHeight = height;
            totalHeight += height;
            cellCount++;
          }
        }
      }
      
      const avgHeight = cellCount > 0 ? totalHeight / cellCount : 0;
      
      console.log(`   Height Range: ${minHeight} to ${maxHeight}`);
      console.log(`   Average Height: ${avgHeight.toFixed(1)}`);
      console.log(`   Water Coverage: ${((config.waterLevel - minHeight) / (maxHeight - minHeight) * 100).toFixed(1)}%`);
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}

// Example usage
export function runTerrainGenerationExample(): void {
  const example = new TerrainGenerationExample();
  
  try {
    example.runTerrainGenerationExample();
    example.runTerrainVariationExample();
  } finally {
    example.dispose();
  }
}

// Uncomment to run the example
// runTerrainGenerationExample();