/**
 * Unit tests for CityConfigurationService
 * Tests population ranges, building selection, and seeded randomization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CityConfigurationService } from './city-configuration.service';
import { CitySize, BuildingType } from '../../data/models/city-generation';
import { SeededRandom as SeededRandomClass } from '../../utils/seeded-random';

describe('CityConfigurationService - Zoneless', () => {
  let service: CityConfigurationService;
  let seededRng: SeededRandomClass;

  beforeEach(() => {
    // Create service directly for zoneless mode
    service = new CityConfigurationService();
    seededRng = new SeededRandomClass(12345); // Fixed seed for deterministic tests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPopulationRange', () => {
    it('should return correct range for Small cities', () => {
      const range = service.getPopulationRange(CitySize.Small);
      expect(range.min).toBe(150);
      expect(range.max).toBe(300);
    });

    it('should return correct range for Medium cities', () => {
      const range = service.getPopulationRange(CitySize.Medium);
      expect(range.min).toBe(300);
      expect(range.max).toBe(500);
    });

    it('should return correct range for Large cities', () => {
      const range = service.getPopulationRange(CitySize.Large);
      expect(range.min).toBe(500);
      expect(range.max).toBe(800);
    });

    it('should return a copy of the range object', () => {
      const range1 = service.getPopulationRange(CitySize.Small);
      const range2 = service.getPopulationRange(CitySize.Small);
      expect(range1).not.toBe(range2); // Different object references
      expect(range1).toEqual(range2); // Same values
    });

    it('should throw error for invalid city size', () => {
      expect(() => service.getPopulationRange('invalid' as CitySize))
        .toThrowError(/Invalid city size: invalid/);
    });
  });

  describe('getBuildingTypes', () => {
    it('should return array of building types', () => {
      const buildingTypes = service.getBuildingTypes();
      expect(Array.isArray(buildingTypes)).toBe(true);
      expect(buildingTypes.length).toBeGreaterThan(0);
    });

    it('should return a copy of the building types array', () => {
      const types1 = service.getBuildingTypes();
      const types2 = service.getBuildingTypes();
      expect(types1).not.toBe(types2); // Different array references
      expect(types1).toEqual(types2); // Same contents
    });

    it('should include small houses with population 8', () => {
      const buildingTypes = service.getBuildingTypes();
      const smallHouses = buildingTypes.filter(b => b.population === 8);
      expect(smallHouses.length).toBeGreaterThan(0);
      expect(smallHouses.some(b => b.name.includes('Small House'))).toBe(true);
    });

    it('should include apartments with population 30', () => {
      const buildingTypes = service.getBuildingTypes();
      const apartments = buildingTypes.filter(b => b.population === 30);
      expect(apartments.length).toBeGreaterThan(0);
      expect(apartments.some(b => b.name.includes('Apartment'))).toBe(true);
    });

    it('should have valid building type structure', () => {
      const buildingTypes = service.getBuildingTypes();
      buildingTypes.forEach(building => {
        expect(building.id).toBeDefined();
        expect(typeof building.id).toBe('string');
        expect(building.name).toBeDefined();
        expect(typeof building.name).toBe('string');
        expect(building.population).toBeDefined();
        expect(typeof building.population).toBe('number');
        expect(building.population).toBeGreaterThan(0);
        expect(building.width).toBeDefined();
        expect(typeof building.width).toBe('number');
        expect(building.width).toBeGreaterThan(0);
        expect(building.height).toBeDefined();
        expect(typeof building.height).toBe('number');
        expect(building.height).toBeGreaterThan(0);
      });
    });
  });

  describe('selectRandomBuilding', () => {
    it('should return a valid building type', () => {
      const building = service.selectRandomBuilding(seededRng);
      expect(building).toBeDefined();
      expect(building.id).toBeDefined();
      expect(building.population).toBeGreaterThan(0);
    });

    it('should return deterministic results with same seed', () => {
      const rng1 = new SeededRandomClass(54321);
      const rng2 = new SeededRandomClass(54321);
      
      const building1 = service.selectRandomBuilding(rng1);
      const building2 = service.selectRandomBuilding(rng2);
      
      expect(building1.id).toBe(building2.id);
    });

    it('should return different results with different seeds', () => {
      const rng1 = new SeededRandomClass(11111);
      const rng2 = new SeededRandomClass(22222);
      
      const results1: string[] = [];
      const results2: string[] = [];
      
      // Generate multiple selections to increase chance of difference
      for (let i = 0; i < 10; i++) {
        results1.push(service.selectRandomBuilding(rng1).id);
        results2.push(service.selectRandomBuilding(rng2).id);
      }
      
      expect(results1).not.toEqual(results2);
    });

    it('should select from most available building types over multiple calls', () => {
      const allBuildings = service.getBuildingTypes();
      const selectedIds = new Set<string>();
      
      // Make many selections to try to hit most building types
      for (let i = 0; i < 1000; i++) {
        const rng = new SeededRandomClass(i);
        const building = service.selectRandomBuilding(rng);
        selectedIds.add(building.id);
      }
      
      // Should have selected a reasonable portion of building types (allowing for some randomness)
      expect(selectedIds.size).toBeGreaterThan(Math.floor(allBuildings.length * 0.4));
    });
  });

  describe('getBuildingTypesByPopulation', () => {
    it('should filter buildings by population range', () => {
      const buildings = service.getBuildingTypesByPopulation(8, 20);
      buildings.forEach(building => {
        expect(building.population).toBeGreaterThanOrEqual(8);
        expect(building.population).toBeLessThanOrEqual(20);
      });
    });

    it('should return empty array for impossible range', () => {
      const buildings = service.getBuildingTypesByPopulation(1000, 2000);
      expect(buildings).toEqual([]);
    });

    it('should include exact matches at boundaries', () => {
      const buildings = service.getBuildingTypesByPopulation(8, 8);
      expect(buildings.length).toBeGreaterThan(0);
      buildings.forEach(building => {
        expect(building.population).toBe(8);
      });
    });
  });

  describe('selectRandomBuildingByPopulation', () => {
    it('should select building within population range', () => {
      const building = service.selectRandomBuildingByPopulation(seededRng, 8, 20);
      expect(building.population).toBeGreaterThanOrEqual(8);
      expect(building.population).toBeLessThanOrEqual(20);
    });

    it('should throw error for impossible population range', () => {
      expect(() => service.selectRandomBuildingByPopulation(seededRng, 1000, 2000))
        .toThrowError(/No building types available with population between 1000 and 2000/);
    });

    it('should be deterministic with same seed', () => {
      const rng1 = new SeededRandomClass(98765);
      const rng2 = new SeededRandomClass(98765);
      
      const building1 = service.selectRandomBuildingByPopulation(rng1, 8, 30);
      const building2 = service.selectRandomBuildingByPopulation(rng2, 8, 30);
      
      expect(building1.id).toBe(building2.id);
    });
  });

  describe('getBuildingTypeById', () => {
    it('should return correct building type for valid ID', () => {
      const buildingTypes = service.getBuildingTypes();
      const firstBuilding = buildingTypes[0];
      
      const foundBuilding = service.getBuildingTypeById(firstBuilding.id);
      expect(foundBuilding).toEqual(firstBuilding);
    });

    it('should return undefined for invalid ID', () => {
      const foundBuilding = service.getBuildingTypeById('nonexistent-id');
      expect(foundBuilding).toBeUndefined();
    });
  });
});