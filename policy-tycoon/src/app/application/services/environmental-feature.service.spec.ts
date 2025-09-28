// Converted from Vitest to Jasmine (Karma)
import { EnvironmentalFeatureService } from './environmental-feature.service';
import { Vector3 } from '@babylonjs/core';
import { SeededRandom } from '../../data/models/city-generation';
import { ModelFactoryService } from '../../presentation/services/model-factory.service';
import { GenerationLoggerService } from './generation-logger.service';

// Mock SeededRandom implementation for testing
class MockSeededRandom implements SeededRandom {
  seed: number = 12345;
  
  nextInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }
  
  nextIntInclusive(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  nextFloat(): number {
    return Math.random();
  }
  
  nextBoolean(probability?: number): boolean {
    return Math.random() < (probability || 0.5);
  }
  
  selectFromArray<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  setSeed(seed: number): void {
    this.seed = seed;
  }
}

describe('EnvironmentalFeatureService', () => {
  let service: EnvironmentalFeatureService;
  let mockModelFactory: ModelFactoryService;
  let mockLogger: GenerationLoggerService;
  let mockRng: SeededRandom;

  beforeEach(() => {
    mockModelFactory = {} as ModelFactoryService;
    mockLogger = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    } as unknown as GenerationLoggerService;
    mockRng = new MockSeededRandom();
    
    service = new EnvironmentalFeatureService(mockModelFactory, mockLogger);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateTrees', () => {
    it('should generate the specified number of trees', () => {
      const trees = service.generateTrees(100, 100, 10, mockRng);
      expect(trees.length).toBe(10);
    });

    it('should generate trees with valid positions within bounds', () => {
      const mapWidth = 100;
      const mapHeight = 100;
      const trees = service.generateTrees(mapWidth, mapHeight, 5, mockRng);
      
      trees.forEach(tree => {
        expect(tree.position.x).toBeGreaterThanOrEqual(-mapWidth / 2);
        expect(tree.position.x).toBeLessThanOrEqual(mapWidth / 2);
        expect(tree.position.z).toBeGreaterThanOrEqual(-mapHeight / 2);
        expect(tree.position.z).toBeLessThanOrEqual(mapHeight / 2);
        expect(tree.position.y).toBe(0);
      });
    });

    it('should assign valid tree types to generated trees', () => {
      const validTreeTypes = ['oak', 'pine', 'birch', 'willow'];
      const trees = service.generateTrees(100, 100, 20, mockRng);
      
      trees.forEach(tree => {
        expect(validTreeTypes).toContain(tree.type);
      });
    });
  });

  describe('generateWaterBodies', () => {
    it('should generate the specified number of water bodies', () => {
      const waterBodies = service.generateWaterBodies(100, 100, 5, mockRng);
      expect(waterBodies.length).toBe(5);
    });

    it('should generate water bodies with valid positions within bounds', () => {
      const mapWidth = 100;
      const mapHeight = 100;
      const waterBodies = service.generateWaterBodies(mapWidth, mapHeight, 5, mockRng);
      
      waterBodies.forEach(body => {
        if ('startPoint' in body) {
          // River
          const river = body as any;
          expect(river.startPoint.x).toBeGreaterThanOrEqual(-mapWidth / 2 + 10);
          expect(river.startPoint.x).toBeLessThanOrEqual(mapWidth / 2 - 10);
          expect(river.startPoint.z).toBeGreaterThanOrEqual(-mapHeight / 2 + 10);
          expect(river.startPoint.z).toBeLessThanOrEqual(mapHeight / 2 - 10);
        } else if ('center' in body && 'radius' in body) {
          // Lake
          const lake = body as any;
          expect(lake.center.x).toBeGreaterThanOrEqual(-mapWidth / 2 + 15);
          expect(lake.center.x).toBeLessThanOrEqual(mapWidth / 2 - 15);
          expect(lake.center.z).toBeGreaterThanOrEqual(-mapHeight / 2 + 15);
          expect(lake.center.z).toBeLessThanOrEqual(mapHeight / 2 - 15);
        }
      });
    });
  });

  describe('generateForests', () => {
    it('should generate the specified number of forests', () => {
      const forests = service.generateForests(100, 100, 3, mockRng);
      expect(forests.length).toBe(3);
    });

    it('should generate forests with valid positions and properties', () => {
      const mapWidth = 100;
      const mapHeight = 100;
      const forests = service.generateForests(mapWidth, mapHeight, 3, mockRng);
      
      forests.forEach(forest => {
        expect(forest.center.x).toBeGreaterThanOrEqual(-mapWidth / 2 + 20);
        expect(forest.center.x).toBeLessThanOrEqual(mapWidth / 2 - 20);
        expect(forest.center.z).toBeGreaterThanOrEqual(-mapHeight / 2 + 20);
        expect(forest.center.z).toBeLessThanOrEqual(mapHeight / 2 - 20);
        expect(forest.radius).toBeGreaterThanOrEqual(10);
        expect(forest.radius).toBeLessThanOrEqual(40);
        expect(forest.treeDensity).toBeGreaterThanOrEqual(0.3);
        expect(forest.treeDensity).toBeLessThanOrEqual(0.9);
      });
    });
  });

  describe('generateTreesInForest', () => {
    it('should generate trees within a forest area', () => {
      const forest = {
        id: 'test-forest',
        center: new Vector3(0, 0, 0),
        radius: 20,
        treeDensity: 0.5
      };
      
      const trees = service.generateTreesInForest(forest, mockRng);
      
      // Should generate some trees
      expect(trees.length).toBeGreaterThan(0);
      
      // All trees should be within the forest radius
      trees.forEach(tree => {
        const distance = Math.sqrt(
          Math.pow(tree.position.x - forest.center.x, 2) +
          Math.pow(tree.position.z - forest.center.z, 2)
        );
        expect(distance).toBeLessThanOrEqual(forest.radius);
      });
    });
  });
});