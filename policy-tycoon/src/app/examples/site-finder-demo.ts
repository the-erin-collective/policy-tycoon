/**
 * Simple demo of the SiteFinderService functionality
 */

import { SiteFinderService } from '../application/services/site-finder.service';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { CollisionDetectionService } from '../application/services/collision-detection.service';

// Simple mock implementations for demonstration
class MockTerrainGenerationService {
  isWaterAt(x: number, z: number): boolean {
    // Create some water areas
    return x < -50 || x > 50 || z < -50 || z > 50 || (x > -20 && x < 20 && z > -20 && z < 20);
  }
  
  getHeightAt(x: number, z: number): number {
    if (this.isWaterAt(x, z)) {
      return -1; // Below water level
    }
    // Simple height function
    return Math.max(1, 5 - Math.floor(Math.sqrt(x*x + z*z) / 20));
  }
}

class MockCollisionDetectionService {
  private terrainService: MockTerrainGenerationService;
  
  constructor(terrainService: MockTerrainGenerationService) {
    this.terrainService = terrainService;
  }
  
  isPassable(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    const fromHeight = this.terrainService.getHeightAt(fromX, fromZ);
    const toHeight = this.terrainService.getHeightAt(toX, toZ);
    return Math.abs(fromHeight - toHeight) <= 1;
  }
}

// Demo function
export function runSiteFinderDemo(): void {
  console.log('=== Site Finder Service Demo ===\n');
  
  // Create mock services
  const terrainService = new MockTerrainGenerationService();
  const collisionService = new MockCollisionDetectionService(terrainService);
  
  // Create the site finder service
  const siteFinder = new SiteFinderService(
    terrainService as unknown as TerrainGenerationService,
    collisionService as unknown as CollisionDetectionService
  );
  
  // Define search parameters
  const mapBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
  const targetCities = 5;
  const minArea = 25;
  
  console.log('Searching for city locations...');
  console.log(`Map bounds: ${JSON.stringify(mapBounds)}`);
  console.log(`Target cities: ${targetCities}`);
  console.log(`Minimum area per city: ${minArea} tiles\n`);
  
  // Find suitable locations
  const startPoints = siteFinder.findCityStartPoints(targetCities, minArea, mapBounds);
  
  console.log(`Found ${startPoints.length} suitable locations:\n`);
  
  startPoints.forEach((point, index) => {
    console.log(`${index + 1}. Location (${point.x}, ${point.z}) - Area: ${point.areaSize} tiles`);
  });
  
  if (startPoints.length === 0) {
    console.log('No suitable locations found. The map may be unplayable or requirements too strict.');
  } else {
    console.log('\n--- Analysis ---');
    const areas = startPoints.map(p => p.areaSize);
    console.log(`Largest area: ${Math.max(...areas)} tiles`);
    console.log(`Smallest area: ${Math.min(...areas)} tiles`);
    const avgArea = areas.reduce((sum, area) => sum + area, 0) / areas.length;
    console.log(`Average area: ${avgArea.toFixed(1)} tiles`);
  }
  
  console.log('\n=== Demo Complete ===');
}

// Run if executed directly
if (require.main === module) {
  runSiteFinderDemo();
}