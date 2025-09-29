import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { ModelFactoryService } from '../../presentation/services/model-factory.service';
import { GenerationLoggerService } from './generation-logger.service';
import { SeededRandom } from '../../data/models/city-generation';

// Define interfaces for our environmental features
export interface Tree {
  id: string;
  position: Vector3;
  type: 'oak' | 'pine' | 'birch' | 'willow';
  instanced?: boolean;
  height?: number; // Add height property for better placement
}

export interface River {
  id: string;
  startPoint: Vector3;
  endPoint: Vector3;
  width: number;
}

export interface Lake {
  id: string;
  center: Vector3;
  radius: number;
}

export interface Forest {
  id: string;
  center: Vector3;
  radius: number;
  treeDensity: number;
  tiles?: any[]; // Add tiles property for tile-based forests
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentalFeatureService {
  constructor(
    private modelFactory: ModelFactoryService,
    private logger: GenerationLoggerService
  ) {}

  /**
   * Generate trees with improved placement algorithm
   * Places trees on 1/3 of blocks with forests on flat areas
   * Requirements: 5.1
   */
  generateTrees(
    mapWidth: number,
    mapHeight: number,
    treeCount: number,
    rng: SeededRandom,
    terrainGrid?: any[][],
    terrainConfig?: any,
    cityCount?: number // Add city count parameter
  ): Tree[] {
    this.logger.info(`Generating trees across map of size ${mapWidth}x${mapHeight}`);
    
    const trees: Tree[] = [];
    
    // If we have terrain information, use the improved algorithm
    if (terrainGrid && terrainConfig) {
      trees.push(...this.generateTreesWithTerrain(mapWidth, mapHeight, rng, terrainGrid, terrainConfig, cityCount));
    } else {
      // Fallback to original algorithm
      trees.push(...this.generateTreesWithoutTerrain(mapWidth, mapHeight, treeCount, rng));
    }
    
    this.logger.info(`Successfully generated ${trees.length} trees`);
    return trees;
  }

  /**
   * Generate trees using terrain information with improved placement
   */
  private generateTreesWithTerrain(
    mapWidth: number,
    mapHeight: number,
    rng: SeededRandom,
    terrainGrid: any[][],
    terrainConfig: any,
    cityCount?: number // Add city count parameter
  ): Tree[] {
    const trees: Tree[] = [];
    const gridSize = terrainGrid.length;
    const scaleX = mapWidth / gridSize;
    const scaleZ = mapHeight / gridSize;
    
    // Calculate number of forests based on city count (2 per city)
    const numForests = cityCount ? cityCount * 2 : 5; // Default to 5 if no city count provided
    
    // First, find large flat areas for forests using the algorithm from the demo
    const forests = this.findLargeFlatAreas(terrainGrid, rng, numForests);
    
    // Place forests on the identified flat areas
    forests.forEach(forestGroup => {
      forestGroup.forEach((cell: any) => {
        // Place multiple trees in each forest tile (8-10 trees as specified)
        const treeCount = 8 + Math.floor(rng.nextFloat() * 3); // 8-10 trees
        for (let t = 0; t < treeCount; t++) {
          const treePosition = this.getRandomPositionInTile(cell, terrainGrid, mapWidth, mapHeight, rng);
          if (treePosition) {
            trees.push({
              id: `tree_forest_${cell.x}_${cell.z}_${t}_${rng.nextInt(1000, 9999)}`,
              position: treePosition.position,
              type: this.selectTreeTypeForForest(rng),
              instanced: true,
              height: treePosition.height
            });
          }
        }
      });
    });
    
    // Then place scattered trees on other suitable terrain
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = terrainGrid[z][x];
        const tileType = cell.tileType?.name;
        
        // Skip cells that are part of forests
        const isForestCell = forests.some(group => 
          group.some((forestCell: any) => forestCell.x === x && forestCell.z === z)
        );
        
        if (isForestCell) continue;
        
        // Place trees on suitable terrain tiles with appropriate probabilities and counts
        if (tileType === 'grass') {
          // Grass tiles: 1-2 trees
          const treePosition = this.getRandomPositionInTile(cell, terrainGrid, mapWidth, mapHeight, rng);
          if (treePosition && rng.nextFloat() < 0.7) { // 70% chance of having trees
            const numTrees = 1 + Math.floor(rng.nextFloat() * 2); // 1-2 trees
            for (let i = 0; i < numTrees; i++) {
              trees.push({
                id: `tree_grass_${x}_${z}_${i}_${rng.nextInt(1000, 9999)}`,
                position: treePosition.position,
                type: this.selectTreeTypeForTerrain(tileType, rng),
                instanced: true,
                height: treePosition.height
              });
            }
          }
        } else if (tileType === 'hill') {
          // Hill tiles: 1-3 trees
          const treePosition = this.getRandomPositionInTile(cell, terrainGrid, mapWidth, mapHeight, rng);
          if (treePosition && rng.nextFloat() < 0.8) { // 80% chance of having trees
            const numTrees = 1 + Math.floor(rng.nextFloat() * 3); // 1-3 trees
            for (let i = 0; i < numTrees; i++) {
              trees.push({
                id: `tree_hill_${x}_${z}_${i}_${rng.nextInt(1000, 9999)}`,
                position: treePosition.position,
                type: this.selectTreeTypeForTerrain(tileType, rng),
                instanced: true,
                height: treePosition.height
              });
            }
          }
        } else if (tileType === 'mountain') {
          // Mountain tiles: 1-2 trees
          const treePosition = this.getRandomPositionInTile(cell, terrainGrid, mapWidth, mapHeight, rng);
          if (treePosition && rng.nextFloat() < 0.6) { // 60% chance of having trees
            const numTrees = 1 + Math.floor(rng.nextFloat() * 2); // 1-2 trees
            for (let i = 0; i < numTrees; i++) {
              trees.push({
                id: `tree_mountain_${x}_${z}_${i}_${rng.nextInt(1000, 9999)}`,
                position: treePosition.position,
                type: this.selectTreeTypeForTerrain(tileType, rng),
                instanced: true,
                height: treePosition.height
              });
            }
          }
        }
        // Sand, water, and peak tiles have no trees (no action needed)
      }
    }
    
    return trees;
  }

  /**
   * Find large flat areas (groups of 6+ connected tiles at same height) for forests
   * Implementation based on the algorithm from terrain-demo-22.html
   */
  private findLargeFlatAreas(terrainGrid: any[][], rng: SeededRandom, numForests: number): any[][] {
    const largeFlatAreas: any[][] = [];
    const visited = new Set<string>();
    
    // Find all connected groups of suitable terrain (grass, hill, mountain)
    for (let z = 0; z < terrainGrid.length; z++) {
      for (let x = 0; x < terrainGrid.length; x++) {
        const tileKey = `${x},${z}`;
        if (visited.has(tileKey)) continue;
        
        const startCell = terrainGrid[z][x];
        const type = startCell.tileType?.name;
        
        // Only consider grass, hill, and mountain tiles for forests (sand, water, peak excluded)
        if (type !== 'grass' && type !== 'hill' && type !== 'mountain') {
          visited.add(tileKey);
          continue;
        }
        
        // Find connected group of tiles at same height
        const group: any[] = [];
        const queue = [startCell];
        const groupVisited = new Set<string>([tileKey]);
        visited.add(tileKey);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          group.push(current);
          
          const neighbors = [
            {dx: -1, dz: 0}, // West
            {dx: 1, dz: 0},  // East
            {dx: 0, dz: -1}, // North
            {dx: 0, dz: 1}   // South
          ];
          
          for (const n of neighbors) {
            const nx = current.x + n.dx;
            const nz = current.z + n.dz;
            const neighborKey = `${nx},${nz}`;
            
            if (nx >= 0 && nx < terrainGrid.length && 
                nz >= 0 && nz < terrainGrid.length && 
                !groupVisited.has(neighborKey)) {
              
              const neighborCell = terrainGrid[nz][nx];
              // Check if neighbor is at same height and is suitable terrain
              if (neighborCell.height === startCell.height && 
                  (neighborCell.tileType?.name === 'grass' || 
                   neighborCell.tileType?.name === 'hill' || 
                   neighborCell.tileType?.name === 'mountain')) {
                
                groupVisited.add(neighborKey);
                visited.add(neighborKey);
                queue.push(neighborCell);
              }
            }
          }
        }
        
        // Only consider groups of 6 or more tiles
        if (group.length >= 6) {
          largeFlatAreas.push(group);
        }
      }
    }
    
    // Select forests from the large flat areas
    const forestTiles = new Set<any>();
    const availableTiles = new Set<any>(largeFlatAreas.flat());
    const forests: any[][] = [];
    let forestsPlaced = 0;
    
    while (forestsPlaced < numForests && availableTiles.size >= 6) {
      const availableTilesArray = Array.from(availableTiles);
      const startCell = availableTilesArray[Math.floor(rng.nextFloat() * availableTilesArray.length)];
      
      const queue = [startCell];
      const group = [startCell];
      const groupVisited = new Set<any>([startCell]);
      let head = 0;
      
      // Try to form a group of exactly 6 connected tiles
      while (head < queue.length && group.length < 6) {
        const current = queue[head++];
        const neighbors = [
          {dx: -1, dz: 0}, // West
          {dx: 1, dz: 0},  // East
          {dx: 0, dz: -1}, // North
          {dx: 0, dz: 1}   // South
        ];
        
        for (const n of neighbors) {
          const nx = current.x + n.dx;
          const nz = current.z + n.dz;
          
          if (nx >= 0 && nx < terrainGrid.length && 
              nz >= 0 && nz < terrainGrid.length) {
            
            const neighborCell = terrainGrid[nz][nx];
            if (availableTiles.has(neighborCell) && 
                !groupVisited.has(neighborCell) && 
                neighborCell.height === startCell.height) {
              
              groupVisited.add(neighborCell);
              group.push(neighborCell);
              queue.push(neighborCell);
              if (group.length === 6) break;
            }
          }
        }
      }
      
      if (group.length === 6) {
        // Successfully formed a forest group
        group.forEach(cell => {
          forestTiles.add(cell);
          availableTiles.delete(cell);
        });
        
        forests.push(group);
        forestsPlaced++;
      } else {
        // Remove all tiles in this group from available tiles
        group.forEach(cell => availableTiles.delete(cell));
      }
    }
    
    return forests;
  }

  /**
   * Get random position within a terrain tile with safety margins
   */
  private getRandomPositionInTile(
    cell: any, 
    terrainGrid: any[][], 
    mapWidth: number, 
    mapHeight: number,
    rng: SeededRandom
  ): { position: Vector3, height: number } | null {
    const gridSize = terrainGrid.length;
    const scaleX = mapWidth / gridSize;
    const scaleZ = mapHeight / gridSize;
    
    // Calculate world position with safety margins
    let minX = -0.45, maxX = 0.45;
    let minZ = -0.45, maxZ = 0.45;
    const safetyMargin = 0.3;
    const currentHeight = cell.height;
    
    // Adjust margins based on neighboring tile heights
    if (cell.x + 1 < gridSize && terrainGrid[cell.z][cell.x + 1].height < currentHeight) {
      maxX -= safetyMargin;
    }
    if (cell.x - 1 >= 0 && terrainGrid[cell.z][cell.x - 1].height < currentHeight) {
      minX += safetyMargin;
    }
    if (cell.z + 1 < gridSize && terrainGrid[cell.z + 1][cell.x].height < currentHeight) {
      maxZ -= safetyMargin;
    }
    if (cell.z - 1 >= 0 && terrainGrid[cell.z - 1][cell.x].height < currentHeight) {
      minZ += safetyMargin;
    }
    
    // Ensure valid ranges
    if (minX > maxX) minX = maxX = (minX + maxX) / 2;
    if (minZ > maxZ) minZ = maxZ = (minZ + maxZ) / 2;
    
    // Generate random position within the tile
    const randomOffsetX = minX + rng.nextFloat() * (maxX - minX);
    const randomOffsetZ = minZ + rng.nextFloat() * (maxZ - minZ);
    const worldX = (cell.x - gridSize / 2 + 0.5) * scaleX + randomOffsetX;
    const worldZ = (cell.z - gridSize / 2 + 0.5) * scaleZ + randomOffsetZ;
    const worldY = 0; // Ground level (height will be adjusted during rendering)
    
    return {
      position: new Vector3(worldX, worldY, worldZ),
      height: currentHeight
    };
  }

  /**
   * Select tree type for forest areas (more pines)
   */
  private selectTreeTypeForForest(rng: SeededRandom): 'oak' | 'pine' | 'birch' | 'willow' {
    const rand = rng.nextFloat();
    if (rand < 0.5) return 'pine';
    if (rand < 0.8) return 'oak';
    if (rand < 0.95) return 'birch';
    return 'willow';
  }

  /**
   * Select tree type based on terrain type
   */
  private selectTreeTypeForTerrain(terrainType: string, rng: SeededRandom): 'oak' | 'pine' | 'birch' | 'willow' {
    const rand = rng.nextFloat();
    
    if (terrainType === 'grass') {
      // Grass: More oaks and pines
      if (rand < 0.4) return 'oak';
      if (rand < 0.7) return 'pine';
      if (rand < 0.9) return 'birch';
      return 'willow';
    } else if (terrainType === 'hill') {
      // Hill: More pines
      if (rand < 0.5) return 'pine';
      if (rand < 0.8) return 'oak';
      if (rand < 0.95) return 'birch';
      return 'willow';
    } else { // mountain
      // Mountain: More pines and birches
      if (rand < 0.6) return 'pine';
      if (rand < 0.8) return 'birch';
      if (rand < 0.9) return 'oak';
      return 'willow';
    }
  }

  /**
   * Generate trees without terrain information (fallback method)
   */
  private generateTreesWithoutTerrain(
    mapWidth: number,
    mapHeight: number,
    treeCount: number,
    rng: SeededRandom
  ): Tree[] {
    const trees: Tree[] = [];
    const halfWidth = mapWidth / 2;
    const halfHeight = mapHeight / 2;
    
    for (let i = 0; i < treeCount; i++) {
      const x = rng.nextInt(-halfWidth + 5, halfWidth - 5);
      const z = rng.nextInt(-halfHeight + 5, halfHeight - 5);
      const y = 0;
      
      const position = new Vector3(x, y, z);
      
      // Select tree type with realistic distribution
      const treeTypes = [
        { type: 'oak', probability: 0.3 },
        { type: 'pine', probability: 0.4 },
        { type: 'birch', probability: 0.2 },
        { type: 'willow', probability: 0.1 }
      ];
      
      let cumulativeProbability = 0;
      const randomValue = rng.nextFloat();
      let selectedType: 'oak' | 'pine' | 'birch' | 'willow' = 'pine';
      
      for (const treeType of treeTypes) {
        cumulativeProbability += treeType.probability;
        if (randomValue <= cumulativeProbability) {
          selectedType = treeType.type as 'oak' | 'pine' | 'birch' | 'willow';
          break;
        }
      }
      
      trees.push({
        id: `tree_${i}_${rng.nextInt(1000, 9999)}`,
        position,
        type: selectedType,
        instanced: true
      });
    }
    
    return trees;
  }

  /**
   * Generate water bodies (rivers and lakes) with realistic placement
   * Requirements: 5.2
   */
  generateWaterBodies(
    mapWidth: number,
    mapHeight: number,
    waterBodyCount: number,
    rng: SeededRandom
  ): Array<River | Lake> {
    this.logger.info(`Generating ${waterBodyCount} water bodies across map of size ${mapWidth}x${mapHeight}`);
    
    const waterBodies: Array<River | Lake> = [];
    const halfWidth = mapWidth / 2;
    const halfHeight = mapHeight / 2;
    
    for (let i = 0; i < waterBodyCount; i++) {
      // Randomly decide between river (70%) and lake (30%)
      const isRiver = rng.nextFloat() < 0.7;
      
      if (isRiver) {
        // Generate a river
        const startX = rng.nextInt(-halfWidth + 10, halfWidth - 10);
        const startZ = rng.nextInt(-halfHeight + 10, halfHeight - 10);
        const startY = 0;
        
        // Rivers tend to flow in one general direction
        const directionX = rng.nextFloat() > 0.5 ? 1 : -1;
        const directionZ = rng.nextFloat() > 0.5 ? 1 : -1;
        
        // River length varies
        const length = rng.nextInt(30, 100);
        const endX = Math.max(-halfWidth + 5, Math.min(halfWidth - 5, startX + directionX * length));
        const endZ = Math.max(-halfHeight + 5, Math.min(halfHeight - 5, startZ + directionZ * length));
        const endY = 0;
        
        const width = rng.nextInt(2, 6); // River width between 2 and 6 units
        
        waterBodies.push({
          id: `river_${i}_${rng.nextInt(1000, 9999)}`,
          startPoint: new Vector3(startX, startY, startZ),
          endPoint: new Vector3(endX, endY, endZ),
          width
        } as River);
      } else {
        // Generate a lake
        const centerX = rng.nextInt(-halfWidth + 15, halfWidth - 15);
        const centerZ = rng.nextInt(-halfHeight + 15, halfHeight - 15);
        const centerY = 0;
        
        const radius = rng.nextInt(5, 20); // Lake radius between 5 and 20 units
        
        waterBodies.push({
          id: `lake_${i}_${rng.nextInt(1000, 9999)}`,
          center: new Vector3(centerX, centerY, centerZ),
          radius
        } as Lake);
      }
    }
    
    this.logger.info(`Successfully generated ${waterBodies.length} water bodies (${waterBodies.filter(w => 'startPoint' in w).length} rivers, ${waterBodies.filter(w => 'center' in w && 'radius' in w).length} lakes)`);
    return waterBodies;
  }

  /**
   * Generate forests with varying tree density
   * Requirements: 5.3
   */
  generateForests(
    mapWidth: number,
    mapHeight: number,
    forestCount: number,
    rng: SeededRandom
  ): Forest[] {
    this.logger.info(`Generating ${forestCount} forests across map of size ${mapWidth}x${mapHeight}`);
    
    const forests: Forest[] = [];
    const halfWidth = mapWidth / 2;
    const halfHeight = mapHeight / 2;
    
    for (let i = 0; i < forestCount; i++) {
      // Generate forest center within map bounds but with margin
      const centerX = rng.nextInt(-halfWidth + 20, halfWidth - 20);
      const centerZ = rng.nextInt(-halfHeight + 20, halfHeight - 20);
      const centerY = 0;
      
      // Forest radius varies
      const radius = rng.nextInt(10, 40); // Forest radius between 10 and 40 units
      
      // Tree density varies (0.3 to 0.9)
      const treeDensity = 0.3 + rng.nextFloat() * 0.6;
      
      forests.push({
        id: `forest_${i}_${rng.nextInt(1000, 9999)}`,
        center: new Vector3(centerX, centerY, centerZ),
        radius,
        treeDensity
      });
    }
    
    this.logger.info(`Successfully generated ${forests.length} forests`);
    return forests;
  }

  /**
   * Generate forests with varying tree density for resource gathering
   * Requirements: Create forests as wood resources (around as many as towns)
   * Each forest should have 50-100 trees
   */
  generateResourceForests(
    mapWidth: number,
    mapHeight: number,
    townCount: number, // Number of towns to match forest count
    rng: SeededRandom
  ): Forest[] {
    this.logger.info(`Generating ${townCount} resource forests across map of size ${mapWidth}x${mapHeight}`);
    
    const forests: Forest[] = [];
    const halfWidth = mapWidth / 2;
    const halfHeight = mapHeight / 2;
    
    for (let i = 0; i < townCount; i++) {
      // Generate forest center within map bounds but with margin
      const centerX = rng.nextInt(-halfWidth + 30, halfWidth - 30);
      const centerZ = rng.nextInt(-halfHeight + 30, halfHeight - 30);
      const centerY = 0;
      
      // Forest radius to contain 50-100 trees
      const radius = rng.nextInt(15, 25); // Radius to achieve target tree count
      
      // High tree density for resource forests (0.7 to 0.9)
      const treeDensity = 0.7 + rng.nextFloat() * 0.2;
      
      forests.push({
        id: `resource_forest_${i}_${rng.nextInt(1000, 9999)}`,
        center: new Vector3(centerX, centerY, centerZ),
        radius,
        treeDensity
      });
    }
    
    this.logger.info(`Successfully generated ${forests.length} resource forests`);
    return forests;
  }

  /**
   * Place trees within a forest area
   * Requirements: 5.3
   */
  generateTreesInForest(
    forest: Forest,
    rng: SeededRandom
  ): Tree[] {
    this.logger.info(`Generating trees for forest ${forest.id} with radius ${forest.radius} and density ${forest.treeDensity}`);
    
    const trees: Tree[] = [];
    const treeCount = Math.floor(Math.PI * forest.radius * forest.radius * forest.treeDensity);
    
    for (let i = 0; i < treeCount; i++) {
      // Generate random position within forest circle
      let x, z;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        const angle = rng.nextFloat() * 2 * Math.PI;
        const distance = rng.nextFloat() * forest.radius;
        x = forest.center.x + Math.cos(angle) * distance;
        z = forest.center.z + Math.sin(angle) * distance;
        attempts++;
      } while (
        Math.sqrt(Math.pow(x - forest.center.x, 2) + Math.pow(z - forest.center.z, 2)) > forest.radius &&
        attempts < maxAttempts
      );
      
      const position = new Vector3(x, forest.center.y, z);
      
      // Select tree type (forests tend to have more pine trees)
      const treeTypes = [
        { type: 'pine', probability: 0.5 },
        { type: 'oak', probability: 0.3 },
        { type: 'birch', probability: 0.15 },
        { type: 'willow', probability: 0.05 }
      ];
      
      let cumulativeProbability = 0;
      const randomValue = rng.nextFloat();
      let selectedType: 'oak' | 'pine' | 'birch' | 'willow' = 'pine';
      
      for (const treeType of treeTypes) {
        cumulativeProbability += treeType.probability;
        if (randomValue <= cumulativeProbability) {
          selectedType = treeType.type as 'oak' | 'pine' | 'birch' | 'willow';
          break;
        }
      }
      
      trees.push({
        id: `tree_${forest.id}_${i}_${rng.nextInt(1000, 9999)}`,
        position,
        type: selectedType
      });
    }
    
    this.logger.info(`Successfully generated ${trees.length} trees for forest ${forest.id}`);
    return trees;
  }
}