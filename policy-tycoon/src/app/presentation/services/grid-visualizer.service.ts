import { Injectable } from '@angular/core';
import { Scene, Vector3, LinesMesh, MeshBuilder, StandardMaterial, Color3, Mesh, TransformNode } from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials/grid';

export interface GridRenderOptions {
  gridSize: number;
  lineColor: number;
  lineOpacity: number;
  extent: number;
  lineThickness: number; // Added for more control over grid line thickness
  enableMajorMinorGrid: boolean; // Added to enable major/minor grid lines like Transport Tycoon
}

@Injectable({
  providedIn: 'root'
})
export class GridVisualizerService {
  private scene: Scene | null = null;
  private gridMesh: Mesh | null = null;
  private isVisible: boolean = true; // Default to visible
  private gridOptions: GridRenderOptions = {
    gridSize: 4, // 4 units per grid cell to match OpenTTD tile size
    lineColor: 0x3A5F2A, // Darker grass color (grass * 0.8)
    lineOpacity: 0.3, // More transparent to make it subtle (reduced from 0.95)
    extent: 2000, // Match terrain size (2000x2000)
    lineThickness: 0.5, // Thinner lines for subtlety
    enableMajorMinorGrid: true // Enable major/minor grid pattern like Transport Tycoon
  };

  initialize(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * Renders the grid visualization on the map
   * Creates a grid using BabylonJS GridMaterial for perfect alignment
   */
  renderGrid(scene: Scene, gridSize: number = this.gridOptions.gridSize, extent: number = this.gridOptions.extent): void {
    if (!scene) return;

    // Clear existing grid
    this.clearGrid();

    // Create a ground plane that covers the entire terrain
    this.gridMesh = MeshBuilder.CreateGround('gridGround', { 
      width: extent, 
      height: extent 
    }, scene) as Mesh;

    // Create GridMaterial for perfect grid lines
    const gridMaterial = new GridMaterial('gridMaterial', scene);
    
    // Configure grid appearance for subtlety
    const grassColor = new Color3(0.46, 0.76, 0.36);
    gridMaterial.mainColor = grassColor; // Base grass color
    gridMaterial.lineColor = grassColor.scale(0.7); // Even darker lines for contrast
    gridMaterial.gridRatio = gridSize; // 4-unit grid spacing
    gridMaterial.majorUnitFrequency = this.gridOptions.enableMajorMinorGrid ? 8 : 1; // Every 8th line is major (32 units)
    gridMaterial.minorUnitVisibility = this.gridOptions.enableMajorMinorGrid ? 0.3 : 0; // Fainter minor lines
    gridMaterial.opacity = this.gridOptions.lineOpacity; // More transparent for subtlety
    // Note: GridMaterial doesn't have lineThickness property in Babylon.js
    
    this.gridMesh.material = gridMaterial;
    this.gridMesh.position.y = 0.001; // Even closer to terrain to avoid z-fighting
    this.gridMesh.isPickable = false;
    this.gridMesh.renderingGroupId = 1; // Between terrain (0) and entities (2)
    
    // Set initial visibility
    this.gridMesh.setEnabled(this.isVisible);

    this.scene = scene;
  }

  /**
   * Toggles the visibility of the grid lines
   */
  toggleGridVisibility(visible?: boolean): boolean {
    if (visible !== undefined) {
      this.isVisible = visible;
    } else {
      this.isVisible = !this.isVisible;
    }

    if (this.gridMesh) {
      this.gridMesh.setEnabled(this.isVisible);
    }

    return this.isVisible;
  }

  /**
   * Updates the grid position to center it around a specific point
   */
  updateGridPosition(centerX: number, centerZ: number): void {
    if (!this.gridMesh) return;

    // Snap to grid alignment - ensure grid lines align with tile boundaries
    const alignedX = Math.round(centerX / this.gridOptions.gridSize) * this.gridOptions.gridSize;
    const alignedZ = Math.round(centerZ / this.gridOptions.gridSize) * this.gridOptions.gridSize;

    this.gridMesh.position.x = alignedX;
    this.gridMesh.position.z = alignedZ;
  }

  /**
   * Clears the current grid visualization
   */
  clearGrid(): void {
    if (this.gridMesh) {
      this.gridMesh.dispose();
      this.gridMesh = null;
    }
  }

  /**
   * Gets the current visibility state of the grid
   */
  isGridVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Updates grid rendering options
   */
  updateGridOptions(options: Partial<GridRenderOptions>): void {
    this.gridOptions = { ...this.gridOptions, ...options };
    
    // Re-render grid with new options if it exists
    if (this.scene && this.gridMesh) {
      const wasVisible = this.isVisible;
      this.renderGrid(this.scene, this.gridOptions.gridSize, this.gridOptions.extent);
      this.toggleGridVisibility(wasVisible);
    }
  }

  /**
   * Gets the current grid options
   */
  getGridOptions(): GridRenderOptions {
    return { ...this.gridOptions };
  }

  /**
   * Disposes of all grid resources
   */
  dispose(): void {
    this.clearGrid();
    this.scene = null;
  }
}