import { Injectable } from '@angular/core';
import { Scene, Vector3, TransformNode, Mesh, Color3, InstancedMesh } from '@babylonjs/core';
import { ModelFactoryService } from './model-factory.service';
import { CityGeneratorService, CityLayout } from './city-generator.service';
import { GridVisualizerService } from './grid-visualizer.service';
import { City, Industry, Vehicle } from '../../data/models/core-entities';
import { CityTier, NeedType } from '../../data/models/enums';

// Add these imports for environmental features
import { EnvironmentalFeatureService } from '../../application/services/environmental-feature.service';
import { Tree, River, Lake, Forest } from '../../application/services/environmental-feature.service';
import { SeededRandom } from '../../utils/seeded-random';
import { PerformanceConfigService, PerformanceSettings } from '../../application/services/performance-config.service';
import { PerformanceMonitorService } from '../../application/services/performance-monitor.service';

// Add import for terrain generation service
import { TerrainGenerationService } from '../../application/services/terrain-generation.service';

// Helper function to convert our Vector3 interface to BabylonJS Vector3
function toBabylonVector3(v: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

export interface MapConfig {
  terrainWidth: number;
  terrainHeight: number;
  citySpacing: number;
  roadWidth: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapRendererService {
  private scene: Scene | null = null;
  private modelFactory: ModelFactoryService | null = null;
  private terrainInstances: InstancedMesh[] = []; // Changed from single mesh to array of instances
  private cityNodes: Map<string, TransformNode> = new Map();
  private industryNodes: Map<string, TransformNode> = new Map();
  private vehicleNodes: Map<string, TransformNode> = new Map();
  private needIconNodes: Map<string, TransformNode> = new Map();
  private roadNodes: TransformNode[] = [];
  private cityLayouts: Map<string, CityLayout> = new Map();
  
  // Add collections for environmental features
  private treeNodes: Map<string, TransformNode> = new Map();
  private waterNodes: Map<string, TransformNode> = new Map();
  private forestNodes: Map<string, TransformNode> = new Map();

  private mapConfig: MapConfig = {
    terrainWidth: 2000,
    terrainHeight: 2000,
    citySpacing: 20,
    roadWidth: 3
  };

  // Add performance services
  private performanceConfig: PerformanceConfigService;
  private performanceMonitor: PerformanceMonitorService;

  constructor(
    private modelFactoryService: ModelFactoryService,
    private cityGenerator: CityGeneratorService,
    private gridVisualizer: GridVisualizerService,
    private environmentalFeatureService: EnvironmentalFeatureService,
    private terrainGenerationService: TerrainGenerationService, // Add terrain generation service
    performanceConfig?: PerformanceConfigService,
    performanceMonitor?: PerformanceMonitorService
  ) {
    this.performanceConfig = performanceConfig || new PerformanceConfigService();
    this.performanceMonitor = performanceMonitor || new PerformanceMonitorService();
  }

  // Boundary validation methods
  private isPositionWithinBounds(position: Vector3): boolean {
    const halfWidth = this.mapConfig.terrainWidth / 2;
    const halfHeight = this.mapConfig.terrainHeight / 2;
    
    return position.x >= -halfWidth && 
           position.x <= halfWidth &&
           position.z >= -halfHeight && 
           position.z <= halfHeight;
  }

  private clampPositionToBounds(position: Vector3): Vector3 {
    const halfWidth = this.mapConfig.terrainWidth / 2;
    const halfHeight = this.mapConfig.terrainHeight / 2;
    
    return new Vector3(
      Math.max(-halfWidth, Math.min(halfWidth, position.x)),
      position.y,
      Math.max(-halfHeight, Math.min(halfHeight, position.z))
    );
  }

  private validateRoadBounds(start: Vector3, end: Vector3): { start: Vector3, end: Vector3 } {
    return {
      start: this.clampPositionToBounds(start),
      end: this.clampPositionToBounds(end)
    };
  }

  initialize(scene: Scene): void {
    this.scene = scene;
    this.modelFactory = this.modelFactoryService;
    this.modelFactory.initialize(scene);
    
    // Initialize grid visualizer
    this.gridVisualizer.initialize(scene);
    this.gridVisualizer.renderGrid(scene);
    
    this.createBaseTerrain();
    this.createInitialRoadNetwork();
    this.generateEnvironmentalFeatures(); // Generate environmental features on initialization
  }

  /**
   * Initialize with WFC terrain instead of flat ground
   */
  private createBaseTerrain(): void {
    if (!this.modelFactory) return;

    // Generate and render WFC terrain
    this.generateAndRenderTerrain();
  }

  /**
   * Generate and render terrain using Wave Function Collapse algorithm with instancing and chunking
   * This implements the terrain generation from the demo HTML file with chunking optimization
   */
  async generateAndRenderTerrain(): Promise<void> {
    if (!this.scene) {
      console.warn('Scene not initialized, cannot generate terrain');
      return Promise.resolve();
    }

    // Dispose of existing terrain instances
    this.terrainInstances.forEach(instance => instance.dispose());
    this.terrainInstances = [];

    // Configure terrain generation parameters
    // Use full map size for terrain grid to ensure complete coverage
    const terrainConfig = {
      gridSize: 2000, // Full map size to cover entire terrain area
      maxHeight: 20,
      steepness: 2,
      continuity: 5,
      waterLevel: 3,
      verticalScale: 0.5
    };

    // Create a seeded random generator for deterministic terrain
    const rng = new SeededRandom(12345); // Fixed seed for consistent terrain

    // Generate terrain chunks using WFC algorithm
    const terrainChunks = this.terrainGenerationService.generateTerrainChunks(terrainConfig, rng);

    // Render the terrain using instancing from chunks
    this.terrainInstances = this.terrainGenerationService.renderTerrainWithInstancingFromChunks(terrainChunks, terrainConfig, this.scene);
    
    // Render water plane
    const water = this.terrainGenerationService.renderWater(terrainConfig, this.scene);
    
    // Generate environmental features with terrain information
    this.generateEnvironmentalFeatures(undefined, terrainConfig);
    
    console.log('Terrain generation with chunking and instancing complete');
    return Promise.resolve();
  }

  private createInitialRoadNetwork(): void {
    // No initial global road network - roads will be created per city
    // This allows cities to exist independently without connecting roads
    // like in Transport Tycoon / OpenTTD
  }

  // City Rendering Methods
  renderCity(city: City): void {
    if (!this.modelFactory) return;

    // Validate city position is within bounds
    const validCityPosition = this.clampPositionToBounds(toBabylonVector3(city.position));
    if (!this.isPositionWithinBounds(validCityPosition)) {
      console.warn(`City ${city.id} position is outside map bounds, skipping render`);
      return;
    }

    // Remove existing city if it exists
    this.removeCity(city.id);

    // Generate realistic city layout
    const layout = this.cityGenerator.generateCityLayout(city);
    this.cityLayouts.set(city.id, layout);

    // Create city container node
    const cityContainer = new TransformNode(`city_container_${city.id}`, this.scene!);
    cityContainer.position = validCityPosition;

    // Render roads first
    this.renderCityRoads(layout, cityContainer);

    // Render buildings based on layout
    this.renderCityBuildings(layout, cityContainer, city.tier);

    // Render industrial zones
    this.renderIndustrialZones(layout, cityContainer);

    this.cityNodes.set(city.id, cityContainer);

    // Add need icons above the city
    this.renderCityNeeds(city);
  }

  private renderCityRoads(layout: CityLayout, parent: TransformNode): void {
    if (!this.modelFactory) return;

    layout.roads.forEach((road, index) => {
      // Validate and clamp road positions to bounds
      const validatedRoad = this.validateRoadBounds(road.start, road.end);
      
      // Only render road if both start and end are within bounds
      if (this.isPositionWithinBounds(validatedRoad.start) && 
          this.isPositionWithinBounds(validatedRoad.end)) {
        const roadNode = this.modelFactory!.createRoad(validatedRoad.start, validatedRoad.end, road.width);
        roadNode.parent = parent;
        roadNode.name = `road_${index}`;
        
        // Set roads to render above grid
        roadNode.getChildMeshes().forEach(mesh => {
          mesh.renderingGroupId = 2;
        });
      }
    });
  }

  private renderCityBuildings(layout: CityLayout, parent: TransformNode, tier: CityTier): void {
    if (!this.modelFactory) return;

    layout.buildingPlots.forEach((plot, index) => {
      // Validate building position is within bounds
      const validPosition = this.clampPositionToBounds(plot.position);
      if (!this.isPositionWithinBounds(validPosition)) {
        return; // Skip buildings outside bounds
      }

      let buildingNode: TransformNode;

      switch (plot.type) {
        case 'residential':
          if (tier >= CityTier.UrbanCentre && Math.random() < 0.4) {
            // Some mid-rise buildings in urban areas
            buildingNode = this.createMidRiseBuilding(validPosition, parent);
          } else {
            // Houses for residential areas
            buildingNode = this.createHouseBuilding(validPosition, parent);
          }
          break;
        case 'commercial':
          buildingNode = this.createCommercialBuilding(validPosition, parent, tier);
          break;
        case 'civic':
          buildingNode = this.createCivicBuilding(validPosition, parent);
          break;
        default:
          buildingNode = this.createHouseBuilding(validPosition, parent);
      }

      buildingNode.name = `building_${plot.type}_${index}`;
      
      // Set buildings to render above grid
      buildingNode.getChildMeshes().forEach(mesh => {
        mesh.renderingGroupId = 2;
      });
    });
  }

  private createHouseBuilding(position: Vector3, parent: TransformNode): TransformNode {
    if (!this.modelFactory || !this.scene) return new TransformNode('empty', this.scene);

    const houseNode = new TransformNode('house', this.scene);
    houseNode.position = position;
    houseNode.parent = parent;

    this.modelFactory.createHouse(houseNode, 0, 0);
    
    return houseNode;
  }

  private createMidRiseBuilding(position: Vector3, parent: TransformNode): TransformNode {
    if (!this.modelFactory || !this.scene) return new TransformNode('empty', this.scene);

    const buildingNode = new TransformNode('midrise', this.scene);
    buildingNode.position = position;
    buildingNode.parent = parent;

    // Create a mid-rise building with random height and color
    const colors = [
      new Color3(0.91, 0.4, 0.2),   // buildingA
      new Color3(0.15, 0.66, 0.74), // buildingB  
      new Color3(0.54, 0.76, 0.78), // buildingC
      new Color3(0.98, 0.55, 0.2)   // buildingD
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const height = 2.5 + Math.random() * 2; // Random height between 2.5 and 4.5

    this.modelFactory.createMidRise(buildingNode, 0, 0, color, height);
    
    return buildingNode;
  }

  private createCommercialBuilding(position: Vector3, parent: TransformNode, tier: CityTier): TransformNode {
    if (!this.modelFactory || !this.scene) return new TransformNode('empty', this.scene);

    const buildingNode = new TransformNode('commercial', this.scene);
    buildingNode.position = position;
    buildingNode.parent = parent;

    // Commercial buildings are taller and use specific colors
    const height = tier >= CityTier.Metropolis ? 4 + Math.random() * 3 : 3 + Math.random() * 2;
    this.modelFactory.createMidRise(buildingNode, 0, 0, new Color3(0.15, 0.66, 0.74), height);
    
    return buildingNode;
  }

  private createCivicBuilding(position: Vector3, parent: TransformNode): TransformNode {
    if (!this.modelFactory || !this.scene) return new TransformNode('empty', this.scene);

    const buildingNode = new TransformNode('civic', this.scene);
    buildingNode.position = position;
    buildingNode.parent = parent;

    // Civic buildings have distinctive appearance
    this.modelFactory.createMidRise(buildingNode, 0, 0, new Color3(0.98, 0.55, 0.2), 2.8);
    
    return buildingNode;
  }

  private renderIndustrialZones(layout: CityLayout, parent: TransformNode): void {
    if (!this.modelFactory) return;

    layout.industrialZones.forEach((zone, index) => {
      // Validate industrial zone position is within bounds
      const validPosition = this.clampPositionToBounds(zone.center);
      if (!this.isPositionWithinBounds(validPosition)) {
        return; // Skip industrial zones outside bounds
      }

      const industryNode = this.modelFactory!.createIndustryModel(zone.industryType, validPosition);
      industryNode.parent = parent;
      industryNode.name = `industry_${zone.industryType}_${index}`;
      
      // Set industries to render above grid
      industryNode.getChildMeshes().forEach(mesh => {
        mesh.renderingGroupId = 2;
      });
    });
  }

  updateCityTier(cityId: string, newTier: CityTier): void {
    const city = this.getCityById(cityId);
    if (!city) return;

    city.tier = newTier;
    this.renderCity(city);
  }

  private renderCityNeeds(city: City): void {
    if (!this.modelFactory) return;

    // Clear existing need icons for this city
    this.clearCityNeedIcons(city.id);

    // Show top 3 unmet needs as floating icons above the city
    const unmetNeeds = city.unmetNeeds
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    unmetNeeds.forEach((need, index) => {
      if (need.iconVisible) {
        const iconPosition = toBabylonVector3(city.position);
        iconPosition.y = this.getCityHeight(city.tier) + 2 + (index * 0.8);
        iconPosition.x += (index - 1) * 1.2; // Spread icons horizontally

        // Validate icon position is within bounds
        const validIconPosition = this.clampPositionToBounds(iconPosition);
        if (this.isPositionWithinBounds(validIconPosition)) {
          const iconNode = this.modelFactory!.createNeedIcon(need.type, validIconPosition);
          const iconKey = `${city.id}_need_${need.type}`;
          this.needIconNodes.set(iconKey, iconNode);
        }
      }
    });
  }

  private getCityHeight(tier: CityTier): number {
    // Return approximate height of city based on tier
    switch (tier) {
      case CityTier.Hamlet: return 1.5;
      case CityTier.SmallTown: return 2.0;
      case CityTier.GrowingTown: return 2.5;
      case CityTier.UrbanCentre: return 3.0;
      case CityTier.ExpandingCity: return 4.0;
      case CityTier.Metropolis: return 5.0;
      case CityTier.AdvancedCity: return 6.0;
      default: return 2.0;
    }
  }

  private clearCityNeedIcons(cityId: string): void {
    const keysToRemove: string[] = [];
    
    this.needIconNodes.forEach((node, key) => {
      if (key.startsWith(`${cityId}_need_`)) {
        node.dispose();
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.needIconNodes.delete(key));
  }

  removeCity(cityId: string): void {
    const cityNode = this.cityNodes.get(cityId);
    if (cityNode) {
      cityNode.dispose();
      this.cityNodes.delete(cityId);
    }

    // Also remove the city layout from the layouts map
    this.cityLayouts.delete(cityId);

    this.clearCityNeedIcons(cityId);
  }

  // Industry Rendering Methods
  renderIndustry(industry: Industry): void {
    if (!this.modelFactory) return;

    // Validate industry position is within bounds
    const validPosition = this.clampPositionToBounds(toBabylonVector3(industry.position));
    if (!this.isPositionWithinBounds(validPosition)) {
      console.warn(`Industry ${industry.id} position is outside map bounds, skipping render`);
      return;
    }

    // Remove existing industry if it exists
    this.removeIndustry(industry.id);

    // Create new industry model
    const industryNode = this.modelFactory.createIndustryModel(industry.type, validPosition);
    this.industryNodes.set(industry.id, industryNode);

    // Add visual indicators for construction status
    this.updateIndustryStatus(industry);
  }

  updateIndustryStatus(industry: Industry): void {
    const industryNode = this.industryNodes.get(industry.id);
    if (!industryNode || !this.scene) return;

    // Add construction indicators, operational status, etc.
    // This could include scaffolding for under construction, smoke for operational, etc.
    
    // For now, we'll just adjust the opacity based on construction status
    industryNode.getChildMeshes().forEach(mesh => {
      if (mesh.material && 'alpha' in mesh.material) {
        switch (industry.constructionStatus) {
          case 'planning':
            (mesh.material as any).alpha = 0.3;
            break;
          case 'under-construction':
            (mesh.material as any).alpha = 0.6;
            break;
          case 'awaiting-materials':
            (mesh.material as any).alpha = 0.8;
            break;
          case 'complete':
            (mesh.material as any).alpha = 1.0;
            break;
        }
      }
    });
  }

  removeIndustry(industryId: string): void {
    const industryNode = this.industryNodes.get(industryId);
    if (industryNode) {
      industryNode.dispose();
      this.industryNodes.delete(industryId);
    }
  }

  // Vehicle Rendering Methods
  renderVehicle(vehicle: Vehicle): void {
    if (!this.modelFactory) return;

    // Validate vehicle position is within bounds
    const validPosition = this.clampPositionToBounds(toBabylonVector3(vehicle.position));
    if (!this.isPositionWithinBounds(validPosition)) {
      console.warn(`Vehicle ${vehicle.id} position is outside map bounds, skipping render`);
      return;
    }

    // Remove existing vehicle if it exists
    this.removeVehicle(vehicle.id);

    // Create new vehicle model
    const vehicleNode = this.modelFactory.createVehicleModel(vehicle.type, validPosition);
    this.vehicleNodes.set(vehicle.id, vehicleNode);
  }

  updateVehiclePosition(vehicleId: string, newPosition: Vector3): void {
    const vehicleNode = this.vehicleNodes.get(vehicleId);
    if (vehicleNode) {
      // Validate and clamp new position to bounds
      const validPosition = this.clampPositionToBounds(newPosition);
      vehicleNode.position = validPosition;
    }
  }

  removeVehicle(vehicleId: string): void {
    const vehicleNode = this.vehicleNodes.get(vehicleId);
    if (vehicleNode) {
      vehicleNode.dispose();
      this.vehicleNodes.delete(vehicleId);
    }
  }

  // Road and Infrastructure Methods
  addRoad(start: Vector3, end: Vector3): void {
    if (!this.modelFactory) return;

    // Validate and clamp road positions to bounds
    const validatedRoad = this.validateRoadBounds(start, end);
    
    // Only create road if both start and end are within bounds
    if (this.isPositionWithinBounds(validatedRoad.start) && 
        this.isPositionWithinBounds(validatedRoad.end)) {
      const roadNode = this.modelFactory.createRoad(validatedRoad.start, validatedRoad.end, this.mapConfig.roadWidth);
      this.roadNodes.push(roadNode);
    } else {
      console.warn('Road positions are outside map bounds, skipping road creation');
    }
  }

  clearAllRoads(): void {
    this.roadNodes.forEach(roadNode => roadNode.dispose());
    this.roadNodes = [];
  }

  // Utility Methods
  getCityPosition(cityId: string): Vector3 | null {
    const cityNode = this.cityNodes.get(cityId);
    return cityNode ? cityNode.position : null;
  }

  getIndustryPosition(industryId: string): Vector3 | null {
    const industryNode = this.industryNodes.get(industryId);
    return industryNode ? industryNode.position : null;
  }

  getVehiclePosition(vehicleId: string): Vector3 | null {
    const vehicleNode = this.vehicleNodes.get(vehicleId);
    return vehicleNode ? vehicleNode.position : null;
  }

  // Camera and View Methods
  focusOnCity(cityId: string, cameraService?: any): void {
    const position = this.getCityPosition(cityId);
    if (position && cameraService && cameraService.focusOnPosition) {
      cameraService.focusOnPosition(position, 25);
    }
  }

  focusOnIndustry(industryId: string, cameraService?: any): void {
    const position = this.getIndustryPosition(industryId);
    if (position && cameraService && cameraService.focusOnPosition) {
      cameraService.focusOnPosition(position, 20);
    }
  }

  // Performance and Optimization Methods
  /**
   * Enhanced performance optimization with comprehensive LOD system
   * Requirements: Performance optimization and LOD system
   */
  optimizeRendering(): void {
    if (!this.scene) return;

    // Freeze static meshes
    const staticMeshes = this.scene.meshes.filter(mesh => 
      mesh.metadata?.isStatic === true
    );
    
    staticMeshes.forEach(mesh => {
      mesh.freezeWorldMatrix();
      if (mesh.material) {
        mesh.material.freeze();
      }
    });

    // Enable comprehensive LOD system
    this.enableEnhancedLODSystem();
    
    // Start performance monitoring
    this.performanceMonitor.startMonitoring();
  }

  /**
   * Enhanced LOD system that includes environmental features
   * Requirements: Level-of-detail system for environmental features
   */
  private enableEnhancedLODSystem(): void {
    if (!this.scene) return;

    // Get current performance settings
    const settings = this.performanceConfig.getSettings();

    this.scene.registerBeforeRender(() => {
      const camera = this.scene!.activeCamera;
      if (!camera) return;

      const cameraPosition = camera.globalPosition;
      
      // Update performance metrics
      this.performanceMonitor.updateMeshCount(this.scene!.meshes.length);
      
      // Only apply LOD if enabled
      if (!settings.enableLOD) return;

      // Hide need icons when camera is too far away
      this.needIconNodes.forEach(iconNode => {
        const distance = Vector3.Distance(cameraPosition, iconNode.position);
        iconNode.setEnabled(distance < settings.needIconLODDistance);
      });

      // Reduce detail on distant cities and industries
      [...this.cityNodes.values(), ...this.industryNodes.values()].forEach(node => {
        const distance = Vector3.Distance(cameraPosition, node.position);
        
        // Hide small details when far away
        node.getChildMeshes().forEach(mesh => {
          if (mesh.name.includes('detail') || mesh.scaling.x < 0.5) {
            mesh.setEnabled(distance < settings.detailLODDistance);
          }
        });
      });

      // Apply LOD to environmental features
      this.applyEnvironmentalLOD(cameraPosition, settings);
    });
  }

  /**
   * Apply LOD specifically to environmental features
   */
  private applyEnvironmentalLOD(cameraPosition: Vector3, settings: PerformanceSettings): void {
    // Apply LOD to trees
    this.treeNodes.forEach((treeNode, treeId) => {
      const distance = Vector3.Distance(cameraPosition, treeNode.position);
      
      // For distant trees, use simplified models or hide them entirely
      if (distance > settings.treeLODDistance) {
        treeNode.setEnabled(false);
      } else {
        treeNode.setEnabled(true);
        
        // For medium distances, we could simplify the tree model
        // This would require having simplified tree models in the ModelFactoryService
        treeNode.getChildMeshes().forEach(mesh => {
          // Example: Reduce polygon count for distant trees (would need need implementation in ModelFactoryService)
          if (distance > settings.treeLODDistance * 0.7) {
            // Apply low-detail material or reduce complexity
            // This is a placeholder - actual implementation would depend on ModelFactoryService
          }
        });
      }
    });

    // Apply LOD to forests
    this.forestNodes.forEach((forestNode, forestId) => {
      const distance = Vector3.Distance(cameraPosition, forestNode.position);
      
      if (distance > settings.forestLODDistance) {
        forestNode.setEnabled(false);
      } else {
        forestNode.setEnabled(true);
        
        // For forests, we might render fewer trees or use billboard representations
        forestNode.getChildMeshes().forEach(mesh => {
          if (distance > settings.forestLODDistance * 0.6) {
            // Simplify forest representation at medium distances
          }
        });
      }
    });

    // Apply LOD to water bodies
    this.waterNodes.forEach((waterNode, waterId) => {
      const distance = Vector3.Distance(cameraPosition, waterNode.position);
      
      if (distance > settings.waterLODDistance) {
        waterNode.setEnabled(false);
      } else {
        waterNode.setEnabled(true);
        
        // For water bodies, we might reduce wave animation detail or texture resolution
        waterNode.getChildMeshes().forEach(mesh => {
          if (distance > settings.waterLODDistance * 0.5) {
            // Simplify water rendering at medium distances
          }
        });
      }
    });
  }

  // Grid Visualization Methods
  toggleGrid(visible?: boolean): boolean {
    return this.gridVisualizer.toggleGridVisibility(visible);
  }

  isGridVisible(): boolean {
    return this.gridVisualizer.isGridVisible();
  }

  updateGridPosition(centerX: number, centerZ: number): void {
    this.gridVisualizer.updateGridPosition(centerX, centerZ);
  }

  // Debug and Development Methods
  showDebugInfo(): void {
    console.log('Map Renderer Debug Info:');
    console.log(`Cities: ${this.cityNodes.size}`);
    console.log(`Industries: ${this.industryNodes.size}`);
    console.log(`Vehicles: ${this.vehicleNodes.size}`);
    console.log(`Need Icons: ${this.needIconNodes.size}`);
    console.log(`Roads: ${this.roadNodes.length}`);
    console.log(`Grid Visible: ${this.gridVisualizer.isGridVisible()}`);
    
    if (this.scene) {
      console.log(`Total Meshes: ${this.scene.meshes.length}`);
      console.log(`Total Materials: ${this.scene.materials.length}`);
    }
  }

  // Helper method to get city by ID (this would normally come from game state)
  private getCityById(cityId: string): City | null {
    // This is a placeholder - in the real implementation, this would
    // fetch from the game state service
    return null;
  }

  /**
   * Generate and render environmental features with performance considerations
   * Requirements: Environmental features generation with performance optimization
   */
  private generateEnvironmentalFeatures(terrainGrid?: any[][], terrainConfig?: any): void {
    if (!this.modelFactory) return;

    // Get performance settings
    const settings = this.performanceConfig.getSettings();

    // Create a seeded random generator for consistent environmental feature placement
    const rng = new SeededRandom(Date.now());

    try {
      // Count actual cities
      const actualCityCount = this.cityLayouts.size;
      
      // Generate trees with performance limits using new logic
      const treeCount = Math.min(
        Math.floor((this.mapConfig.terrainWidth * this.mapConfig.terrainHeight) / 1000),
        settings.maxTrees
      );
      const trees = this.environmentalFeatureService.generateTrees(
        this.mapConfig.terrainWidth,
        this.mapConfig.terrainHeight,
        treeCount,
        rng,
        terrainGrid,
        terrainConfig,
        actualCityCount // Pass actual city count
      );
      this.renderTrees(trees);

      // NOTE: Water bodies (rivers and lakes) are no longer generated as the new terrain
      // generation system handles water through its water level system
      // Commenting out old water body generation to prevent flat horizontal planes
      /*
      // Generate water bodies with performance limits
      const waterBodyCount = Math.min(
        Math.floor((this.mapConfig.terrainWidth * this.mapConfig.terrainHeight) / 20000),
        settings.maxWaterBodies
      );
      const waterBodies = this.environmentalFeatureService.generateWaterBodies(
        this.mapConfig.terrainWidth,
        this.mapConfig.terrainHeight,
        waterBodyCount,
        rng
      );
      this.renderWaterBodies(waterBodies);
      */

      // Generate resource forests (2 per city/town)
      const forestCount = actualCityCount * 2; // 2 forests per city as specified
      const resourceForests = this.environmentalFeatureService.generateResourceForests(
        this.mapConfig.terrainWidth,
        this.mapConfig.terrainHeight,
        forestCount, // Use actual count instead of estimated
        rng
      );
      
      // Render resource forests and trees within them
      resourceForests.forEach((forest: Forest) => {
        this.renderForest(forest);
        const forestTrees = this.environmentalFeatureService.generateTreesInForest(forest, rng);
        this.renderTrees(forestTrees);
      });

    } catch (error) {
      console.error('Error generating environmental features:', error);
    }
  }

  /**
   * Render trees on the map
   * Updated to use instanced trees for better performance
   */
  private renderTrees(trees: Tree[]): void {
    if (!this.modelFactory) return;

    trees.forEach((tree: Tree, index: number) => {
      // Validate tree position is within bounds
      const validPosition = this.clampPositionToBounds(tree.position);
      if (!this.isPositionWithinBounds(validPosition)) {
        return; // Skip trees outside bounds
      }

      try {
        if (this.modelFactory) {
          // Use instanced trees for better performance when marked as instanced
          if (tree.instanced) {
            // Create instanced tree for better performance
            this.modelFactory.createInstancedTree(tree.type, validPosition);
            // Note: For instanced trees, we don't store references in treeNodes map
            // as they are managed by the instancing system
          } else {
            // Fallback to regular tree model for non-instanced trees
            const treeNode = this.modelFactory.createTreeModel(tree.type, validPosition);
            treeNode.name = `tree_${tree.id}`;
            
            // Set trees to render above grid
            treeNode.getChildMeshes().forEach(mesh => {
              mesh.renderingGroupId = 2;
            });
            
            this.treeNodes.set(tree.id, treeNode);
          }
        }
      } catch (error) {
        console.warn(`Failed to render tree ${tree.id}:`, error);
      }
    });
  }

  /**
   * Render water bodies (rivers and lakes) on the map
   */
  private renderWaterBodies(waterBodies: Array<River | Lake>): void {
    if (!this.modelFactory) return;

    waterBodies.forEach((waterBody: River | Lake, index: number) => {
      try {
        let waterNode: TransformNode;
        
        if ('startPoint' in waterBody) {
          // River
          const river = waterBody as River;
          const validStart = this.clampPositionToBounds(river.startPoint);
          const validEnd = this.clampPositionToBounds(river.endPoint);
          
          if (this.isPositionWithinBounds(validStart) && this.isPositionWithinBounds(validEnd)) {
            if (this.modelFactory) {
              waterNode = this.modelFactory.createRiverModel(validStart, validEnd, river.width);
              waterNode.name = `river_${waterBody.id}`;
            } else {
              return; // Skip if modelFactory is not available
            }
          } else {
            return; // Skip rivers with invalid positions
          }
        } else if ('center' in waterBody && 'radius' in waterBody) {
          // Lake
          const lake = waterBody as Lake;
          const validCenter = this.clampPositionToBounds(lake.center);
          
          if (this.isPositionWithinBounds(validCenter)) {
            if (this.modelFactory) {
              waterNode = this.modelFactory.createLakeModel(validCenter, lake.radius);
              waterNode.name = `lake_${waterBody.id}`;
            } else {
              return; // Skip if modelFactory is not available
            }
          } else {
            return; // Skip lakes with invalid positions
          }
        } else {
          return; // Unknown water body type
        }
        
        // Set water bodies to render above grid
        waterNode.getChildMeshes().forEach(mesh => {
          mesh.renderingGroupId = 2;
        });
        
        this.waterNodes.set(waterBody.id, waterNode);
      } catch (error) {
        console.warn(`Failed to render water body ${waterBody.id}:`, error);
      }
    });
  }

  /**
   * Render a forest area on the map
   */
  private renderForest(forest: Forest): void {
    if (!this.modelFactory) return;

    try {
      const validCenter = this.clampPositionToBounds(forest.center);
      if (!this.isPositionWithinBounds(validCenter)) {
        return; // Skip forests with invalid positions
      }

      if (this.modelFactory) {
        const forestNode = this.modelFactory.createForestModel(validCenter, forest.radius);
        forestNode.name = `forest_${forest.id}`;
        
        // Set forest to render above grid
        forestNode.getChildMeshes().forEach(mesh => {
          mesh.renderingGroupId = 2;
        });
        
        this.forestNodes.set(forest.id, forestNode);
      }
    } catch (error) {
      console.warn(`Failed to render forest ${forest.id}:`, error);
    }
  }

  /**
   * Select tree type based on terrain type
   */
  private selectTreeTypeForTerrain(terrainType: string, rng: SeededRandom): 'oak' | 'pine' | 'birch' | 'willow' {
    const rand = rng.nextFloat();
    
    if (terrainType === 'grass') {
      // Grass: More oaks and pines
      if (rand < 0.4) return 'oak';
      if (rand < 0.7) return 'pine';
      if (rand < 0.9) return 'birch';
      return 'willow';
    } else if (terrainType === 'hill') {
      // Hill: More pines
      if (rand < 0.5) return 'pine';
      if (rand < 0.8) return 'oak';
      if (rand < 0.95) return 'birch';
      return 'willow';
    } else { // mountain
      // Mountain: More pines and birches
      if (rand < 0.6) return 'pine';
      if (rand < 0.8) return 'birch';
      if (rand < 0.9) return 'oak';
      return 'willow';
    }
  }

  // Add cleanup method for environmental features
  private clearEnvironmentalFeatures(): void {
    // Dispose all tree nodes
    this.treeNodes.forEach(node => node.dispose());
    this.treeNodes.clear();

    // Dispose all water nodes
    this.waterNodes.forEach(node => node.dispose());
    this.waterNodes.clear();

    // Dispose all forest nodes
    this.forestNodes.forEach(node => node.dispose());
    this.forestNodes.clear();
  }

  // Update dispose method to include environmental features
  dispose(): void {
    // Dispose all city nodes
    this.cityNodes.forEach(node => node.dispose());
    this.cityNodes.clear();

    // Dispose all industry nodes
    this.industryNodes.forEach(node => node.dispose());
    this.industryNodes.clear();

    // Dispose all vehicle nodes
    this.vehicleNodes.forEach(node => node.dispose());
    this.vehicleNodes.clear();

    // Dispose all need icon nodes
    this.needIconNodes.forEach(node => node.dispose());
    this.needIconNodes.clear();

    // Dispose all road nodes
    this.roadNodes.forEach(node => node.dispose());
    this.roadNodes = [];

    // Dispose all environmental feature nodes
    this.clearEnvironmentalFeatures();

    // Dispose terrain instances
    this.terrainInstances.forEach(instance => instance.dispose());
    this.terrainInstances = [];

    // Dispose grid visualizer
    this.gridVisualizer.dispose();

    this.scene = null;
    this.modelFactory = null;
  }

  /**
   * Generate and render environmental features with terrain data
   * Fix: Generate environmental features only after terrain is fully rendered
   */
  private generateEnvironmentalFeaturesWithTerrainData(terrainData: any, terrainConfig: any): void {
    if (!this.modelFactory) return;

    // Get performance settings
    const settings = this.performanceConfig.getSettings();

    // Create a seeded random generator for consistent environmental feature placement
    const rng = new SeededRandom(Date.now());

    try {
      // Count actual cities
      const actualCityCount = this.cityLayouts.size;
      
      // Generate trees with performance limits using terrain data
      const treeCount = Math.min(
        Math.floor((this.mapConfig.terrainWidth * this.mapConfig.terrainHeight) / 1000),
        settings.maxTrees
      );
      
      // Generate trees using the terrain-aware method
      const trees = this.generateTreesWithTerrain(terrainData, terrainConfig, rng, actualCityCount);
      this.renderTrees(trees);

      // Generate resource forests (2 per city/town)
      const forestCount = actualCityCount * 2; // 2 forests per city as specified
      const resourceForests = this.environmentalFeatureService.generateResourceForests(
        this.mapConfig.terrainWidth,
        this.mapConfig.terrainHeight,
        forestCount, // Use actual count instead of estimated
        rng
      );
      
      // Render resource forests and trees within them
      resourceForests.forEach((forest: Forest) => {
        this.renderForest(forest);
        const forestTrees = this.environmentalFeatureService.generateTreesInForest(forest, rng);
        this.renderTrees(forestTrees);
      });

    } catch (error) {
      console.error('Error generating environmental features:', error);
    }
  }

  /**
   * Generate trees with proper terrain integration
   * Fix: Implement proper tree distribution based on terrain type
   */
  private generateTreesWithTerrain(terrainData: any, terrainConfig: any, rng: SeededRandom, cityCount: number): Tree[] {
    const trees: Tree[] = [];
    
    // Follow tree generation rules: place scattered trees on only 1/3 of non-water terrain blocks
    for (const [x, y] of terrainData.coordinates) {
      const terrainType = terrainData.getTerrainType(x, y);
      const terrainHeight = terrainData.getHeight(x, y);
      
      // Skip water, sand, and peak height blocks
      if (terrainType === 'water' || terrainType === 'sand' || 
          terrainHeight >= terrainData.getMaxHeight()) {
        continue;
      }
      
      // Only place trees on 1/3 of eligible blocks
      if (rng.nextFloat() >= 1/3) {
        continue;
      }
      
      // Determine number of trees based on terrain type
      let treeCount = 0;
      if (terrainType === 'mountain') {
        treeCount = Math.floor(rng.nextFloat() * 3); // 0-2 trees
      } else {
        treeCount = Math.floor(rng.nextFloat() * 4); // 0-3 trees
      }
      
      // Create trees with proper terrain alignment
      for (let i = 0; i < treeCount; i++) {
        trees.push({
          id: `tree_${x}_${y}_${i}_${rng.nextInt(1000, 9999)}`,
          position: new Vector3(x, terrainHeight * 0.5, y), // Apply vertical scale
          type: this.selectTreeTypeForTerrain(terrainType, rng),
          instanced: true,
          height: terrainHeight
        });
      }
    }
    
    return trees;
  }
}
