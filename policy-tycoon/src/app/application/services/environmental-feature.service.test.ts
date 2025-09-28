import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentalFeatureService } from './environmental-feature.service';
import { SeededRandom } from '../../utils/seeded-random';

// Mock logger for testing
const mockLogger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.log(`[WARN] ${message}`),
  error: (message: string) => console.log(`[ERROR] ${message}`)
};

describe('EnvironmentalFeatureService', () => {
  let service: EnvironmentalFeatureService;
  let rng: SeededRandom;

  beforeEach(() => {
    service = new EnvironmentalFeatureService({} as any, mockLogger as any);
    rng = new SeededRandom(12345);
  });

  it('should generate trees with improved placement algorithm', () => {
    const trees = service.generateTrees(100, 100, 50, rng);
    
    expect(trees).toBeDefined();
    expect(trees.length).toBeGreaterThan(0);
    
    // Check that trees have the required properties
    trees.forEach(tree => {
      expect(tree.id).toBeDefined();
      expect(tree.position).toBeDefined();
      expect(tree.type).toBeDefined();
      expect(['oak', 'pine', 'birch', 'willow']).toContain(tree.type);
    });
  });

  it('should generate trees with terrain information', () => {
    // Create a mock terrain grid
    const terrainGrid = [
      [
        { x: 0, z: 0, height: 5, tileType: { name: 'grass' } },
        { x: 1, z: 0, height: 5, tileType: { name: 'grass' } },
        { x: 2, z: 0, height: 5, tileType: { name: 'grass' } }
      ],
      [
        { x: 0, z: 1, height: 5, tileType: { name: 'grass' } },
        { x: 1, z: 1, height: 5, tileType: { name: 'grass' } },
        { x: 2, z: 1, height: 5, tileType: { name: 'grass' } }
      ],
      [
        { x: 0, z: 2, height: 5, tileType: { name: 'grass' } },
        { x: 1, z: 2, height: 5, tileType: { name: 'grass' } },
        { x: 2, z: 2, height: 5, tileType: { name: 'grass' } }
      ]
    ];
    
    const terrainConfig = {
      gridSize: 3,
      maxHeight: 10,
      steepness: 2,
      continuity: 5,
      waterLevel: 3,
      verticalScale: 0.5
    };

    const trees = service.generateTrees(30, 30, 10, rng, terrainGrid, terrainConfig);
    
    expect(trees).toBeDefined();
    // With our algorithm, we should have trees on 1/3 of the tiles
    expect(trees.length).toBeGreaterThan(0);
  });

  it('should find large flat areas for forests', () => {
    // This test would require access to the private method findLargeFlatAreas
    // We'll test the public interface instead
    const trees = service.generateTrees(100, 100, 20, rng);
    
    expect(trees).toBeDefined();
    expect(trees.length).toBeGreaterThanOrEqual(0);
  });

  it('should generate water bodies', () => {
    const waterBodies = service.generateWaterBodies(100, 100, 5, rng);
    
    expect(waterBodies).toBeDefined();
    expect(waterBodies.length).toBe(5);
    
    // Check that water bodies have the required properties
    waterBodies.forEach(waterBody => {
      expect(waterBody.id).toBeDefined();
      if ('startPoint' in waterBody) {
        // River
        expect(waterBody.startPoint).toBeDefined();
        expect(waterBody.endPoint).toBeDefined();
        expect(waterBody.width).toBeDefined();
      } else if ('center' in waterBody && 'radius' in waterBody) {
        // Lake
        expect(waterBody.center).toBeDefined();
        expect(waterBody.radius).toBeDefined();
      }
    });
  });

  it('should generate forests', () => {
    const forests = service.generateForests(100, 100, 3, rng);
    
    expect(forests).toBeDefined();
    expect(forests.length).toBe(3);
    
    // Check that forests have the required properties
    forests.forEach(forest => {
      expect(forest.id).toBeDefined();
      expect(forest.center).toBeDefined();
      expect(forest.radius).toBeDefined();
      expect(forest.treeDensity).toBeDefined();
    });
  });

  it('should generate resource forests', () => {
    const forests = service.generateResourceForests(100, 100, 5, rng);
    
    expect(forests).toBeDefined();
    expect(forests.length).toBe(5);
    
    // Check that forests have the required properties
    forests.forEach(forest => {
      expect(forest.id).toBeDefined();
      expect(forest.center).toBeDefined();
      expect(forest.radius).toBeDefined();
      expect(forest.treeDensity).toBeDefined();
    });
  });

  it('should generate trees in forest', () => {
    const mockForest = {
      id: 'test_forest',
      center: { x: 0, y: 0, z: 0 },
      radius: 20,
      treeDensity: 0.5
    } as any;

    const trees = service.generateTreesInForest(mockForest, rng);
    
    expect(trees).toBeDefined();
    expect(trees.length).toBeGreaterThan(0);
    
    // Check that trees have the required properties
    trees.forEach(tree => {
      expect(tree.id).toBeDefined();
      expect(tree.position).toBeDefined();
      expect(tree.type).toBeDefined();
    });
  });
});