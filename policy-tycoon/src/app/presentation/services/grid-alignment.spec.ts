/**
 * Grid alignment verification tests
 * These tests verify that roads and buildings are properly aligned to the grid
 */

// Converted from Vitest to Jasmine (Karma)
import { Vector3 } from '@babylonjs/core';
import { CityGeneratorService } from './city-generator.service';
import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { RecursiveRoadBuilderService } from '../../application/services/recursive-road-builder.service';
import { BuildingPlacerService } from '../../application/services/building-placer.service';
import { CityNameGeneratorService } from '../../application/services/city-name-generator.service';
import { CityConfigurationService } from '../../application/services/city-configuration.service';
import { CollisionDetectionService } from '../../application/services/collision-detection.service';
import { GenerationLoggerService } from '../../application/services/generation-logger.service';
import { CityTier } from '../../data/models/enums';
import { City } from '../../data/models/core-entities';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';

describe('Grid Alignment Verification', () => {
  let cityGenerator: CityGeneratorService;
  
  beforeEach(() => {
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
    
    cityGenerator = new CityGeneratorService(classicCityGenerator, terrainGeneration, collisionDetection);
  });

  it('should generate roads aligned to integer grid coordinates', () => {
    // Arrange
    const city: City = {
      id: 'grid-roads',
      name: 'Grid Roads City',
      position: new Vector3(0, 0, 0),
      population: 300,
      tier: CityTier.GrowingTown,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout.roads.length).toBeGreaterThan(0);
    
    // Check that all road grid coordinates are integers
    let properlyAlignedRoads = 0;
    
    for (const road of layout.roads) {
      if (Number.isInteger(road.gridX) && Number.isInteger(road.gridZ)) {
        properlyAlignedRoads++;
      } else {
        console.warn(`Road not aligned to grid: gridX=${road.gridX}, gridZ=${road.gridZ}`);
      }
    }
    
    // All roads should be grid-aligned
    expect(properlyAlignedRoads).toBe(layout.roads.length);
    
    console.log(`All ${layout.roads.length} roads are properly grid-aligned`);
  });

  it('should generate buildings aligned to integer grid coordinates', () => {
    // Arrange
    const city: City = {
      id: 'grid-buildings',
      name: 'Grid Buildings City',
      position: new Vector3(0, 0, 0),
      population: 250,
      tier: CityTier.SmallTown,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout.buildingPlots.length).toBeGreaterThan(0);
    
    // Check that all building positions correspond to integer grid coordinates
    // We'll check if the positions are close to integer values (within a small tolerance)
    let properlyAlignedBuildings = 0;
    const tolerance = 0.1; // Allow small floating point errors
    
    for (const building of layout.buildingPlots) {
      const x = building.position.x;
      const z = building.position.z;
      
      // Check if coordinates are close to integers
      if (Math.abs(x - Math.round(x)) < tolerance && Math.abs(z - Math.round(z)) < tolerance) {
        properlyAlignedBuildings++;
      } else {
        console.warn(`Building not aligned to grid: x=${x}, z=${z}`);
      }
    }
    
    // Most buildings should be grid-aligned (allowing for some floating point precision issues)
    const alignmentPercentage = (properlyAlignedBuildings / layout.buildingPlots.length) * 100;
    expect(alignmentPercentage).toBeGreaterThan(95); // At least 95% should be aligned
    
    console.log(`${properlyAlignedBuildings}/${layout.buildingPlots.length} buildings (${alignmentPercentage.toFixed(1)}%) are properly grid-aligned`);
  });

  it('should maintain consistent grid spacing between road segments', () => {
    // Arrange
    const city: City = {
      id: 'grid-spacing',
      name: 'Grid Spacing City',
      position: new Vector3(0, 0, 0),
      population: 400,
      tier: CityTier.UrbanCentre,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout.roads.length).toBeGreaterThan(5);
    
    // Check horizontal roads for consistent spacing
    const horizontalRoads = layout.roads.filter(road => road.roadType === 'horizontal');
    const verticalRoads = layout.roads.filter(road => road.roadType === 'vertical');
    
    // Verify that roads are spaced consistently
    if (horizontalRoads.length > 1) {
      // Check that horizontal roads are aligned on the Z axis at consistent intervals
      const zPositions = horizontalRoads.map(road => road.start.z);
      const uniqueZPositions = [...new Set(zPositions.map(pos => Math.round(pos)))].sort((a, b) => a - b);
      
      // Check for consistent spacing (allowing for some variation)
      if (uniqueZPositions.length > 2) {
        const spacings = [];
        for (let i = 1; i < uniqueZPositions.length; i++) {
          spacings.push(uniqueZPositions[i] - uniqueZPositions[i - 1]);
        }
        
        // Most spacings should be similar (within a tolerance)
        const averageSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
        const variance = spacings.reduce((sum, spacing) => sum + Math.pow(spacing - averageSpacing, 2), 0) / spacings.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Standard deviation should be relatively small compared to average spacing
        expect(standardDeviation / averageSpacing).toBeLessThan(0.5);
        
        console.log(`Horizontal road spacing: average=${averageSpacing.toFixed(2)}, stdDev=${standardDeviation.toFixed(2)}`);
      }
    }
    
    if (verticalRoads.length > 1) {
      // Check that vertical roads are aligned on the X axis at consistent intervals
      const xPositions = verticalRoads.map(road => road.start.x);
      const uniqueXPositions = [...new Set(xPositions.map(pos => Math.round(pos)))].sort((a, b) => a - b);
      
      // Check for consistent spacing
      if (uniqueXPositions.length > 2) {
        const spacings = [];
        for (let i = 1; i < uniqueXPositions.length; i++) {
          spacings.push(uniqueXPositions[i] - uniqueXPositions[i - 1]);
        }
        
        // Most spacings should be similar (within a tolerance)
        const averageSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
        const variance = spacings.reduce((sum, spacing) => sum + Math.pow(spacing - averageSpacing, 2), 0) / spacings.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Standard deviation should be relatively small compared to average spacing
        expect(standardDeviation / averageSpacing).toBeLessThan(0.5);
        
        console.log(`Vertical road spacing: average=${averageSpacing.toFixed(2)}, stdDev=${standardDeviation.toFixed(2)}`);
      }
    }
    
    console.log(`Verified grid spacing for ${horizontalRoads.length} horizontal and ${verticalRoads.length} vertical roads`);
  });

  it('should generate road networks with proper grid-based intersections', () => {
    // Arrange
    const city: City = {
      id: 'grid-intersections',
      name: 'Grid Intersections City',
      position: new Vector3(0, 0, 0),
      population: 350,
      tier: CityTier.GrowingTown,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout.roads.length).toBeGreaterThan(4);
    
    // Find intersections (points where roads meet)
    const intersections = new Map<string, { x: number; z: number; roads: any[] }>();
    
    // Look for roads that share the same grid coordinates
    for (const road of layout.roads) {
      const key = `${road.gridX},${road.gridZ}`;
      if (!intersections.has(key)) {
        intersections.set(key, { x: road.gridX, z: road.gridZ, roads: [] });
      }
      intersections.get(key)!.roads.push(road);
    }
    
    // Count how many intersections have multiple roads (true intersections)
    let trueIntersections = 0;
    let totalIntersections = 0;
    
    intersections.forEach(intersection => {
      totalIntersections++;
      if (intersection.roads.length > 1) {
        trueIntersections++;
      }
    });
    
    // There should be a reasonable number of intersections
    expect(trueIntersections).toBeGreaterThan(0);
    expect(totalIntersections).toBeGreaterThan(2);
    
    // Most intersections should be at integer grid coordinates
    let properlyAlignedIntersections = 0;
    intersections.forEach(intersection => {
      if (Number.isInteger(intersection.x) && Number.isInteger(intersection.z)) {
        properlyAlignedIntersections++;
      }
    });
    
    const alignmentPercentage = (properlyAlignedIntersections / totalIntersections) * 100;
    expect(alignmentPercentage).toBeGreaterThan(90); // At least 90% should be aligned
    
    console.log(`Found ${totalIntersections} intersections, ${trueIntersections} with multiple roads, ${alignmentPercentage.toFixed(1)}% properly aligned`);
  });

  it('should maintain grid alignment consistency across different city generations', () => {
    // Arrange
    const cities: City[] = [
      {
        id: 'consistency-1',
        name: 'Consistency City 1',
        position: new Vector3(0, 0, 0),
        population: 250,
        tier: CityTier.SmallTown,
        currentNeeds: [],
        unmetNeeds: [],
        needSatisfactionHistory: [],
        ideology: {
          progressive: 50,
          conservative: 50,
          driftRate: 0,
          lastUpdated: new Date()
        },
        approvalRating: 50,
        costOfLiving: 100,
        averageWage: 50,
        unemployment: 5,
        connectedTransport: [],
        availableServices: []
      },
      {
        id: 'consistency-2',
        name: 'Consistency City 2',
        position: new Vector3(100, 0, 100),
        population: 300,
        tier: CityTier.GrowingTown,
        currentNeeds: [],
        unmetNeeds: [],
        needSatisfactionHistory: [],
        ideology: {
          progressive: 50,
          conservative: 50,
          driftRate: 0,
          lastUpdated: new Date()
        },
        approvalRating: 50,
        costOfLiving: 100,
        averageWage: 50,
        unemployment: 5,
        connectedTransport: [],
        availableServices: []
      }
    ];

    // Act
    const layouts = cities.map(city => cityGenerator.generateCityLayout(city));

    // Assert
    layouts.forEach((layout, index) => {
      expect(layout.roads.length).toBeGreaterThan(0);
      expect(layout.buildingPlots.length).toBeGreaterThan(0);
      
      // Check road alignment
      let properlyAlignedRoads = 0;
      for (const road of layout.roads) {
        if (Number.isInteger(road.gridX) && Number.isInteger(road.gridZ)) {
          properlyAlignedRoads++;
        }
      }
      
      const roadAlignmentPercentage = (properlyAlignedRoads / layout.roads.length) * 100;
      expect(roadAlignmentPercentage).toBeGreaterThan(95);
      
      // Check building alignment
      let properlyAlignedBuildings = 0;
      const tolerance = 0.1;
      for (const building of layout.buildingPlots) {
        const x = building.position.x;
        const z = building.position.z;
        if (Math.abs(x - Math.round(x)) < tolerance && Math.abs(z - Math.round(z)) < tolerance) {
          properlyAlignedBuildings++;
        }
      }
      
      const buildingAlignmentPercentage = (properlyAlignedBuildings / layout.buildingPlots.length) * 100;
      expect(buildingAlignmentPercentage).toBeGreaterThan(90);
      
      console.log(`City ${index + 1}: ${roadAlignmentPercentage.toFixed(1)}% roads, ${buildingAlignmentPercentage.toFixed(1)}% buildings aligned`);
    });
  });

  it('should generate buildings positioned adjacent to roads with proper grid alignment', () => {
    // Arrange
    const city: City = {
      id: 'adjacent-buildings',
      name: 'Adjacent Buildings City',
      position: new Vector3(0, 0, 0),
      population: 300,
      tier: CityTier.GrowingTown,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: {
        progressive: 50,
        conservative: 50,
        driftRate: 0,
        lastUpdated: new Date()
      },
      approvalRating: 50,
      costOfLiving: 100,
      averageWage: 50,
      unemployment: 5,
      connectedTransport: [],
      availableServices: []
    };

    // Act
    const layout = cityGenerator.generateCityLayout(city);

    // Assert
    expect(layout.buildingPlots.length).toBeGreaterThan(0);
    expect(layout.roads.length).toBeGreaterThan(0);
    
    // Check that buildings are positioned near roads and aligned to grid
    let buildingsNearRoads = 0;
    let properlyAlignedNearbyBuildings = 0;
    const maxDistance = 5; // Maximum distance from road for a building to be considered "near"
    const tolerance = 0.1; // Grid alignment tolerance
    
    for (const building of layout.buildingPlots) {
      let isNearRoad = false;
      
      // Check if building is near any road
      for (const road of layout.roads) {
        const distanceToStart = Vector3.Distance(building.position, road.start);
        const distanceToEnd = Vector3.Distance(building.position, road.end);
        
        if (distanceToStart <= maxDistance || distanceToEnd <= maxDistance) {
          isNearRoad = true;
          break;
        }
        
        // Also check distance to the line segment
        const distanceToSegment = distanceToLineSegment(building.position, road.start, road.end);
        if (distanceToSegment <= maxDistance) {
          isNearRoad = true;
          break;
        }
      }
      
      if (isNearRoad) {
        buildingsNearRoads++;
        
        // Check if this nearby building is also grid-aligned
        const x = building.position.x;
        const z = building.position.z;
        if (Math.abs(x - Math.round(x)) < tolerance && Math.abs(z - Math.round(z)) < tolerance) {
          properlyAlignedNearbyBuildings++;
        }
      }
    }
    
    // Most buildings near roads should be grid-aligned
    if (buildingsNearRoads > 0) {
      const percentage = (properlyAlignedNearbyBuildings / buildingsNearRoads) * 100;
      expect(percentage).toBeGreaterThan(80); // At least 80% of buildings near roads should be grid-aligned
      
      console.log(`${properlyAlignedNearbyBuildings}/${buildingsNearRoads} (${percentage.toFixed(1)}%) buildings near roads are grid-aligned`);
    }
    
    // Most buildings should be near roads in a classic city layout
    const nearRoadPercentage = (buildingsNearRoads / layout.buildingPlots.length) * 100;
    expect(nearRoadPercentage).toBeGreaterThan(70); // At least 70% of buildings should be near roads
    
    console.log(`${buildingsNearRoads}/${layout.buildingPlots.length} (${nearRoadPercentage.toFixed(1)}%) buildings are near roads`);
  });
});

// Helper function to calculate distance from point to line segment
function distanceToLineSegment(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
  const A = point.x - lineStart.x;
  const B = point.z - lineStart.z;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.z - lineStart.z;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));

  const xx = lineStart.x + param * C;
  const zz = lineStart.z + param * D;

  const dx = point.x - xx;
  const dz = point.z - zz;
  
  return Math.sqrt(dx * dx + dz * dz);
}