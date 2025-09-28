/**
 * Example demonstrating BuildingPlacerService usage
 * Shows how to place buildings in a road network with population targets
 */

import { BuildingPlacerService } from '../application/services/building-placer.service';
import { CollisionDetectionService } from '../application/services/collision-detection.service';
import { CityConfigurationService } from '../application/services/city-configuration.service';
import { GenerationLoggerService } from '../application/services/generation-logger.service';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { RoadNetwork, RoadSegment, Direction, Building } from '../data/models/city-generation';
import { SeededRandom } from '../utils/seeded-random';

/**
 * Example usage of BuildingPlacerService
 * Demonstrates how to use the building placement system for OpenTTD-style city generation
 */

export class BuildingPlacerExample {
  private buildingPlacer: BuildingPlacerService;
  private collisionDetection: CollisionDetectionService;
  private cityConfiguration: CityConfigurationService;

  constructor() {
    this.collisionDetection = new CollisionDetectionService();
    this.cityConfiguration = new CityConfigurationService();
    this.buildingPlacer = new BuildingPlacerService(
      this.collisionDetection,
      this.cityConfiguration,
      new GenerationLoggerService(),
      new TerrainGenerationService(new GenerationLoggerService())
    );
  }

  /**
   * Example: Place buildings in a simple crossroad town
   */
  runBasicExample(): void {
    console.log('=== Building Placer Example ===');

    // Create a simple road network (crossroad pattern)
    const roadNetwork = this.createExampleRoadNetwork();
    
    // Set target population for a small town
    const targetPopulation = 50;
    
    // Create seeded random generator for deterministic results
    const rng = new SeededRandom(12345);
    
    console.log(`Placing buildings for target population: ${targetPopulation}`);
    console.log(`Road network has ${roadNetwork.segments.length} segments`);
    
    // Place buildings using the building placer
    const result = this.buildingPlacer.placeInitialBuildings(
      roadNetwork, 
      targetPopulation, 
      rng
    );
    
    console.log(`\nPlacement Results:`);
    console.log(`- Buildings placed: ${result.buildings.length}`);
    console.log(`- Total population: ${result.totalPopulation}`);
    console.log(`- Target achieved: ${result.totalPopulation >= targetPopulation ? 'Yes' : 'No'}`);
    
    // Show building details
    console.log(`\nBuilding Details:`);
    result.buildings.forEach((building, index) => {
      console.log(`  ${index + 1}. ${building.type.name} at (${building.x}, ${building.z}) - Population: ${building.population}`);
    });
  }

  /**
   * Example: Test random walk algorithm
   */
  runRandomWalkExample(): void {
    console.log('\n=== Random Walk Example ===');

    const roadNetwork = this.createExampleRoadNetwork();
    const rng = new SeededRandom(54321);
    
    // Perform several random walks to show variation
    for (let i = 0; i < 3; i++) {
      console.log(`\nRandom Walk ${i + 1}:`);
      
      const walkResult = this.buildingPlacer.performRandomWalk(roadNetwork, rng);
      
      console.log(`  Steps completed: ${walkResult.stepsCompleted}`);
      console.log(`  Valid spots found: ${walkResult.validSpots.length}`);
      console.log(`  Walk path: ${walkResult.walkPath.map(p => `(${p.x},${p.z})`).join(' -> ')}`);
      
      if (walkResult.validSpots.length > 0) {
        console.log(`  Sample valid spots: ${walkResult.validSpots.slice(0, 3).map(s => `(${s.x},${s.z})`).join(', ')}`);
      }
    }
  }

  /**
   * Example: Compare different city sizes
   */
  runCitySizeComparison(): void {
    console.log('\n=== City Size Comparison ===');

    const roadNetwork = this.createLargerRoadNetwork();
    const rng = new SeededRandom(98765);
    
    const citySizes = [
      { name: 'Small', population: 200 },
      { name: 'Medium', population: 400 },
      { name: 'Large', population: 600 }
    ];
    
    citySizes.forEach(citySize => {
      console.log(`\n${citySize.name} City (Target: ${citySize.population}):`);
      
      const result = this.buildingPlacer.placeInitialBuildings(
        roadNetwork,
        citySize.population,
        new SeededRandom(rng.getSeed()) // Use same base seed for comparison
      );
      
      console.log(`  Buildings: ${result.buildings.length}`);
      console.log(`  Population: ${result.totalPopulation}`);
      console.log(`  Avg per building: ${(result.totalPopulation / result.buildings.length).toFixed(1)}`);
      
      // Show building type distribution
      const typeCount = new Map<string, number>();
      result.buildings.forEach(building => {
        const count = typeCount.get(building.type.name) || 0;
        typeCount.set(building.type.name, count + 1);
      });
      
      console.log(`  Building types:`);
      typeCount.forEach((count, typeName) => {
        console.log(`    ${typeName}: ${count}`);
      });
    });
  }

  /**
   * Create a simple crossroad road network for testing
   */
  private createExampleRoadNetwork(): RoadNetwork {
    const segments: RoadSegment[] = [
      // Central intersection
      {
        startX: 0, startZ: 0, endX: 0, endZ: 0,
        roadType: 'intersection', gridX: 0, gridZ: 0,
        connections: [Direction.North, Direction.South, Direction.East, Direction.West]
      },
      // North arm
      {
        startX: 0, startZ: -1, endX: 0, endZ: -3,
        roadType: 'vertical', gridX: 0, gridZ: -1
      },
      // South arm
      {
        startX: 0, startZ: 1, endX: 0, endZ: 3,
        roadType: 'vertical', gridX: 0, gridZ: 1
      },
      // East arm
      {
        startX: 1, startZ: 0, endX: 4, endZ: 0,
        roadType: 'horizontal', gridX: 1, gridZ: 0
      },
      // West arm
      {
        startX: -1, startZ: 0, endX: -2, endZ: 0,
        roadType: 'horizontal', gridX: -1, gridZ: 0
      }
    ];

    return {
      segments: segments,
      intersections: [{ x: 0, z: 0 }],
      deadEnds: [
        { x: 0, z: -3 },
        { x: 0, z: 3 },
        { x: 4, z: 0 },
        { x: -2, z: 0 }
      ]
    };
  }

  /**
   * Create a larger road network with more complexity
   */
  private createLargerRoadNetwork(): RoadNetwork {
    const segments: RoadSegment[] = [
      // Main crossroad
      {
        startX: 0, startZ: 0, endX: 0, endZ: 0,
        roadType: 'intersection', gridX: 0, gridZ: 0,
        connections: [Direction.North, Direction.South, Direction.East, Direction.West]
      },
      // Extended arms
      {
        startX: 0, startZ: -1, endX: 0, endZ: -5,
        roadType: 'vertical', gridX: 0, gridZ: -1
      },
      {
        startX: 0, startZ: 1, endX: 0, endZ: 5,
        roadType: 'vertical', gridX: 0, gridZ: 1
      },
      {
        startX: 1, startZ: 0, endX: 6, endZ: 0,
        roadType: 'horizontal', gridX: 1, gridZ: 0
      },
      {
        startX: -1, startZ: 0, endX: -4, endZ: 0,
        roadType: 'horizontal', gridX: -1, gridZ: 0
      },
      // Perpendicular segments
      {
        startX: 0, startZ: -5, endX: 2, endZ: -5,
        roadType: 'horizontal', gridX: 0, gridZ: -5
      },
      {
        startX: 6, startZ: 0, endX: 6, endZ: -3,
        roadType: 'vertical', gridX: 6, gridZ: 0
      }
    ];

    return {
      segments: segments,
      intersections: [
        { x: 0, z: 0 },
        { x: 0, z: -5 },
        { x: 6, z: 0 }
      ],
      deadEnds: [
        { x: 2, z: -5 },
        { x: 0, z: 5 },
        { x: -4, z: 0 },
        { x: 6, z: -3 }
      ]
    };
  }
}

// Example usage
export function runBuildingPlacerExamples(): void {
  const example = new BuildingPlacerExample();
  
  example.runBasicExample();
  example.runRandomWalkExample();
  example.runCitySizeComparison();
}

// Uncomment to run examples
// runBuildingPlacerExamples();