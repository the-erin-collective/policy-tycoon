// Converted from Vitest to Jasmine (Karma)
import { ModelFactoryService } from './model-factory.service';
import { Scene, Vector3 } from '@babylonjs/core';
import { TestSceneSetup } from '../../test-setup';

describe('Instanced Tree Implementation', () => {
  let modelFactory: ModelFactoryService;
  let scene: Scene;

  beforeEach(() => {
    // Setup test scene
    scene = TestSceneSetup.createScene();
    modelFactory = new ModelFactoryService();
    modelFactory.initialize(scene);
  });

  it('should create base tree meshes for instancing', () => {
    // Initialize base tree meshes
    modelFactory.initializeBaseTreeMeshes();
    
    // Verify base meshes are created
    expect((modelFactory as any).baseTreeTrunk).toBeDefined();
    expect((modelFactory as any).baseTreeCrown).toBeDefined();
    
    // Verify base meshes are hidden
    expect((modelFactory as any).baseTreeTrunk!.isVisible).toBe(false);
    expect((modelFactory as any).baseTreeCrown!.isVisible).toBe(false);
  });

  it('should create instanced trees', () => {
    // Create instanced tree
    const position = new Vector3(0, 0, 0);
    const instances = modelFactory.createInstancedTree('oak', position);
    
    // Should create two instances (trunk and crown)
    expect(instances.length).toEqual(2);
    
    // Verify instances have correct properties
    const trunkInstance = instances[0];
    const crownInstance = instances[1];
    
    expect(trunkInstance.name).toContain('trunk');
    expect(crownInstance.name).toContain('crown');
    
    // Verify positions are set correctly
    expect(trunkInstance.position.y).toBeGreaterThan(0);
    expect(crownInstance.position.y).toBeGreaterThan(trunkInstance.position.y);
  });

  it('should create different tree types with correct properties', () => {
    const position = new Vector3(0, 0, 0);
    
    // Test oak tree
    const oakInstances = modelFactory.createInstancedTree('oak', position);
    expect(oakInstances.length).toEqual(2);
    
    // Test pine tree
    const pineInstances = modelFactory.createInstancedTree('pine', position);
    expect(pineInstances.length).toEqual(2);
    
    // Test birch tree
    const birchInstances = modelFactory.createInstancedTree('birch', position);
    expect(birchInstances.length).toEqual(2);
    
    // Test willow tree
    const willowInstances = modelFactory.createInstancedTree('willow', position);
    expect(willowInstances.length).toEqual(2);
  });

  it('should handle multiple instances efficiently', () => {
    const position1 = new Vector3(0, 0, 0);
    const position2 = new Vector3(5, 0, 5);
    const position3 = new Vector3(-5, 0, -5);
    
    // Create multiple instances
    const instances1 = modelFactory.createInstancedTree('oak', position1);
    const instances2 = modelFactory.createInstancedTree('pine', position2);
    const instances3 = modelFactory.createInstancedTree('birch', position3);
    
    // Verify all instances are created
    expect(instances1.length).toEqual(2);
    expect(instances2.length).toEqual(2);
    expect(instances3.length).toEqual(2);
    
    // Verify they share the same base meshes
    expect(instances1[0].sourceMesh).toEqual(instances2[0].sourceMesh);
    expect(instances1[1].sourceMesh).toEqual(instances2[1].sourceMesh);
  });
});