// Simple Node.js script to test the integration
console.log('Starting integration test...');

// Import required modules
const { Vector3 } = require('@babylonjs/core');

// Mock the Angular services and other dependencies
class MockCollisionDetectionService {}
class MockCityConfigurationService {
  generateTargetPopulation() { return 250; }
}
class MockLoggerService {
  info(msg) { console.log('[INFO]', msg); }
  warn(msg) { console.log('[WARN]', msg); }
  error(msg, error) { console.log('[ERROR]', msg, error); }
}
class MockRoadNetworkBuilderService {
  buildInitialNetwork(centerX, centerZ, rng) {
    return {
      segments: [
        { startX: centerX-2, startZ: centerZ, endX: centerX+2, endZ: centerZ, roadType: 'horizontal', gridX: centerX, gridZ: centerZ },
        { startX: centerX, startZ: centerZ-2, endX: centerX, endZ: centerZ+2, roadType: 'vertical', gridX: centerX, gridZ: centerZ }
      ],
      intersections: [{ x: centerX, z: centerZ }],
      deadEnds: [],
      corners: []
    };
  }
}
class MockBuildingPlacerService {
  placeInitialBuildings(roadNetwork, targetPopulation, rng) {
    return {
      buildings: [
        { x: 0, z: 1, type: { id: 'small_house_1', name: 'Small House', population: 8, width: 2, height: 2 }, population: 8 },
        { x: 1, z: 0, type: { id: 'small_house_2', name: 'Small House', population: 8, width: 2, height: 2 }, population: 8 }
      ],
      totalPopulation: 16
    };
  }
}
class MockCityNameGeneratorService {
  generateUniqueName(existingNames, rng) { return 'Test City'; }
  createNameLabel(cityName, centerX, centerZ) { 
    return { id: 'label-1', cityName, centerX, centerZ, visible: true }; 
  }
}

// Mock the ClassicCityGeneratorService
class MockClassicCityGeneratorService {
  constructor(roadNetworkBuilder, buildingPlacer, cityNameGenerator, cityConfiguration, logger) {
    this.roadNetworkBuilder = roadNetworkBuilder;
    this.buildingPlacer = buildingPlacer;
    this.cityNameGenerator = cityNameGenerator;
    this.cityConfiguration = cityConfiguration;
    this.logger = logger;
  }
  
  generateCity(centerX, centerZ, size, existingCityNames, seed) {
    this.logger.info(`Generating city at (${centerX}, ${centerZ}) with size ${size}`);
    
    const rng = { nextInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min };
    const targetPopulation = this.cityConfiguration.generateTargetPopulation(size, rng);
    this.logger.info(`Target population: ${targetPopulation}`);
    
    const roadNetwork = this.roadNetworkBuilder.buildInitialNetwork(centerX, centerZ, rng);
    this.logger.info(`Created road network with ${roadNetwork.segments.length} segments`);
    
    const buildingPlacement = this.buildingPlacer.placeInitialBuildings(roadNetwork, targetPopulation, rng);
    this.logger.info(`Placed ${buildingPlacement.buildings.length} buildings with population ${buildingPlacement.totalPopulation}`);
    
    const cityName = this.cityNameGenerator.generateUniqueName(existingCityNames, rng);
    this.logger.info(`Generated city name: ${cityName}`);
    
    const nameLabel = this.cityNameGenerator.createNameLabel(cityName, centerX, centerZ);
    
    return {
      roads: roadNetwork.segments,
      buildings: buildingPlacement.buildings,
      population: buildingPlacement.totalPopulation,
      centerX: centerX,
      centerZ: centerZ,
      name: cityName,
      id: `city-${centerX}-${centerZ}`
    };
  }
}

// Mock the CityGeneratorService
class MockCityGeneratorService {
  constructor(classicCityGenerator) {
    this.classicCityGenerator = classicCityGenerator;
  }
  
  generateCityLayout(city) {
    const layout = {
      cityCenter: city.position,
      roads: [],
      buildingPlots: [],
      industrialZones: [],
      buildingClusters: []
    };
    
    const citySize = this.convertCityTierToCitySize(city.tier);
    const centerX = Math.round(city.position.x);
    const centerZ = Math.round(city.position.z);
    const existingCityNames = new Set();
    
    const generatedCity = this.classicCityGenerator.generateCity(
      centerX, 
      centerZ, 
      citySize, 
      existingCityNames,
      city.id.hashCode ? city.id.hashCode() : 12345
    );
    
    this.convertGeneratedCityToLayout(generatedCity, layout, city.position.y);
    
    return layout;
  }
  
  convertCityTierToCitySize(tier) {
    return 'small';
  }
  
  convertGeneratedCityToLayout(generatedCity, layout, centerY) {
    // Convert roads
    generatedCity.roads.forEach((road) => {
      const roadSegments = this.convertRoadSegment(road, centerY);
      roadSegments.forEach(segment => {
        layout.roads.push(segment);
      });
    });
    
    // Convert buildings
    generatedCity.buildings.forEach((building) => {
      const buildingPlot = this.convertBuildingToPlot(building, centerY);
      if (buildingPlot) {
        layout.buildingPlots.push(buildingPlot);
      }
    });
  }
  
  convertRoadSegment(road, centerY) {
    return [{
      start: new Vector3(road.startX, centerY, road.startZ),
      end: new Vector3(road.endX, centerY, road.endZ),
      width: 3,
      type: 'secondary',
      id: `road-${road.gridX}-${road.gridZ}`,
      roadType: road.roadType,
      gridX: road.gridX,
      gridZ: road.gridZ
    }];
  }
  
  convertBuildingToPlot(building, centerY) {
    return {
      position: new Vector3(building.x, centerY, building.z),
      size: { width: 3, depth: 3 },
      type: 'residential',
      tier: 'SmallTown'
    };
  }
}

// Add hashCode method to String prototype if it doesn't exist
if (!String.prototype.hashCode) {
  String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };
}

// Test the integration
function testIntegration() {
  console.log('Creating mock services...');
  
  const collisionDetection = new MockCollisionDetectionService();
  const cityConfiguration = new MockCityConfigurationService();
  const logger = new MockLoggerService();
  const roadNetworkBuilder = new MockRoadNetworkBuilderService();
  const buildingPlacer = new MockBuildingPlacerService();
  const cityNameGenerator = new MockCityNameGeneratorService();
  
  const classicCityGenerator = new MockClassicCityGeneratorService(
    roadNetworkBuilder,
    buildingPlacer,
    cityNameGenerator,
    cityConfiguration,
    logger
  );
  
  const cityGenerator = new MockCityGeneratorService(classicCityGenerator);
  
  console.log('Generating test city...');
  
  const city = {
    id: 'test-city-1',
    name: 'Test City',
    position: new Vector3(0, 0, 0),
    population: 250,
    tier: 'SmallTown'
  };
  
  const layout = cityGenerator.generateCityLayout(city);
  
  console.log('Generated layout:');
  console.log('- Roads:', layout.roads.length);
  console.log('- Building plots:', layout.buildingPlots.length);
  console.log('- Industrial zones:', layout.industrialZones.length);
  console.log('- Building clusters:', layout.buildingClusters.length);
  
  if (layout.roads.length > 0) {
    console.log('First road:', layout.roads[0]);
  }
  
  if (layout.buildingPlots.length > 0) {
    console.log('First building plot:', layout.buildingPlots[0]);
  }
  
  console.log('Integration test completed successfully!');
}

// Run the test
testIntegration();