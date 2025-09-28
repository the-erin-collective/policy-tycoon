/**
 * Classic City Generator Service for OpenTTD-style City Generation
 * 
 * Main orchestrator that coordinates all components to generate complete cities
 * with roads, buildings, population, and name labels following OpenTTD's classic algorithm.
 * Uses Angular signals for reactive state management in zoneless mode.
 */

import { Injectable, signal, computed } from '@angular/core';
import { 
  ClassicCityGenerator, 
  GeneratedCity, 
  CitySize, 
  SeededRandom 
} from '../../data/models/city-generation';
import { RecursiveRoadBuilderService } from './recursive-road-builder.service';
import { BuildingPlacerService } from './building-placer.service';
import { CityNameGeneratorService } from './city-name-generator.service';
import { CityConfigurationService } from './city-configuration.service';
import { GenerationLoggerService } from './generation-logger.service';
import { SeededRandom as SeededRandomImpl } from '../../utils/seeded-random';
import { TerrainGenerationService } from './terrain-generation.service'; // NEW: Import terrain service

@Injectable({
  providedIn: 'root'
})
export class ClassicCityGeneratorService implements ClassicCityGenerator {
  
  // Signals for reactive state management
  private readonly _generatedCities = signal<GeneratedCity[]>([]);
  private readonly _isGenerating = signal<boolean>(false);
  private readonly _lastGenerationStats = signal<{
    roadCount: number;
    buildingCount: number;
    populationDensity: number;
    averageBuildingPopulation: number;
  } | null>(null);

  // Computed signals for derived state
  readonly generatedCities = this._generatedCities.asReadonly();
  readonly isGenerating = this._isGenerating.asReadonly();
  readonly lastGenerationStats = this._lastGenerationStats.asReadonly();
  readonly totalCitiesGenerated = computed(() => this._generatedCities().length);
  readonly totalPopulation = computed(() => 
    this._generatedCities().reduce((sum, city) => sum + city.population, 0)
  );

  constructor(
    private roadNetworkBuilder: RecursiveRoadBuilderService,
    private buildingPlacer: BuildingPlacerService,
    private cityNameGenerator: CityNameGeneratorService,
    private cityConfiguration: CityConfigurationService,
    private logger: GenerationLoggerService,
    private terrainGeneration: TerrainGenerationService // NEW: Inject terrain service
  ) {}

  /**
   * Generate a complete city with roads, buildings, population, and name
   * Requirements: 4.2, 5.5, 7.1, 7.2, 10.1, 10.2, 10.3, 10.4
   */
  generateCity(
    centerX: number, 
    centerZ: number, 
    size: CitySize, 
    existingCityNames: Set<string>, 
    seed?: number
  ): GeneratedCity {
    // Set generating state
    this._isGenerating.set(true);
    
    // Initialize seeded random number generator
    const rng: SeededRandom = new SeededRandomImpl(seed || Date.now());
    
    // Requirement 10.3 - Create logging system for generation steps and issues
    this.logger.info(`Starting city generation at (${centerX}, ${centerZ}) with size ${size} and seed ${seed}`);
    
    try {
      // Requirement 10.4 - Handle edge cases like invalid center points
      this.validateGenerationParameters(centerX, centerZ, size, existingCityNames);
      
      // Step 1: Generate target population based on city size
      const targetPopulation = this.cityConfiguration.generateTargetPopulation(size, rng);
      this.logger.info(`Generated target population: ${targetPopulation}`);
      
      // Step 2: Build initial road network
      this.logger.info('Building initial road network');
      const roadNetwork = this.roadNetworkBuilder.buildInitialNetwork(centerX, centerZ, rng);
      this.logger.info(`Road network built with ${roadNetwork.segments.length} segments`);
      
      // Requirement 10.4 - Handle edge cases like unreachable populations
      if (roadNetwork.segments.length === 0) {
        this.logger.warn('No road network generated, attempting to continue with empty network');
      }
      
      // Step 3: Place buildings to reach target population
      this.logger.info(`Placing buildings to reach target population of ${targetPopulation}`);
      const buildingPlacement = this.buildingPlacer.placeInitialBuildings(
        roadNetwork, 
        targetPopulation, 
        rng
      );
      this.logger.info(`Building placement complete with ${buildingPlacement.buildings.length} buildings and population ${buildingPlacement.totalPopulation}`);
      
      // Requirement 10.2 - Add fallback logic when building placement targets cannot be met
      if (buildingPlacement.totalPopulation < targetPopulation * 0.5) { // Less than 50% of target
        this.logger.warn(`Only achieved ${Math.round((buildingPlacement.totalPopulation/targetPopulation)*100)}% of target population`);
      }
      
      // Step 4: Generate unique city name
      this.logger.info('Generating unique city name');
      const cityName = this.cityNameGenerator.generateUniqueName(existingCityNames, rng);
      this.logger.info(`Generated city name: ${cityName}`);
      
      // Step 5: Create name label above city center
      this.logger.info('Creating name label');
      const nameLabel = this.cityNameGenerator.createNameLabel(cityName, centerX, centerZ);
      
      // Step 6: Generate unique city ID
      const cityId = this.generateCityId(cityName, centerX, centerZ, rng);
      this.logger.info(`Generated city ID: ${cityId}`);
      
      // Step 7: Create and return GeneratedCity object
      const generatedCity: GeneratedCity = {
        roads: roadNetwork.segments,
        buildings: buildingPlacement.buildings,
        population: buildingPlacement.totalPopulation,
        centerX: centerX,
        centerZ: centerZ,
        name: cityName,
        id: cityId
      };
      
      // Update signals with new city and stats
      this._generatedCities.update(cities => [...cities, generatedCity]);
      this._lastGenerationStats.set(this.getGenerationStats(generatedCity));
      
      this.logger.info(`City generation complete: ${cityName} at (${centerX}, ${centerZ}) with population ${generatedCity.population}`);
      
      return generatedCity;
      
    } catch (error) {
      // Handle generation errors gracefully
      this.logger.error(`Error generating city at (${centerX}, ${centerZ}):`, error);
      
      // Return minimal city with error handling
      const fallbackCity = this.createFallbackCity(centerX, centerZ, existingCityNames, rng);
      this._generatedCities.update(cities => [...cities, fallbackCity]);
      
      // Requirement 10.3 - Log error scenarios
      this.logger.warn(`Returning fallback city due to generation error at (${centerX}, ${centerZ})`);
      
      return fallbackCity;
    } finally {
      // Clear generating state
      this._isGenerating.set(false);
    }
  }

  /**
   * Generate a unique city ID based on name, position, and random seed
   */
  private generateCityId(cityName: string, centerX: number, centerZ: number, rng: SeededRandom): string {
    const nameHash = this.hashString(cityName);
    const positionHash = (centerX * 1000 + centerZ) % 10000;
    const randomSuffix = rng.nextInt(1000, 9999);
    
    return `city_${nameHash}_${positionHash}_${randomSuffix}`;
  }

  /**
   * Simple string hash function for city ID generation
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 10000;
  }

  /**
   * Create a fallback city when generation fails
   */
  private createFallbackCity(
    centerX: number, 
    centerZ: number, 
    existingCityNames: Set<string>, 
    rng: SeededRandom
  ): GeneratedCity {
    try {
      // Generate a simple fallback name
      const fallbackName = this.cityNameGenerator.generateUniqueName(existingCityNames, rng);
      
      // Create minimal city with just the center point
      const fallbackCity: GeneratedCity = {
        roads: [],
        buildings: [],
        population: 0,
        centerX: centerX,
        centerZ: centerZ,
        name: fallbackName,
        id: this.generateCityId(fallbackName, centerX, centerZ, rng)
      };
      
      // Try to create name label
      try {
        this.cityNameGenerator.createNameLabel(fallbackName, centerX, centerZ);
      } catch (labelError) {
        console.warn('Failed to create name label for fallback city:', labelError);
      }
      
      return fallbackCity;
      
    } catch (fallbackError) {
      console.error('Failed to create fallback city:', fallbackError);
      
      // Return absolute minimal city
      return {
        roads: [],
        buildings: [],
        population: 0,
        centerX: centerX,
        centerZ: centerZ,
        name: `City_${centerX}_${centerZ}`,
        id: `fallback_${centerX}_${centerZ}_${Date.now()}`
      };
    }
  }

  /**
   * Validate city generation parameters
   * Requirements: 10.4
   */
  private validateGenerationParameters(
    centerX: number, 
    centerZ: number, 
    size: CitySize, 
    existingCityNames: Set<string>
  ): void {
    this.logger.info(`Validating generation parameters: center=(${centerX}, ${centerZ}), size=${size}`);
    
    // Requirement 10.4 - Handle edge cases like invalid center points
    if (!Number.isInteger(centerX) || !Number.isInteger(centerZ)) {
      const error = new Error(`City center coordinates must be integers. Received: (${centerX}, ${centerZ})`);
      this.logger.error('Invalid center coordinates', error);
      throw error;
    }
    
    // Check bounds
    const mapBounds = this.roadNetworkBuilder.getMapBounds();
    if (centerX < mapBounds.minX || centerX > mapBounds.maxX || 
        centerZ < mapBounds.minZ || centerZ > mapBounds.maxZ) {
      const error = new Error(`City center coordinates (${centerX}, ${centerZ}) are outside map bounds`);
      this.logger.error('Center coordinates outside bounds', error);
      throw error;
    }
    
    // Check if size is a valid CitySize enum value
    const validSizes = Object.values(CitySize);
    if (!validSizes.includes(size)) {
      const error = new Error(`Invalid city size: ${size}`);
      this.logger.error('Invalid city size', error);
      throw error;
    }
    
    if (!(existingCityNames instanceof Set)) {
      const error = new Error('existingCityNames must be a Set');
      this.logger.error('Invalid existingCityNames type', error);
      throw error;
    }
    
    this.logger.info('Generation parameters validated successfully');
  }

  /**
   * Get generation statistics for debugging and monitoring
   */
  getGenerationStats(city: GeneratedCity): {
    roadCount: number;
    buildingCount: number;
    populationDensity: number;
    averageBuildingPopulation: number;
  } {
    const roadCount = city.roads.length;
    const buildingCount = city.buildings.length;
    const populationDensity = buildingCount > 0 ? city.population / buildingCount : 0;
    const averageBuildingPopulation = buildingCount > 0 ? city.population / buildingCount : 0;
    
    return {
      roadCount,
      buildingCount,
      populationDensity,
      averageBuildingPopulation
    };
  }

  /**
   * Clear all generated cities from state
   */
  clearGeneratedCities(): void {
    this._generatedCities.set([]);
    this._lastGenerationStats.set(null);
  }

  /**
   * Remove a specific city by ID
   */
  removeCity(cityId: string): void {
    this._generatedCities.update(cities => 
      cities.filter(city => city.id !== cityId)
    );
  }

  /**
   * Get a city by ID using signals
   */
  getCityById(cityId: string): GeneratedCity | undefined {
    return this._generatedCities().find(city => city.id === cityId);
  }

  /**
   * Get cities by size using computed signal
   */
  getCitiesBySize(size: CitySize) {
    return computed(() => {
      const sizeRanges = {
        [CitySize.Small]: { min: 150, max: 300 },
        [CitySize.Medium]: { min: 300, max: 500 },
        [CitySize.Large]: { min: 500, max: 800 }
      };
      
      const range = sizeRanges[size];
      return this._generatedCities().filter(city => 
        city.population >= range.min && city.population <= range.max
      );
    });
  }
}