/**
 * Example usage of ClassicCityGenerator
 * Demonstrates complete city generation with all components
 */

import { ClassicCityGeneratorService } from '../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../application/services/building-placer.service';
import { CityNameGeneratorService } from '../application/services/city-name-generator.service';
import { CityConfigurationService } from '../application/services/city-configuration.service';
import { CollisionDetectionService } from '../application/services/collision-detection.service';
import { GenerationLoggerService } from '../application/services/generation-logger.service';
import { TerrainGenerationService } from '../application/services/terrain-generation.service';
import { CitySize } from '../data/models/city-generation';
import { Scene, Engine, NullEngine } from '@babylonjs/core';

// Example function to demonstrate ClassicCityGenerator usage
export function demonstrateClassicCityGenerator(): void {
  console.log('=== Classic City Generator Example ===');

  // Create dependencies
  const logger = new GenerationLoggerService();
  const terrainGeneration = new TerrainGenerationService(logger);
  const collisionDetection = new CollisionDetectionService(terrainGeneration);
  const cityConfiguration = new CityConfigurationService();
  const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
  const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
  const cityNameGenerator = new CityNameGeneratorService();
  
  // Initialize BabylonJS scene for name labels
  const engine = new NullEngine();
  const scene = new Scene(engine);
  cityNameGenerator.initialize(scene);

  // Create the main city generator
  const cityGenerator = new ClassicCityGeneratorService(
    roadNetworkBuilder,
    buildingPlacer,
    cityNameGenerator,
    cityConfiguration,
    logger,
    terrainGeneration
  );

  // Generate cities of different sizes
  const existingNames = new Set<string>();
  const cities = [];

  console.log('\n--- Generating Small City ---');
  const smallCity = cityGenerator.generateCity(0, 0, CitySize.Small, existingNames, 12345);
  cities.push(smallCity);
  existingNames.add(smallCity.name);
  
  console.log(`Small City: ${smallCity.name}`);
  console.log(`Population: ${smallCity.population}`);
  console.log(`Roads: ${smallCity.roads.length} segments`);
  console.log(`Buildings: ${smallCity.buildings.length}`);
  console.log(`Center: (${smallCity.centerX}, ${smallCity.centerZ})`);

  console.log('\n--- Generating Medium City ---');
  const mediumCity = cityGenerator.generateCity(100, 100, CitySize.Medium, existingNames, 54321);
  cities.push(mediumCity);
  existingNames.add(mediumCity.name);
  
  console.log(`Medium City: ${mediumCity.name}`);
  console.log(`Population: ${mediumCity.population}`);
  console.log(`Roads: ${mediumCity.roads.length} segments`);
  console.log(`Buildings: ${mediumCity.buildings.length}`);
  console.log(`Center: (${mediumCity.centerX}, ${mediumCity.centerZ})`);

  console.log('\n--- Generating Large City ---');
  const largeCity = cityGenerator.generateCity(200, 200, CitySize.Large, existingNames, 98765);
  cities.push(largeCity);
  existingNames.add(largeCity.name);
  
  console.log(`Large City: ${largeCity.name}`);
  console.log(`Population: ${largeCity.population}`);
  console.log(`Roads: ${largeCity.roads.length} segments`);
  console.log(`Buildings: ${largeCity.buildings.length}`);
  console.log(`Center: (${largeCity.centerX}, ${largeCity.centerZ})`);

  // Show generation statistics
  console.log('\n--- Generation Statistics ---');
  cities.forEach((city, index) => {
    const stats = cityGenerator.getGenerationStats(city);
    const sizeNames = ['Small', 'Medium', 'Large'];
    console.log(`${sizeNames[index]} City (${city.name}):`);
    console.log(`  Road Count: ${stats.roadCount}`);
    console.log(`  Building Count: ${stats.buildingCount}`);
    console.log(`  Population Density: ${stats.populationDensity.toFixed(1)} people/building`);
    console.log(`  Average Building Population: ${stats.averageBuildingPopulation.toFixed(1)}`);
  });

  // Demonstrate deterministic generation
  console.log('\n--- Deterministic Generation Test ---');
  const seed = 11111;
  const city1 = cityGenerator.generateCity(50, 50, CitySize.Medium, new Set(), seed);
  const city2 = cityGenerator.generateCity(50, 50, CitySize.Medium, new Set(), seed);
  
  console.log(`City 1: ${city1.name}, Population: ${city1.population}, Roads: ${city1.roads.length}`);
  console.log(`City 2: ${city2.name}, Population: ${city2.population}, Roads: ${city2.roads.length}`);
  console.log(`Deterministic: ${city1.name === city2.name && city1.population === city2.population}`);

  // Show road network structure for one city
  console.log('\n--- Road Network Analysis ---');
  const analysisCity = smallCity;
  console.log(`Analyzing road network for ${analysisCity.name}:`);
  
  const roadTypes = {
    intersection: 0,
    horizontal: 0,
    vertical: 0,
    corner: 0
  };
  
  analysisCity.roads.forEach(road => {
    if (roadTypes.hasOwnProperty(road.roadType)) {
      roadTypes[road.roadType as keyof typeof roadTypes]++;
    }
  });
  
  console.log(`  Intersections: ${roadTypes.intersection}`);
  console.log(`  Horizontal roads: ${roadTypes.horizontal}`);
  console.log(`  Vertical roads: ${roadTypes.vertical}`);
  console.log(`  Corner roads: ${roadTypes.corner}`);

  // Show building distribution
  console.log('\n--- Building Distribution ---');
  const buildingTypes = new Map<string, number>();
  analysisCity.buildings.forEach(building => {
    const count = buildingTypes.get(building.type.name) || 0;
    buildingTypes.set(building.type.name, count + 1);
  });
  
  console.log(`Building types in ${analysisCity.name}:`);
  buildingTypes.forEach((count, typeName) => {
    console.log(`  ${typeName}: ${count}`);
  });

  // Clean up
  scene.dispose();
  engine.dispose();
  
  console.log('\n=== Example Complete ===');
}

// Run the example if this file is executed directly
if (typeof window === 'undefined') {
  demonstrateClassicCityGenerator();
}