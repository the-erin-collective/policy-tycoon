/**
 * Performance benchmarks for generation time limits
 * These tests verify that the city generation performs within acceptable time limits
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
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';
import { CityTier } from '../../data/models/enums';
import { City } from '../../data/models/core-entities';
import { SiteFinderService } from '../../application/services/site-finder.service'; // NEW: Import site finder service

describe('Performance Benchmarks for City Generation', () => {
  let cityGenerator: CityGeneratorService;
  
  beforeEach(() => {
    // Create services
    const logger = new GenerationLoggerService();
    const terrainGeneration = new TerrainGenerationService(logger); // NEW: Create terrain service
    const collisionDetection = new CollisionDetectionService(terrainGeneration); // FIXED: Pass terrain service
    const cityConfiguration = new CityConfigurationService();
    const roadNetworkBuilder = new RecursiveRoadBuilderService(collisionDetection, logger, terrainGeneration); // Using recursive road builder
    const buildingPlacer = new BuildingPlacerService(collisionDetection, cityConfiguration, logger, terrainGeneration); // NEW: Provide terrain service
    const cityNameGenerator = new CityNameGeneratorService();
    const siteFinder = new SiteFinderService(terrainGeneration, collisionDetection); // NEW: Create site finder
    const classicCityGenerator = new ClassicCityGeneratorService(
      roadNetworkBuilder,
      buildingPlacer,
      cityNameGenerator,
      cityConfiguration,
      logger,
      terrainGeneration, // NEW: Provide terrain service
      siteFinder // NEW: Provide site finder service
    );
    
    cityGenerator = new CityGeneratorService(classicCityGenerator, terrainGeneration, collisionDetection); // NEW: Provide all required services
  });

  it('should generate small towns within 100ms', () => {
    // Arrange
    const city: City = {
      id: 'performance-small',
      name: 'Performance Small Town',
      position: new Vector3(0, 0, 0),
      population: 200,
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
    const startTime = performance.now();
    const layout = cityGenerator.generateCityLayout(city);
    const endTime = performance.now();
    
    const generationTime = endTime - startTime;

    // Assert
    expect(generationTime).toBeLessThan(100); // Should be less than 100ms
    
    console.log(`Small town generation time: ${generationTime.toFixed(2)}ms`);
    console.log(`Generated ${layout.roads.length} roads and ${layout.buildingPlots.length} buildings`);
  });

  it('should generate growing towns within 200ms', () => {
    // Arrange
    const city: City = {
      id: 'performance-growing',
      name: 'Performance Growing Town',
      position: new Vector3(0, 0, 0),
      population: 400,
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
    const startTime = performance.now();
    const layout = cityGenerator.generateCityLayout(city);
    const endTime = performance.now();
    
    const generationTime = endTime - startTime;

    // Assert
    expect(generationTime).toBeLessThan(200); // Should be less than 200ms
    
    console.log(`Growing town generation time: ${generationTime.toFixed(2)}ms`);
    console.log(`Generated ${layout.roads.length} roads and ${layout.buildingPlots.length} buildings`);
  });

  it('should generate urban centers within 500ms', () => {
    // Arrange
    const city: City = {
      id: 'performance-urban',
      name: 'Performance Urban Center',
      position: new Vector3(0, 0, 0),
      population: 600,
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
    const startTime = performance.now();
    const layout = cityGenerator.generateCityLayout(city);
    const endTime = performance.now();
    
    const generationTime = endTime - startTime;

    // Assert
    expect(generationTime).toBeLessThan(500); // Should be less than 500ms
    
    console.log(`Urban center generation time: ${generationTime.toFixed(2)}ms`);
    console.log(`Generated ${layout.roads.length} roads and ${layout.buildingPlots.length} buildings`);
  });

  it('should generate metropolises within 1000ms', () => {
    // Arrange
    const city: City = {
      id: 'performance-metro',
      name: 'Performance Metropolis',
      position: new Vector3(0, 0, 0),
      population: 800,
      tier: CityTier.Metropolis,
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
    const startTime = performance.now();
    const layout = cityGenerator.generateCityLayout(city);
    const endTime = performance.now();
    
    const generationTime = endTime - startTime;

    // Assert
    expect(generationTime).toBeLessThan(1000); // Should be less than 1000ms
    
    console.log(`Metropolis generation time: ${generationTime.toFixed(2)}ms`);
    console.log(`Generated ${layout.roads.length} roads and ${layout.buildingPlots.length} buildings`);
  });

  it('should maintain consistent performance across multiple generations', () => {
    // Arrange
    const cities: City[] = [
      {
        id: 'perf-1',
        name: 'Performance Test 1',
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
        id: 'perf-2',
        name: 'Performance Test 2',
        position: new Vector3(10, 0, 10),
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
      },
      {
        id: 'perf-3',
        name: 'Performance Test 3',
        position: new Vector3(20, 0, 20),
        population: 500,
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
      }
    ];

    const generationTimes: number[] = [];
    
    // Act
    for (const city of cities) {
      const startTime = performance.now();
      const layout = cityGenerator.generateCityLayout(city);
      const endTime = performance.now();
      
      const generationTime = endTime - startTime;
      generationTimes.push(generationTime);
      
      console.log(`City ${city.id} generation time: ${generationTime.toFixed(2)}ms`);
    }

    // Calculate average generation time
    const averageTime = generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length;
    
    // Calculate standard deviation
    const variance = generationTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / generationTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Assert
    expect(averageTime).toBeLessThan(500); // Average should be less than 500ms
    expect(standardDeviation).toBeLessThan(200); // Standard deviation should be reasonable
    
    console.log(`Average generation time: ${averageTime.toFixed(2)}ms ± ${standardDeviation.toFixed(2)}ms`);
  });

  it('should not have significant performance degradation with repeated calls', () => {
    // Arrange
    const city: City = {
      id: 'perf-repeated',
      name: 'Repeated Performance Test',
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

    const generationTimes: number[] = [];
    const numGenerations = 10;

    // Act
    for (let i = 0; i < numGenerations; i++) {
      const startTime = performance.now();
      const layout = cityGenerator.generateCityLayout(city);
      const endTime = performance.now();
      
      const generationTime = endTime - startTime;
      generationTimes.push(generationTime);
    }

    // Calculate first half and second half averages
    const firstHalf = generationTimes.slice(0, numGenerations / 2);
    const secondHalf = generationTimes.slice(numGenerations / 2);
    
    const firstHalfAverage = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const secondHalfAverage = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
    
    // Calculate the percentage increase from first to second half
    const percentageIncrease = ((secondHalfAverage - firstHalfAverage) / firstHalfAverage) * 100;

    // Assert
    // Performance should not degrade by more than 50% between first and second half
    expect(percentageIncrease).toBeLessThan(50);
    
    console.log(`First half average: ${firstHalfAverage.toFixed(2)}ms`);
    console.log(`Second half average: ${secondHalfAverage.toFixed(2)}ms`);
    console.log(`Performance change: ${percentageIncrease.toFixed(2)}%`);
  });
});