/**
 * CityConfiguration service for OpenTTD-style city generation
 * Manages population ranges, building types, and building selection logic
 */

import { Injectable } from '@angular/core';
import { CitySize, BuildingType, CityConfiguration, SeededRandom } from '../../data/models/city-generation';

@Injectable({
  providedIn: 'root'
})
export class CityConfigurationService implements CityConfiguration {
  
  // Building type database with population values
  private readonly buildingTypes: BuildingType[] = [
    {
      id: 'small_house_1',
      name: 'Small House',
      population: 8,
      width: 1,
      height: 1
    },
    {
      id: 'small_house_2',
      name: 'Small Cottage',
      population: 8,
      width: 1,
      height: 1
    },
    {
      id: 'medium_house_1',
      name: 'Medium House',
      population: 16,
      width: 1,
      height: 1
    },
    {
      id: 'medium_house_2',
      name: 'Family Home',
      population: 16,
      width: 1,
      height: 1
    },
    {
      id: 'apartment_1',
      name: 'Small Apartment',
      population: 30,
      width: 1,
      height: 2
    },
    {
      id: 'apartment_2',
      name: 'Apartment Building',
      population: 30,
      width: 1,
      height: 2
    },
    {
      id: 'large_apartment',
      name: 'Large Apartment Complex',
      population: 45,
      width: 2,
      height: 2
    },
    {
      id: 'townhouse_1',
      name: 'Townhouse',
      population: 20,
      width: 1,
      height: 1
    },
    {
      id: 'townhouse_2',
      name: 'Row House',
      population: 20,
      width: 1,
      height: 1
    }
  ];

  // Population ranges for different city sizes
  private readonly populationRanges = {
    [CitySize.Small]: { min: 150, max: 300 },
    [CitySize.Medium]: { min: 300, max: 500 },
    [CitySize.Large]: { min: 500, max: 800 }
  };

  /**
   * Get population range for specified city size
   * @param size City size (Small, Medium, Large)
   * @returns Object with min and max population values
   */
  getPopulationRange(size: CitySize): { min: number; max: number } {
    const range = this.populationRanges[size];
    if (!range) {
      throw new Error(`Invalid city size: ${size}`);
    }
    return { ...range }; // Return copy to prevent mutation
  }

  /**
   * Get all available building types
   * @returns Array of all building type definitions
   */
  getBuildingTypes(): BuildingType[] {
    return [...this.buildingTypes]; // Return copy to prevent mutation
  }

  /**
   * Select a random building type using seeded randomization
   * @param rng Seeded random number generator
   * @returns Randomly selected building type
   */
  selectRandomBuilding(rng: SeededRandom): BuildingType {
    if (this.buildingTypes.length === 0) {
      throw new Error('No building types available for selection');
    }
    return rng.selectFromArray(this.buildingTypes);
  }

  /**
   * Get building types filtered by population range
   * Useful for selecting appropriate buildings for city size
   * @param minPopulation Minimum population per building
   * @param maxPopulation Maximum population per building
   * @returns Array of building types within population range
   */
  getBuildingTypesByPopulation(minPopulation: number, maxPopulation: number): BuildingType[] {
    return this.buildingTypes.filter(
      building => building.population >= minPopulation && building.population <= maxPopulation
    );
  }

  /**
   * Select random building with population constraints
   * @param rng Seeded random number generator
   * @param minPopulation Minimum population per building
   * @param maxPopulation Maximum population per building
   * @returns Randomly selected building type within population range
   */
  selectRandomBuildingByPopulation(
    rng: SeededRandom, 
    minPopulation: number, 
    maxPopulation: number
  ): BuildingType {
    const filteredBuildings = this.getBuildingTypesByPopulation(minPopulation, maxPopulation);
    if (filteredBuildings.length === 0) {
      throw new Error(`No building types available with population between ${minPopulation} and ${maxPopulation}`);
    }
    return rng.selectFromArray(filteredBuildings);
  }

  /**
   * Get building type by ID
   * @param id Building type identifier
   * @returns Building type or undefined if not found
   */
  getBuildingTypeById(id: string): BuildingType | undefined {
    return this.buildingTypes.find(building => building.id === id);
  }

  /**
   * Calculate target population for city size using seeded randomization
   * @param size City size
   * @param rng Seeded random number generator
   * @returns Random target population within size range
   */
  generateTargetPopulation(size: CitySize, rng: SeededRandom): number {
    const range = this.getPopulationRange(size);
    return rng.nextIntInclusive(range.min, range.max);
  }
}