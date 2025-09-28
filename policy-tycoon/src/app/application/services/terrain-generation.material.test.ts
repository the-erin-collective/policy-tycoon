import { describe, it, expect, beforeEach } from 'vitest';
import { Scene, Engine, NullEngine, Color3 } from '@babylonjs/core';
import { TerrainGenerationService } from './terrain-generation.service';
import { SeededRandom } from '../../utils/seeded-random';
import { TestSceneSetup } from '../../test-setup';

describe('Terrain Material Fix', () => {
  let terrainService: TerrainGenerationService;
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
    
    terrainService = new TerrainGenerationService(mockLogger as any);
    rng = new SeededRandom(12345);
  });

  it('should initialize base meshes without material warnings', () => {
    // Initialize base meshes
    terrainService.initializeBaseMeshes(scene);
    
    // Verify base meshes are created
    const anyTerrainService = terrainService as any;
    expect(anyTerrainService.baseBoxMesh).toBeDefined();
    expect(anyTerrainService.baseWedgeMesh).toBeDefined();
    expect(anyTerrainService.basePlugMesh).toBeDefined();
    
    // Verify base meshes are hidden
    expect(anyTerrainService.baseBoxMesh!.isVisible).toBe(false);
    expect(anyTerrainService.baseWedgeMesh!.isVisible).toBe(false);
    expect(anyTerrainService.basePlugMesh!.isVisible).toBe(false);
    
    // Verify materials are created
    expect(anyTerrainService.baseMaterials.size).toBeGreaterThan(0);
  });

  it('should render terrain without material warnings', () => {
    // Configure terrain generation parameters
    const terrainConfig = {
      gridSize: 5, // Small grid for testing
      maxHeight: 10,
      steepness: 2,
      continuity: 5,
      waterLevel: 3,
      verticalScale: 0.5
    };

    // Generate terrain grid
    const terrainGrid = terrainService.generateTerrainGrid(terrainConfig, rng);
    
    // Render terrain with instancing - this should not produce material warnings
    const instances = terrainService.renderTerrainWithInstancing(terrainGrid, terrainConfig, scene);
    
    // Should create instances
    expect(instances.length).toBeGreaterThan(0);
  });
});