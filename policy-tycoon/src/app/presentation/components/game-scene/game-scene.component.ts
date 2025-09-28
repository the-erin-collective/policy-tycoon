import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { BabylonEngineService } from '../../services/babylon-engine.service';
import { ModelFactoryService } from '../../services/model-factory.service';
import { MapRendererService } from '../../services/map-renderer.service';
import { UIOverlayService } from '../../services/ui-overlay.service';
import { Vector3, PickingInfo } from '@babylonjs/core';
import { CityTier, IndustryType, VehicleType, NeedType } from '../../../data/models/enums';
import { City } from '../../../data/models/core-entities';

@Component({
  selector: 'app-game-scene',
  standalone: true,
  template: `
    <canvas 
      #babylonCanvas 
      class="game-canvas"
      [style.width.%]="100"
      [style.height.%]="100"
      (pointerdown)="onCanvasClick($event)"
      (pointermove)="onCanvasHover($event)">
    </canvas>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    .game-canvas {
      display: block;
      outline: none;
      touch-action: none;
      cursor: pointer;
    }
  `]
})
export class GameSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('babylonCanvas', { static: true }) 
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private isInitialized = false;

  constructor(
    private babylonEngine: BabylonEngineService,
    private modelFactory: ModelFactoryService,
    private mapRenderer: MapRendererService,
    private uiOverlay: UIOverlayService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.initializeScene();
      this.createDemoContent();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize game scene:', error);
    }
  }

  private async initializeScene(): Promise<void> {
    // Initialize BabylonJS engine
    await this.babylonEngine.initializeEngine(this.canvasRef);
    
    const scene = this.babylonEngine.getScene();
    if (!scene) {
      throw new Error('Failed to create BabylonJS scene');
    }

    // Initialize all services
    this.modelFactory.initialize(scene);
    this.mapRenderer.initialize(scene);
    this.uiOverlay.initialize(scene);

    // Wire up grid toggle functionality
    this.uiOverlay.setGridToggleCallback(() => {
      return this.mapRenderer.toggleGrid();
    });

    // Enable performance optimizations
    this.babylonEngine.enablePerformanceOptimizations();
    this.mapRenderer.optimizeRendering();

    console.log('3D visualization system initialized successfully');
  }

  private createDemoContent(): void {
    // Create demo cities to showcase the visualization system with proper City interface
    const demoCities: City[] = [
      {
        id: 'city1',
        name: 'New Haven',
        position: new Vector3(-30, 0, -20),
        tier: CityTier.SmallTown,
        population: 750,
        currentNeeds: [],
        unmetNeeds: [
          { type: NeedType.Wood, priority: 8, satisfactionLevel: 20, daysUnsatisfied: 15, iconVisible: true },
          { type: NeedType.Food, priority: 6, satisfactionLevel: 30, daysUnsatisfied: 8, iconVisible: true }
        ],
        needSatisfactionHistory: [],
        ideology: { progressive: 45, conservative: 55, driftRate: 0.1, lastUpdated: new Date() },
        approvalRating: 65,
        costOfLiving: 95,
        averageWage: 45000,
        unemployment: 0.08,
        connectedTransport: [],
        availableServices: []
      },
      {
        id: 'city2', 
        name: 'Riverside',
        position: new Vector3(40, 0, 30),
        tier: CityTier.UrbanCentre,
        population: 12000,
        currentNeeds: [],
        unmetNeeds: [
          { type: NeedType.Electricity, priority: 9, satisfactionLevel: 10, daysUnsatisfied: 25, iconVisible: true },
          { type: NeedType.Construction, priority: 7, satisfactionLevel: 40, daysUnsatisfied: 12, iconVisible: true },
          { type: NeedType.Safety, priority: 5, satisfactionLevel: 60, daysUnsatisfied: 5, iconVisible: true }
        ],
        needSatisfactionHistory: [],
        ideology: { progressive: 60, conservative: 40, driftRate: 0.05, lastUpdated: new Date() },
        approvalRating: 72,
        costOfLiving: 110,
        averageWage: 52000,
        unemployment: 0.06,
        connectedTransport: [],
        availableServices: []
      },
      {
        id: 'city3',
        name: 'Greenfield',
        position: new Vector3(-50, 0, 40),
        tier: CityTier.Hamlet,
        population: 320,
        currentNeeds: [],
        unmetNeeds: [
          { type: NeedType.Wood, priority: 7, satisfactionLevel: 35, daysUnsatisfied: 10, iconVisible: true }
        ],
        needSatisfactionHistory: [],
        ideology: { progressive: 35, conservative: 65, driftRate: 0.02, lastUpdated: new Date() },
        approvalRating: 58,
        costOfLiving: 85,
        averageWage: 38000,
        unemployment: 0.12,
        connectedTransport: [],
        availableServices: []
      },
      {
        id: 'city4',
        name: 'Metroplex',
        position: new Vector3(0, 0, -60),
        tier: CityTier.Metropolis,
        population: 280000,
        currentNeeds: [],
        unmetNeeds: [
          { type: NeedType.ConsumerGoods, priority: 8, satisfactionLevel: 25, daysUnsatisfied: 18, iconVisible: true },
          { type: NeedType.CleanAir, priority: 9, satisfactionLevel: 15, daysUnsatisfied: 30, iconVisible: true }
        ],
        needSatisfactionHistory: [],
        ideology: { progressive: 70, conservative: 30, driftRate: 0.08, lastUpdated: new Date() },
        approvalRating: 78,
        costOfLiving: 135,
        averageWage: 68000,
        unemployment: 0.04,
        connectedTransport: [],
        availableServices: []
      }
    ];

    // Render demo cities with improved layouts
    demoCities.forEach(city => {
      this.mapRenderer.renderCity(city);
    });

    // Create demo industries
    const demoIndustries = [
      {
        id: 'industry1',
        type: IndustryType.Factory,
        position: new Vector3(20, 0, -30),
        constructionStatus: 'complete' as const,
        operationalStatus: 'operating' as const
      },
      {
        id: 'industry2',
        type: IndustryType.Farm,
        position: new Vector3(-60, 0, 10),
        constructionStatus: 'complete' as const,
        operationalStatus: 'operating' as const
      },
      {
        id: 'industry3',
        type: IndustryType.PowerPlant,
        position: new Vector3(60, 0, -10),
        constructionStatus: 'under-construction' as const,
        operationalStatus: 'dormant' as const
      }
    ];

    // Render demo industries
    demoIndustries.forEach(industry => {
      this.mapRenderer.renderIndustry(industry as any);
    });

    // Create demo vehicles
    const demoVehicles = [
      {
        id: 'vehicle1',
        type: VehicleType.Truck,
        position: new Vector3(0, 0, -40)
      },
      {
        id: 'vehicle2',
        type: VehicleType.Train,
        position: new Vector3(-20, 0, 0)
      }
    ];

    // Render demo vehicles
    demoVehicles.forEach(vehicle => {
      this.mapRenderer.renderVehicle(vehicle as any);
    });

    // Update HUD with demo data
    this.uiOverlay.updateGameInfo({
      population: demoCities.reduce((sum, city) => sum + city.population, 0),
      approval: Math.round(demoCities.reduce((sum, city) => sum + city.approvalRating, 0) / demoCities.length),
      treasury: 2500000,
      gameSpeed: '×4',
      isPaused: false
    });

    // Show welcome notification
    this.uiOverlay.showNotification('3D Visualization System Loaded', 'info', 4000);
  }

  onCanvasClick(event: PointerEvent): void {
    if (!this.isInitialized) return;

    const scene = this.babylonEngine.getScene();
    if (!scene) return;

    // Get picking ray from mouse position
    const pickInfo = scene.pick(event.offsetX, event.offsetY);
    
    if (pickInfo?.hit && pickInfo.pickedMesh) {
      this.handleMeshClick(pickInfo);
    }
  }

  onCanvasHover(event: PointerEvent): void {
    if (!this.isInitialized) return;

    const scene = this.babylonEngine.getScene();
    if (!scene) return;

    // Get picking ray from mouse position
    const pickInfo = scene.pick(event.offsetX, event.offsetY);
    
    if (pickInfo?.hit && pickInfo.pickedMesh) {
      this.handleMeshHover(pickInfo, event.clientX, event.clientY);
    } else {
      this.uiOverlay.hideTooltip();
    }
  }

  private handleMeshClick(pickInfo: PickingInfo): void {
    const mesh = pickInfo.pickedMesh;
    if (!mesh) return;

    // Handle different types of clicked objects
    if (mesh.parent?.name.includes('city')) {
      const cityId = mesh.parent.name.split('_')[1];
      this.mapRenderer.focusOnCity(cityId, this.babylonEngine);
      this.uiOverlay.showNotification(`Focused on city: ${cityId}`, 'info');
    } else if (mesh.parent?.name.includes('industry')) {
      const industryId = mesh.parent.name.split('_')[1];
      this.mapRenderer.focusOnIndustry(industryId, this.babylonEngine);
      this.uiOverlay.showNotification(`Focused on industry: ${industryId}`, 'info');
    }
  }

  private handleMeshHover(pickInfo: PickingInfo, screenX: number, screenY: number): void {
    const mesh = pickInfo.pickedMesh;
    if (!mesh) return;

    // Show tooltips for different object types
    if (mesh.parent?.name.includes('city')) {
      const tierString = mesh.parent.name.split('_')[1];
      const cityTier = parseInt(tierString) as CityTier;
      this.uiOverlay.showCityTooltip({
        name: this.getCityNameFromTier(cityTier),
        population: this.getCityPopulationFromTier(cityTier),
        tier: this.getTierDisplayName(cityTier),
        needs: this.getCityNeedsFromTier(cityTier),
        approval: 65 + Math.floor(Math.random() * 20)
      }, screenX, screenY);
    } else if (mesh.parent?.name.includes('industry')) {
      const industryType = mesh.parent.name.split('_')[1] as IndustryType;
      this.uiOverlay.showIndustryTooltip(
        this.getIndustryDisplayName(industryType),
        industryType,
        'Operating',
        screenX,
        screenY
      );
    } else {
      this.uiOverlay.hideTooltip();
    }
  }

  // Helper methods for demo data
  private getCityNameFromTier(tier: CityTier): string {
    const names = ['Hamlet Village', 'Small Town', 'Growing Town', 'Urban Centre', 'Expanding City', 'Metropolis', 'Advanced City'];
    return names[tier] || 'Unknown City';
  }

  private getCityPopulationFromTier(tier: CityTier): number {
    const populations = [320, 750, 2500, 12000, 45000, 250000, 800000];
    return populations[tier] || 1000;
  }

  private getTierDisplayName(tier: CityTier): string {
    return CityTier[tier] || 'Unknown';
  }

  private getCityNeedsFromTier(tier: CityTier): string[] {
    const needsByTier: { [key in CityTier]: string[] } = {
      [CityTier.Hamlet]: ['Wood'],
      [CityTier.SmallTown]: ['Wood', 'Food'],
      [CityTier.GrowingTown]: ['Fuel', 'Wood'],
      [CityTier.UrbanCentre]: ['Electricity', 'Construction'],
      [CityTier.ExpandingCity]: ['Food', 'Construction', 'Safety'],
      [CityTier.Metropolis]: ['Consumer Goods', 'Safety', 'Clean Air'],
      [CityTier.AdvancedCity]: ['Culture', 'Clean Air']
    };
    return needsByTier[tier] || [];
  }

  private getIndustryDisplayName(type: IndustryType): string {
    const displayNames: { [key in IndustryType]: string } = {
      [IndustryType.Factory]: 'Manufacturing Plant',
      [IndustryType.Farm]: 'Agricultural Farm',
      [IndustryType.PowerPlant]: 'Power Generation Plant',
      [IndustryType.Mining]: 'Mining Operation',
      [IndustryType.Logging]: 'Logging Camp',
      [IndustryType.OilRefinery]: 'Oil Refinery',
      [IndustryType.Hospital]: 'Medical Center',
      [IndustryType.School]: 'Educational Facility',
      [IndustryType.University]: 'University Campus'
    };
    return displayNames[type] || 'Industrial Facility';
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.babylonEngine.getEngine()) {
      this.babylonEngine.getEngine()?.resize();
    }
  }

  ngOnDestroy(): void {
    this.uiOverlay.dispose();
    this.mapRenderer.dispose();
    this.babylonEngine.dispose();
  }
}