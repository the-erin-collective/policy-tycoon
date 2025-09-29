import { ElementRef, Injectable, NgZone } from '@angular/core';
import * as BABYLON from '@babylonjs/core';

@Injectable({ providedIn: 'root' })
export class BabylonEngineService {
  private engine!: BABYLON.Engine;
  private scene!: BABYLON.Scene;

  constructor(private ngZone: NgZone) {}

  public async createScene(canvas: HTMLCanvasElement): Promise<BABYLON.Scene> {
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    // --- PERFORMANCE OPTIMIZATIONS ---
    // This global setting stops the engine from checking every material for changes on every frame.
    // For a static scene like ours, this provides a significant performance boost.
    this.scene.blockMaterialDirtyMechanism = true;

    this.scene.clearColor = new BABYLON.Color4(0.5, 0.7, 1.0, 1);

    // --- SCENE SETUP (Camera, Lights) ---
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 45, BABYLON.Vector3.Zero(), this.scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 400;
    camera.wheelDeltaPercentage = 0.01;

    // PERFORMANCE: Using only a HemisphericLight is vastly more performant than a DirectionalLight that casts shadows.
    // Real-time shadow calculation is one of the most GPU-intensive tasks. By using a hemispheric light,
    // we get good, soft ambient lighting without any shadow calculations, which dramatically improves the frame rate.
    const hemiLight = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0.1, 1, 0.2), this.scene);
    hemiLight.diffuse = new BABYLON.Color3(1, 1, 1); // Light from the sky
    hemiLight.groundColor = new BABYLON.Color3(0.5, 0.45, 0.4); // Light bouncing from the ground
    hemiLight.intensity = 1.2;

    this.startRenderLoop();
    return this.scene;
  }

  private startRenderLoop(): void {
    // Using ngZone.runOutsideAngular is crucial for performance in Angular applications with Babylon.js.
    // It prevents Babylon's render loop from triggering Angular's change detection on every single frame,
    // which would otherwise cause significant performance degradation.
    this.ngZone.runOutsideAngular(() => {
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    });

    window.addEventListener('resize', () => {
        this.engine.resize();
    });
  }

  public getScene(): BABYLON.Scene | undefined {
    return this.scene;
  }
}
