import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';
import { CitySize } from '../../data/models/city-generation';

// Create a simple test to debug the conversion
async function debugConversion() {
  console.log('Starting debug test...');
  
  // Create services
  const collisionDetection = new CollisionDetectionService();
  const cityConfiguration = new CityConfigurationService();
  const logger = new GenerationLoggerService();
  const terrainGeneration = new TerrainGenerationService(logger);
  const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration);
  const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration);
  const cityNameGenerator = new CityNameGeneratorService();
  const classicCityGenerator = new ClassicCityGeneratorService(
    roadNetworkBuilder,
    buildingPlacer,
    cityNameGenerator,
    cityConfiguration,
    logger,
    terrainGeneration
  );
  
  // Generate a city
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
}

debugConversion().catch(console.error);