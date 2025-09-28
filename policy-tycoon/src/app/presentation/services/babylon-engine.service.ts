import { Injectable, ElementRef } from '@angular/core';
import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  Vector3, 
  HemisphericLight, 
  Color3,
  Color4,
  Tools,
  GlowLayer,
  PostProcess,
  Effect,
  Mesh,
  AbstractMesh
} from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class BabylonEngineService {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;
  private glowLayer: GlowLayer | null = null;

  async initializeEngine(canvas: ElementRef<HTMLCanvasElement>): Promise<void> {
    if (!canvas.nativeElement) {
      throw new Error('Canvas element is required');
    }

    // Create the BabylonJS engine with optimized settings
    this.engine = new Engine(canvas.nativeElement, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
      adaptToDeviceRatio: true
    });

    // Create the scene with optimized settings
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.83, 0.92, 1.0, 1.0); // Sky blue background
    
    // Enable performance optimizations
    this.scene.skipFrustumClipping = false; // Enable frustum culling
    this.scene.blockMaterialDirtyMechanism = false; // Allow material updates but optimize them

    // Create arc rotate camera for better game view control
    this.camera = new ArcRotateCamera(
      'gameCamera',
      Tools.ToRadians(45),  // Alpha (horizontal rotation)
      Tools.ToRadians(60),  // Beta (vertical rotation) 
      40,                   // Radius (distance from target)
      Vector3.Zero(),       // Target position
      this.scene
    );

    // Configure camera controls
    this.camera.attachControl(canvas.nativeElement, true);
    this.camera.setTarget(Vector3.Zero());
    
    // Set camera limits for better UX
    this.camera.lowerBetaLimit = Tools.ToRadians(10);  // Don't go too low
    this.camera.upperBetaLimit = Tools.ToRadians(80);  // Don't go too high
    this.camera.lowerRadiusLimit = 10;                 // Minimum zoom
    this.camera.upperRadiusLimit = 100;                // Maximum zoom

    // Create optimized lighting setup
    const hemisphericLight = new HemisphericLight('skyLight', new Vector3(0.3, 1, 0.3), this.scene);
    hemisphericLight.intensity = 0.9;
    hemisphericLight.diffuse = new Color3(1, 1, 0.9); // Slightly warm light
    hemisphericLight.specular = new Color3(0.1, 0.1, 0.1); // Minimal specular

    // Initialize glow layer for visual effects (optimized)
    this.glowLayer = new GlowLayer('glow', this.scene, {
      mainTextureFixedSize: 256, // Smaller texture for better performance
      blurKernelSize: 16
    });
    this.glowLayer.intensity = 0.5;

    // Start the render loop
    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.scene.render();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.engine) {
        this.engine.resize();
      }
    });
  }

  getScene(): Scene | null {
    return this.scene;
  }

  getEngine(): Engine | null {
    return this.engine;
  }

  getCamera(): ArcRotateCamera | null {
    return this.camera;
  }

  getGlowLayer(): GlowLayer | null {
    return this.glowLayer;
  }

  // Performance optimization methods
  enablePerformanceOptimizations(): void {
    if (!this.scene) return;

    // Freeze static meshes for better performance
    this.scene.meshes
      .filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.metadata?.isStatic === true)
      .forEach(mesh => {
        mesh.freezeWorldMatrix();
        if (mesh.material) {
          mesh.material.freeze();
        }
      });

    // Optimize glow layer to only include specific meshes
    if (this.glowLayer) {
      // Clear all meshes from glow layer first
      this.scene.meshes
        .filter((mesh): mesh is Mesh => mesh instanceof Mesh)
        .forEach(mesh => {
          this.glowLayer?.removeIncludedOnlyMesh(mesh);
        });
      
      // Only add meshes that should glow (like city need icons, special effects)
      this.scene.meshes
        .filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.metadata?.shouldGlow === true)
        .forEach(mesh => {
          this.glowLayer?.addIncludedOnlyMesh(mesh);
        });
    }
  }

  // Camera control methods for game interaction
  focusOnPosition(position: Vector3, distance: number = 30): void {
    if (!this.camera) return;
    
    this.camera.setTarget(position);
    this.camera.radius = distance;
  }

  setCameraLimits(minRadius: number, maxRadius: number): void {
    if (!this.camera) return;
    
    this.camera.lowerRadiusLimit = minRadius;
    this.camera.upperRadiusLimit = maxRadius;
  }

  dispose(): void {
    if (this.glowLayer) {
      this.glowLayer.dispose();
      this.glowLayer = null;
    }

    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
    
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    
    this.camera = null;
  }
}