/**
 * Example demonstrating how to use the CityNameGenerator service
 * This shows integration with the existing city generation system
 */

import { Scene, Engine, NullEngine } from '@babylonjs/core';
import { CityNameGeneratorService } from '../application/services/city-name-generator.service';
import { SeededRandom } from '../data/models/city-generation';

// Simple SeededRandom implementation for the example
class ExampleSeededRandom implements SeededRandom {
  seed: number;
  private state: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
    this.state = seed;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }

  nextIntInclusive(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  nextFloat(): number {
    this.state = (this.state * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.state / Math.pow(2, 32);
  }

  nextBoolean(probability: number = 0.5): boolean {
    return this.nextFloat() < probability;
  }

  selectFromArray<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot select from empty array');
    const index = this.nextInt(0, array.length);
    return array[index];
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.state = seed;
  }
}

/**
 * Example usage of CityNameGenerator in a city generation workflow
 */
export class CityNameGeneratorExample {
  private nameGenerator: CityNameGeneratorService;
  private scene: Scene;
  private engine: Engine;

  constructor() {
    // Initialize BabylonJS engine and scene
    this.engine = new NullEngine();
    this.scene = new Scene(this.engine);
    
    // Initialize the name generator service
    this.nameGenerator = new CityNameGeneratorService();
    this.nameGenerator.initialize(this.scene);
  }

  /**
   * Example: Generate multiple cities with unique names and labels
   */
  generateExampleCities(): void {
    console.log('=== City Name Generator Example ===');
    
    const rng = new ExampleSeededRandom(54321);
    const existingNames = new Set<string>();
    const cityLabels = [];

    // Generate 5 example cities
    for (let i = 0; i < 5; i++) {
      // Generate unique city name
      const cityName = this.nameGenerator.generateUniqueName(existingNames, rng);
      existingNames.add(cityName);

      // Create city coordinates (example positions)
      const centerX = (i - 2) * 20; // Spread cities along X axis
      const centerZ = 0;

      // Create 3D name label for the city
      const nameLabel = this.nameGenerator.createNameLabel(cityName, centerX, centerZ);
      cityLabels.push(nameLabel);

      console.log(`City ${i + 1}: ${cityName} at (${centerX}, ${centerZ})`);
      console.log(`  Label ID: ${nameLabel.id}`);
      console.log(`  Label visible: ${nameLabel.visible}`);
      console.log(`  Label position: (${nameLabel.centerX}, ${nameLabel.centerZ})`);
    }

    console.log(`\nGenerated ${cityLabels.length} cities with unique names`);
    console.log(`Active labels: ${this.nameGenerator.getActiveLabels().size}`);

    // Example: Update a city's position
    if (cityLabels.length > 0) {
      const firstCity = cityLabels[0];
      console.log(`\nMoving ${firstCity.cityName} to new position...`);
      this.nameGenerator.updateNameLabelPosition(firstCity, 100, 50);
      console.log(`New position: (${firstCity.centerX}, ${firstCity.centerZ})`);
    }

    // Example: Toggle label visibility
    console.log('\nToggling label visibility...');
    this.nameGenerator.setLabelsVisible(false);
    console.log('Labels hidden');
    this.nameGenerator.setLabelsVisible(true);
    console.log('Labels shown');

    // Example: Remove a city
    if (cityLabels.length > 0) {
      const cityToRemove = cityLabels[0];
      console.log(`\nRemoving city: ${cityToRemove.cityName}`);
      this.nameGenerator.removeNameLabel(cityToRemove);
      console.log(`Active labels after removal: ${this.nameGenerator.getActiveLabels().size}`);
    }
  }

  /**
   * Example: Demonstrate deterministic name generation
   */
  demonstrateDeterministicGeneration(): void {
    console.log('\n=== Deterministic Generation Example ===');
    
    const seed = 98765;
    const existingNames = new Set<string>();

    // Generate names with same seed twice
    const rng1 = new ExampleSeededRandom(seed);
    const names1 = [];
    for (let i = 0; i < 3; i++) {
      names1.push(this.nameGenerator.generateUniqueName(existingNames, rng1));
    }

    // Reset and generate again with same seed
    existingNames.clear();
    this.nameGenerator.clearAllLabels(); // Reset internal state
    
    const rng2 = new ExampleSeededRandom(seed);
    const names2 = [];
    for (let i = 0; i < 3; i++) {
      names2.push(this.nameGenerator.generateUniqueName(existingNames, rng2));
    }

    console.log('First generation:', names1);
    console.log('Second generation:', names2);
    console.log('Results match:', JSON.stringify(names1) === JSON.stringify(names2));
  }

  /**
   * Example: Show collision avoidance
   */
  demonstrateCollisionAvoidance(): void {
    console.log('\n=== Collision Avoidance Example ===');
    
    const rng = new ExampleSeededRandom(11111);
    const existingNames = new Set(['Springfield', 'Riverside', 'Hilltown']);
    
    console.log('Existing names:', Array.from(existingNames));
    
    // Generate new names that should avoid collisions
    const newNames = [];
    for (let i = 0; i < 3; i++) {
      const name = this.nameGenerator.generateUniqueName(existingNames, rng);
      newNames.push(name);
      existingNames.add(name);
    }
    
    console.log('New unique names:', newNames);
    console.log('No collisions:', newNames.every(name => !['Springfield', 'Riverside', 'Hilltown'].includes(name)));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.nameGenerator.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}

// Example usage
export function runCityNameGeneratorExample(): void {
  const example = new CityNameGeneratorExample();
  
  try {
    example.generateExampleCities();
    example.demonstrateDeterministicGeneration();
    example.demonstrateCollisionAvoidance();
  } finally {
    example.dispose();
  }
}

// Uncomment to run the example
// runCityNameGeneratorExample();