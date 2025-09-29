/**
 * Example demonstrating ClassicCityGenerator with Angular Signals
 * Shows reactive state management in zoneless mode
 */

import { effect, computed } from '@angular/core';
import { ClassicCityGeneratorService } from '../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../application/services/building-placer.service';
import { CityNameGeneratorService } from '../application/services/city-name-generator.service';
import { CityConfigurationService } from '../application/services/city-configuration.service';
import { CollisionDetectionService } from '../application/services/collision-detection.service';
import { GenerationLoggerService } from '../application/services/generation-logger.service';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { SiteFinderService } from '../application/services/site-finder.service'; // NEW: Import site finder service
import { CitySize } from '../data/models/city-generation';
import { Scene, Engine, NullEngine } from '@babylonjs/core';

export function demonstrateSignalsWithCityGenerator(): void {
  console.log('=== Signals-Based City Generator Example ===');

  // Create dependencies
  const logger = new GenerationLoggerService();
  const terrainGeneration = new TerrainGenerationService(logger);
  const collisionDetection = new CollisionDetectionService(terrainGeneration);
  const cityConfiguration = new CityConfigurationService();
  const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
  const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
  const cityNameGenerator = new CityNameGeneratorService();
  const siteFinder = new SiteFinderService(terrainGeneration, collisionDetection); // NEW: Create site finder service
  
  // Initialize BabylonJS scene
  const engine = new NullEngine();
  const scene = new Scene(engine);
  cityNameGenerator.initialize(scene);

  // Create the signal-enabled city generator
  const cityGenerator = new ClassicCityGeneratorService(
    roadNetworkBuilder,
    buildingPlacer,
    cityNameGenerator,
    cityConfiguration,
    logger,
    terrainGeneration,
    siteFinder // NEW: Pass site finder service
  );

  // Set up reactive effects to monitor state changes
  console.log('\n--- Setting up reactive effects ---');

  // Effect to monitor total cities
  const cityCountEffect = effect(() => {
    const count = cityGenerator.totalCitiesGenerated();
    console.log(`📊 Total cities generated: ${count}`);
  });

  // Effect to monitor total population
  const populationEffect = effect(() => {
    const population = cityGenerator.totalPopulation();
    console.log(`👥 Total population across all cities: ${population}`);
  });

  // Effect to monitor generation status
  const generationStatusEffect = effect(() => {
    const isGenerating = cityGenerator.isGenerating();
    if (isGenerating) {
      console.log('🏗️  City generation in progress...');
    } else {
      console.log('✅ City generation complete');
    }
  });

  // Effect to monitor latest generation stats
  const statsEffect = effect(() => {
    const stats = cityGenerator.lastGenerationStats();
    if (stats) {
      console.log(`📈 Latest city stats: ${stats.buildingCount} buildings, ${stats.roadCount} roads, ${stats.populationDensity.toFixed(1)} people/building`);
    }
  });

  // Computed signal for city size distribution
  const sizeDistribution = computed(() => {
    const cities = cityGenerator.generatedCities();
    const distribution = {
      small: 0,
      medium: 0,
      large: 0
    };

    cities.forEach(city => {
      if (city.population <= 300) distribution.small++;
      else if (city.population <= 500) distribution.medium++;
      else distribution.large++;
    });

    return distribution;
  });

  // Effect to monitor size distribution
  const distributionEffect = effect(() => {
    const dist = sizeDistribution();
    console.log(`🏘️  City size distribution: Small: ${dist.small}, Medium: ${dist.medium}, Large: ${dist.large}`);
  });

  console.log('\n--- Generating cities with reactive updates ---');

  // Generate cities and watch signals update automatically
  const existingNames = new Set<string>();

  console.log('\n1. Generating first city...');
  const city1 = cityGenerator.generateCity(0, 0, CitySize.Small, existingNames, 12345);
  existingNames.add(city1.name);

  console.log('\n2. Generating second city...');
  const city2 = cityGenerator.generateCity(100, 100, CitySize.Medium, existingNames, 54321);
  existingNames.add(city2.name);

  console.log('\n3. Generating third city...');
  const city3 = cityGenerator.generateCity(200, 200, CitySize.Large, existingNames, 98765);
  existingNames.add(city3.name);

  // Demonstrate city filtering by size
  console.log('\n--- Demonstrating computed signals for filtering ---');
  
  const smallCitiesSignal = cityGenerator.getCitiesBySize(CitySize.Small);
  const mediumCitiesSignal = cityGenerator.getCitiesBySize(CitySize.Medium);
  const largeCitiesSignal = cityGenerator.getCitiesBySize(CitySize.Large);

  console.log(`Small cities (computed): ${smallCitiesSignal().length}`);
  console.log(`Medium cities (computed): ${mediumCitiesSignal().length}`);
  console.log(`Large cities (computed): ${largeCitiesSignal().length}`);

  // Demonstrate city removal and signal updates
  console.log('\n--- Demonstrating city removal ---');
  console.log(`Before removal: ${cityGenerator.totalCitiesGenerated()} cities`);
  
  cityGenerator.removeCity(city2.id);
  console.log(`After removing ${city2.name}: ${cityGenerator.totalCitiesGenerated()} cities`);

  // Demonstrate finding cities
  console.log('\n--- Demonstrating city lookup ---');
  const foundCity = cityGenerator.getCityById(city1.id);
  const notFoundCity = cityGenerator.getCityById('nonexistent-id');
  
  console.log(`Found city by ID: ${foundCity ? foundCity.name : 'Not found'}`);
  console.log(`Non-existent city: ${notFoundCity ? 'Found' : 'Not found'}`);

  // Demonstrate clearing all cities
  console.log('\n--- Demonstrating clear all cities ---');
  console.log(`Before clearing: ${cityGenerator.totalCitiesGenerated()} cities`);
  
  cityGenerator.clearGeneratedCities();
  console.log(`After clearing: ${cityGenerator.totalCitiesGenerated()} cities`);

  // Clean up effects (in a real app, this would be handled by component lifecycle)
  console.log('\n--- Cleaning up ---');
  cityCountEffect.destroy();
  populationEffect.destroy();
  generationStatusEffect.destroy();
  statsEffect.destroy();
  distributionEffect.destroy();

  // Clean up BabylonJS
  scene.dispose();
  engine.dispose();

  console.log('\n=== Signals Example Complete ===');
  console.log('Key benefits demonstrated:');
  console.log('✅ Automatic reactive updates without Zone.js');
  console.log('✅ Computed signals for derived state');
  console.log('✅ Effects for side effects and monitoring');
  console.log('✅ Immutable state updates');
  console.log('✅ Better performance in zoneless mode');
}

// Run the example if this file is executed directly
if (typeof window === 'undefined') {
  demonstrateSignalsWithCityGenerator();
}