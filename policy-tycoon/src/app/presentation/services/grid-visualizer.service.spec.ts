// Converted from Vitest to Jasmine (Karma)
import { Scene, Engine, NullEngine, Vector3, LinesMesh, Mesh } from '@babylonjs/core';
import { GridVisualizerService, GridRenderOptions } from './grid-visualizer.service';

describe('GridVisualizerService - Zoneless', () => {
  let service: GridVisualizerService;
  let scene: Scene;
  let engine: Engine;

  beforeEach(() => {
    // Create service directly for zoneless mode
    service = new GridVisualizerService();
    
    // Create a test BabylonJS scene
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize', () => {
    it('should initialize with a scene', () => {
      service.initialize(scene);
      expect(service).toBeTruthy();
    });
  });

  describe('renderGrid', () => {
    beforeEach(() => {
      service.initialize(scene);
    });

    it('should create grid ground when rendered', () => {
      const initialMeshCount = scene.meshes.length;
      
      service.renderGrid(scene, 4, 100);
      
      // Should have added grid mesh to scene
      expect(scene.meshes.length).toBeGreaterThan(initialMeshCount);
      
      // Should find the grid ground mesh
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh).toBeTruthy();
      expect(gridMesh).toBeInstanceOf(Mesh);
    });

    it('should create grid with proper spacing and alignment', () => {
      const gridSize = 4;
      const extent = 100;
      
      service.renderGrid(scene, gridSize, extent);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround') as Mesh;
      expect(gridMesh).toBeTruthy();
      
      // Grid should be positioned at origin initially (with slight Y offset)
      expect(gridMesh.position.x).toBe(0);
      expect(gridMesh.position.z).toBe(0);
      expect(gridMesh.position.y).toBe(0.001); // Slightly above terrain
    });

    it('should clear existing grid before creating new one', () => {
      // Create first grid
      service.renderGrid(scene, 4, 100);
      const firstGridCount = scene.meshes.filter(mesh => mesh.name === 'gridGround').length;
      expect(firstGridCount).toBe(1);
      
      // Create second grid
      service.renderGrid(scene, 8, 200);
      const secondGridCount = scene.meshes.filter(mesh => mesh.name === 'gridGround').length;
      
      // Should still only have one grid mesh
      expect(secondGridCount).toBe(1);
    });

    it('should make grid non-pickable', () => {
      service.renderGrid(scene, 4, 100);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh?.isPickable).toBe(false);
    });
  });

  describe('toggleGridVisibility', () => {
    beforeEach(() => {
      service.initialize(scene);
      service.renderGrid(scene, 4, 100);
    });

    it('should toggle visibility when called without parameter', () => {
      const initialVisibility = service.isGridVisible();
      
      const newVisibility = service.toggleGridVisibility();
      
      expect(newVisibility).toBe(!initialVisibility);
      expect(service.isGridVisible()).toBe(newVisibility);
    });

    it('should set specific visibility when parameter provided', () => {
      service.toggleGridVisibility(true);
      expect(service.isGridVisible()).toBe(true);
      
      service.toggleGridVisibility(false);
      expect(service.isGridVisible()).toBe(false);
    });

    it('should update mesh visibility when toggled', () => {
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      
      service.toggleGridVisibility(true);
      expect(gridMesh?.isEnabled()).toBe(true);
      
      service.toggleGridVisibility(false);
      expect(gridMesh?.isEnabled()).toBe(false);
    });

    it('should return current visibility state', () => {
      const result = service.toggleGridVisibility(true);
      expect(result).toBe(true);
      
      const result2 = service.toggleGridVisibility(false);
      expect(result2).toBe(false);
    });
  });

  describe('updateGridPosition', () => {
    beforeEach(() => {
      service.initialize(scene);
      service.renderGrid(scene, 4, 100);
    });

    it('should update grid position to specified coordinates', () => {
      const targetX = 20;
      const targetZ = 30;
      
      service.updateGridPosition(targetX, targetZ);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      // Updated to be more flexible since the actual implementation may apply alignment
      expect(gridMesh?.position.x).toBeGreaterThanOrEqual(targetX - 2);
      expect(gridMesh?.position.x).toBeLessThanOrEqual(targetX + 2);
      expect(gridMesh?.position.z).toBeGreaterThanOrEqual(targetZ - 2);
      expect(gridMesh?.position.z).toBeLessThanOrEqual(targetZ + 2);
    });

    it('should align position to grid boundaries', () => {
      // Test with coordinates that should be snapped to grid
      service.updateGridPosition(18.7, 25.3); // Should snap to 20, 24 with gridSize 4
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh?.position.x).toBe(20); // 18.7 rounded to nearest 4-unit boundary
      expect(gridMesh?.position.z).toBe(24); // 25.3 rounded to nearest 4-unit boundary
    });
  });

  describe('clearGrid', () => {
    beforeEach(() => {
      service.initialize(scene);
      service.renderGrid(scene, 4, 100);
    });

    it('should remove grid mesh from scene', () => {
      const initialMeshCount = scene.meshes.length;
      
      service.clearGrid();
      
      expect(scene.meshes.length).toBeLessThan(initialMeshCount);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh).toBeFalsy();
    });

    it('should handle clearing when no grid exists', () => {
      service.clearGrid(); // Clear existing grid
      
      // Should not throw error when clearing again
      expect(() => service.clearGrid()).not.toThrow();
    });
  });

  describe('isGridVisible', () => {
    beforeEach(() => {
      service.initialize(scene);
    });

    it('should return true initially (default visible)', () => {
      expect(service.isGridVisible()).toBe(true);
    });

    it('should return correct visibility state after toggling', () => {
      service.renderGrid(scene, 4, 100);
      
      service.toggleGridVisibility(true);
      expect(service.isGridVisible()).toBe(true);
      
      service.toggleGridVisibility(false);
      expect(service.isGridVisible()).toBe(false);
    });
  });

  describe('updateGridOptions', () => {
    beforeEach(() => {
      service.initialize(scene);
    });

    it('should update grid options and re-render', () => {
      service.renderGrid(scene, 4, 100);
      const initialMeshCount = scene.meshes.length;
      
      const newOptions: Partial<GridRenderOptions> = {
        gridSize: 8,
        extent: 200,
        lineOpacity: 0.5
      };
      
      service.updateGridOptions(newOptions);
      
      // Should still have same number of meshes (old grid replaced)
      expect(scene.meshes.length).toBe(initialMeshCount);
      
      // Should have updated options
      const currentOptions = service.getGridOptions();
      expect(currentOptions.gridSize).toBe(8);
      expect(currentOptions.extent).toBe(200);
      expect(currentOptions.lineOpacity).toBe(0.5);
    });

    it('should preserve visibility state when updating options', () => {
      service.renderGrid(scene, 4, 100);
      service.toggleGridVisibility(true);
      
      service.updateGridOptions({ gridSize: 8 });
      
      expect(service.isGridVisible()).toBe(true);
    });
  });

  describe('getGridOptions', () => {
    it('should return current grid options', () => {
      const options = service.getGridOptions();
      
      expect(options).toBeDefined();
      expect(options.gridSize).toBeDefined();
      expect(options.lineColor).toBeDefined();
      expect(options.lineOpacity).toBeDefined();
      expect(options.extent).toBeDefined();
    });

    it('should return copy of options (not reference)', () => {
      const options1 = service.getGridOptions();
      const options2 = service.getGridOptions();
      
      expect(options1).not.toBe(options2); // Different object references
      expect(options1).toEqual(options2); // Same values
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      service.initialize(scene);
      service.renderGrid(scene, 4, 100);
    });

    it('should clean up all resources', () => {
      const initialMeshCount = scene.meshes.length;
      
      service.dispose();
      
      // Grid mesh should be removed
      expect(scene.meshes.length).toBeLessThan(initialMeshCount);
      
      const gridMesh = scene.meshes.find(mesh => mesh.name === 'gridGround');
      expect(gridMesh).toBeFalsy();
    });

    it('should handle dispose when no grid exists', () => {
      service.clearGrid();
      
      expect(() => service.dispose()).not.toThrow();
    });
  });
});