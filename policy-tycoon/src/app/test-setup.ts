import { Scene, Engine, NullEngine, Camera, Vector3 } from '@babylonjs/core';

export class TestSceneSetup {
  static createScene(): Scene {
    // Create a null engine for testing (no WebGL context needed)
    const engine = new NullEngine({
      renderHeight: 800,
      renderWidth: 600,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 1
    });
    
    // Create scene
    const scene = new Scene(engine);
    
    // Add a basic camera for tests that need it
    const camera = new Camera("testCamera", Vector3.Zero(), scene);
    camera.position.set(0, 10, -10);
    // Remove setTarget as it's not available in all camera types
    
    return scene;
  }
}