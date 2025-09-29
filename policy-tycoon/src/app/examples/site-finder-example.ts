/**
 * Example usage of SiteFinderService
 * Demonstrates intelligent site selection for city placement
 */

import { SiteFinderService } from '../application/services/site-finder.service';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { CollisionDetectionService } from '../application/services/collision-detection.service';
import { GenerationLoggerService } from '../application/services/generation-logger.service';
import { Scene, Engine, NullEngine } from '@babylonjs/core';

// Mock implementation of terrain generation for demonstration purposes
class MockTerrainGenerationService {
  private waterLevel = 0;
  
  isWaterAt(x: number, z: number): boolean {
    // Create a simple terrain with some water areas
    // Water at negative heights or in specific regions
    return x < -50 || x > 50 || z < -50 || z > 50 || 
           (x > -20 && x < 20 && z > -20 && z < 20); // Central water area
  }
  
  getHeightAt(x: number, z: number): number {
    // Simple height function - higher in the center, lower at edges
    if (this.isWaterAt(x, z)) {
      return this.waterLevel - 1; // Below water level
    }
    
    // Create some hills and valleys
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    return Math.max(1, 5 - Math.floor(distanceFromCenter / 20));
  }
}

// Mock implementation of collision detection for demonstration purposes
class MockCollisionDetectionService {
  private terrainService: MockTerrainGenerationService;
  
  constructor(terrainService: MockTerrainGenerationService) {
    this.terrainService = terrainService;
  }
  
  isPassable(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    const fromHeight = this.terrainService.getHeightAt(fromX, fromZ);
    const toHeight = this.terrainService.getHeightAt(toX, toZ);
    
    // Passable if the height difference is at most 1 unit
    return Math.abs(fromHeight - toHeight) <= 1;
  }
}

// Example function to demonstrate SiteFinderService usage
export function demonstrateSiteFinder(): void {
  console.log('=== Site Finder Service Example ===');

  // Create dependencies
  const logger = new GenerationLoggerService();
  const terrainGeneration = new MockTerrainGenerationService();
  const collisionDetection = new MockCollisionDetectionService(terrainGeneration);
  
  // Create the site finder service
  const siteFinder = new SiteFinderService(
    terrainGeneration as unknown as TerrainGenerationService,
    collisionDetection as unknown as CollisionDetectionService
  );

  // Define map bounds for searching
  const mapBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
  
  console.log(`Searching for city locations within bounds: ${JSON.stringify(mapBounds)}`);
  console.log('Terrain features:');
  console.log('  - Water areas at map edges (x < -50, x > 50, z < -50, z > 50)');
  console.log('  - Central water area (-20 < x < 20, -20 < z < 20)');
  console.log('  - Hills in the center, flatter terrain at edges');

  // Find city start points
  console.log('\n--- Finding City Start Points ---');
  const targetCityCount = 5;
  const minAreaSize = 25; // Minimum 25 connected buildable tiles
  
  console.log(`Looking for ${targetCityCount} cities with minimum area of ${minAreaSize} tiles`);
  
  const startPoints = siteFinder.findCityStartPoints(targetCityCount, minAreaSize, mapBounds);
  
  console.log(`\nFound ${startPoints.length} suitable locations:`);
  
  startPoints.forEach((point, index) => {
    console.log(`  ${index + 1}. Location (${point.x}, ${point.z}) with area size: ${point.areaSize} tiles`);
  });
  
  if (startPoints.length === 0) {
    console.log('  No suitable locations found!');
    console.log('  This could indicate the map is unplayable or the requirements are too strict.');
  } else {
    console.log('\n--- Analysis of Found Locations ---');
    console.log('Largest areas are prioritized for major cities:');
    
    // Show area size distribution
    const areas = startPoints.map(p => p.areaSize);
    const maxArea = Math.max(...areas);
    const minArea = Math.min(...areas);
    const avgArea = areas.reduce((sum, area) => sum + area, 0) / areas.length;
    
    console.log(`  Maximum area: ${maxArea} tiles`);
    console.log(`  Minimum area: ${minArea} tiles`);
    console.log(`  Average area: ${avgArea.toFixed(1)} tiles`);
    
    // Show how many cities of each size we could place
    const largeCities = startPoints.filter(p => p.areaSize > 200).length;
    const mediumCities = startPoints.filter(p => p.areaSize > 100 && p.areaSize <= 200).length;
    const smallCities = startPoints.filter(p => p.areaSize <= 100).length;
    
    console.log(`\nCity size distribution based on area:`);
    console.log(`  Large cities (area > 200): ${largeCities}`);
    console.log(`  Medium cities (area 101-200): ${mediumCities}`);
    console.log(`  Small cities (area ≤ 100): ${smallCities}`);
  }
  
  // Demonstrate the effect of different minimum area requirements
  console.log('\n--- Effect of Different Area Requirements ---');
  const requirements = [10, 25, 50, 100];
  
  requirements.forEach(req => {
    const points = siteFinder.findCityStartPoints(targetCityCount, req, mapBounds);
    console.log(`  Minimum area ${req}: Found ${points.length} locations`);
  });
  
  // Demonstrate search efficiency
  console.log('\n--- Search Efficiency ---');
  console.log('The algorithm avoids checking the same tiles multiple times.');
  console.log('It uses breadth-first search to accurately measure connected buildable areas.');
  console.log('Water tiles and impassable terrain are correctly excluded from area calculations.');
  
  console.log('\n=== Example Complete ===');
}

// Run the example if this file is executed directly
if (typeof window === 'undefined') {
  demonstrateSiteFinder();
}