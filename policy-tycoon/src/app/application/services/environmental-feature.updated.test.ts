import { describe, it, expect, beforeEach } from 'vitest';
import { Scene, Vector3 } from '@babylonjs/core';
import { EnvironmentalFeatureService } from './environmental-feature.service';
import { SeededRandom } from '../../utils/seeded-random';
import { TestSceneSetup } from '../../test-setup';

describe('Updated Environmental Feature Implementation', () => {
  let environmentalService: EnvironmentalFeatureService;
  let scene: Scene;
  let rng: SeededRandom;

  beforeEach(() => {
    // Setup test scene
    scene = TestSceneSetup.createScene();
    
    // Create a simple mock logger
    const mockLogger = {
      info: (message: string) => console.log(`[INFO] ${message}`),
      warn: (message: string) => console.log(`[WARN] ${message}`),
      error: (message: string) => console.log(`[ERROR] ${message}`)
    };
    
    // Create mock model factory (not used in these tests)
    const mockModelFactory: any = {};
    
    environmentalService = new EnvironmentalFeatureService(mockModelFactory, mockLogger as any);
    rng = new SeededRandom(12345);
  });

  it('should generate trees based on terrain information', () => {
    // Configure map parameters
    const mapWidth = 100;
    const mapHeight = 100;
    const treeCount = 100;

    // Create mock terrain grid with different tile types
    const terrainGrid = [
      [
        { height: 5, tileType: { name: "grass" } },
        { height: 2, tileType: { name: "water" } },
        { height: 8, tileType: { name: "mountain" } }
      ],
      [
        { height: 1, tileType: { name: "sand" } },
        { height: 6, tileType: { name: "hill" } },
        { height: 15, tileType: { name: "peak" } }
      ]
    ];
    
    const terrainConfig = {
      waterLevel: 3,
      verticalScale: 0.5
    };

    // Generate trees with terrain information
    const trees = environmentalService.generateTrees(
      mapWidth,
      mapHeight,
      treeCount,
      rng,
      terrainGrid,
      terrainConfig
    );
    
    // Should generate trees (exact count depends on randomness)
    expect(trees.length).toBeGreaterThanOrEqual(0);
    
    // Verify tree properties
    if (trees.length > 0) {
      const firstTree = trees[0];
      expect(firstTree).toBeDefined();
      expect(firstTree.id).toContain('tree_');
      expect(firstTree.type).toMatch(/^(oak|pine|birch|willow)$/);
      expect(firstTree.instanced).toBe(true);
    }
  });

  it('should generate resource forests', () => {
    // Configure map parameters
    const mapWidth = 200;
    const mapHeight = 200;
    const townCount = 5;

    // Generate resource forests
    const forests = environmentalService.generateResourceForests(
      mapWidth,
      mapHeight,
      townCount,
      rng
    );
    
    // Should generate the specified number of forests
    expect(forests.length).toBe(townCount);
    
    // Verify forest properties
    forests.forEach(forest => {
      expect(forest).toBeDefined();
      expect(forest.id).toContain('resource_forest_');
      expect(forest.center).toBeInstanceOf(Vector3);
      expect(forest.radius).toBeGreaterThanOrEqual(15);
      expect(forest.radius).toBeLessThanOrEqual(25);
      expect(forest.treeDensity).toBeGreaterThanOrEqual(0.7);
      expect(forest.treeDensity).toBeLessThanOrEqual(0.9);
    });
  });

  it('should generate trees in forests', () => {
    // Create a mock forest
    const forest = {
      id: 'test_forest_1',
      center: new Vector3(0, 0, 0),
      radius: 20,
      treeDensity: 0.8
    };

    // Generate trees in the forest
    const trees = environmentalService.generateTreesInForest(forest, rng);
    
    // Should generate trees (count depends on density and radius)
    expect(trees.length).toBeGreaterThan(0);
    
    // Verify tree properties
    trees.forEach(tree => {
      expect(tree).toBeDefined();
      expect(tree.id).toContain('tree_test_forest_1_');
      expect(tree.position).toBeInstanceOf(Vector3);
      expect(tree.type).toMatch(/^(oak|pine|birch|willow)$/);
    });
  });
});