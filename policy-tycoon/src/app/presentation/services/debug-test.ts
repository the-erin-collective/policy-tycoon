import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';
import { SiteFinderService } from '../../application/services/site-finder.service'; // NEW: Import site finder service
import { CitySize } from '../../data/models/city-generation';
import { TerrainGenerationConfig } from '../../data/models/terrain-models';

// Create a simple test to debug the conversion
async function debugConversion() {
  console.log('Starting debug test...');
  
  // Create services
  const logger = new GenerationLoggerService();
  const terrainGeneration = new TerrainGenerationService(logger);
  const collisionDetection = new CollisionDetectionService(terrainGeneration);
  const cityConfiguration = new CityConfigurationService();
  const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
  const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
  const cityNameGenerator = new CityNameGeneratorService();
  const siteFinder = new SiteFinderService(terrainGeneration, collisionDetection); // NEW: Create site finder service
  const classicCityGenerator = new ClassicCityGeneratorService(
    roadNetworkBuilder,
    buildingPlacer,
    cityNameGenerator,
    cityConfiguration,
    logger,
    terrainGeneration,
    siteFinder // NEW: Pass site finder service
  );
  
  // Initialize BabylonJS scene
  const { NullEngine, Scene } = await import('@babylonjs/core');
  const engine = new NullEngine();
  const scene = new Scene(engine);
  terrainGeneration.initialize(scene);
  cityNameGenerator.initialize(scene);
  
  // Generate terrain first
  const config: TerrainGenerationConfig = {
    waterLevel: 0,
    steepness: 1,
    continuity: 3,
    renderDistance: 2
  };
  
  await terrainGeneration.generateWorld(config);
  
  // OLD: Generate a city at hardcoded coordinates (0, 0)
  console.log('\n--- OLD APPROACH: Generate city at hardcoded coordinates ---');
  const existingCityNames = new Set<string>();
  const generatedCity = classicCityGenerator.generateCity(0, 0, CitySize.Large, existingCityNames, 12345);
  
  console.log('Generated city:', generatedCity);
  console.log('Roads count:', generatedCity.roads.length);
  console.log('Buildings count:', generatedCity.buildings.length);
  
  if (generatedCity.roads.length > 0) {
    console.log('First road:', generatedCity.roads[0]);
  }
  
  if (generatedCity.buildings.length > 0) {
    console.log('First building:', generatedCity.buildings[0]);
  }
  
  // NEW: Generate cities using site finding to find valid locations
  console.log('\n--- NEW APPROACH: Generate cities using site finding ---');
  const foundCities = await classicCityGenerator.generateCities(1, 25).toPromise(); // Find 1 city with minimum 25 buildable tiles
  
  if (foundCities) {
    console.log(`Found and generated ${foundCities.length} cities using site finding`);
    foundCities.forEach((city: any, index: number) => {
      console.log(`  City ${index + 1}: ${city.name} at (${city.centerX}, ${city.centerZ}) with population ${city.population}`);
      console.log(`    Roads: ${city.roads.length} segments`);
      console.log(`    Buildings: ${city.buildings.length}`);
    });
  }
  
  // Clean up
  scene.dispose();
  engine.dispose();
}

debugConversion().catch(console.error);