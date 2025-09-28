import { Injectable } from '@angular/core';
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  Mesh,
  Tools,
  Animation,
  IAnimationKey,
  InstancedMesh
} from '@babylonjs/core';
import { CityTier, IndustryType, VehicleType, NeedType } from '../../data/models/enums';

export interface ModelColors {
  grass: Color3;
  roadDark: Color3;
  curb: Color3;
  stripe: Color3;
  water: Color3;
  concrete: Color3;
  crop: Color3;
  treeTrunk: Color3;
  treeLeaf: Color3;
  rail: Color3;
  sleeper: Color3;
  train: Color3;
  buildingA: Color3;
  buildingB: Color3;
  buildingC: Color3;
  buildingD: Color3;
  roof: Color3;
  house: Color3;
  factory: Color3;
  smoke: Color3;
}

// Add additional colors for environmental features
export interface ExtendedModelColors extends ModelColors {
  oakTrunk: Color3;
  oakLeaf: Color3;
  pineTrunk: Color3;
  pineLeaf: Color3;
  birchTrunk: Color3;
  birchLeaf: Color3;
  willowTrunk: Color3;
  willowLeaf: Color3;
  lake: Color3;
  river: Color3;
  forest: Color3;
}

@Injectable({
  providedIn: 'root'
})
export class ModelFactoryService {
  private scene: Scene | null = null;
  private colors: ExtendedModelColors;
  
  // Base meshes for instancing
  private baseTreeTrunk: Mesh | null = null;
  private baseTreeCrown: Mesh | null = null;

  constructor() {
    // Define the color palette based on the demo scene
    this.colors = {
      grass: new Color3(0.46, 0.76, 0.36),
      roadDark: new Color3(0.18, 0.18, 0.18),
      curb: new Color3(0.88, 0.88, 0.88),
      stripe: new Color3(0.75, 0.75, 0.75),
      water: new Color3(0.22, 0.56, 0.86),
      concrete: new Color3(0.65, 0.7, 0.73),
      crop: new Color3(0.98, 0.78, 0.22),
      treeTrunk: new Color3(0.5, 0.3, 0.15),
      treeLeaf: new Color3(0.23, 0.66, 0.34),
      rail: new Color3(0.2, 0.2, 0.2),
      sleeper: new Color3(0.35, 0.27, 0.2),
      train: new Color3(0.18, 0.64, 0.26),
      buildingA: new Color3(0.91, 0.4, 0.2),
      buildingB: new Color3(0.15, 0.66, 0.74),
      buildingC: new Color3(0.54, 0.76, 0.78),
      buildingD: new Color3(0.98, 0.55, 0.2),
      roof: new Color3(0.62, 0.28, 0.18),
      house: new Color3(0.93, 0.38, 0.22),
      factory: new Color3(0.65, 0.7, 0.73),
      smoke: new Color3(0.8, 0.8, 0.8),
      // Additional colors for environmental features
      oakTrunk: new Color3(0.4, 0.25, 0.1),
      oakLeaf: new Color3(0.2, 0.6, 0.25),
      pineTrunk: new Color3(0.35, 0.2, 0.05),
      pineLeaf: new Color3(0.15, 0.5, 0.2),
      birchTrunk: new Color3(0.85, 0.8, 0.7),
      birchLeaf: new Color3(0.4, 0.7, 0.45),
      willowTrunk: new Color3(0.45, 0.3, 0.15),
      willowLeaf: new Color3(0.3, 0.6, 0.35),
      lake: new Color3(0.2, 0.5, 0.8),
      river: new Color3(0.15, 0.45, 0.75),
      forest: new Color3(0.3, 0.6, 0.3)
    };
  }

  initialize(scene: Scene): void {
    this.scene = scene;
  }

  private createMaterial(name: string, color: Color3, alpha: number = 1): StandardMaterial {
    if (!this.scene) throw new Error('Scene not initialized');
    
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color.clone();
    material.specularColor = new Color3(0, 0, 0); // No specular for low-poly look
    material.alpha = alpha;
    return material;
  }

  // City Models
  createCityModel(tier: CityTier, position: Vector3): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const cityNode = new TransformNode(`city_${tier}`, this.scene);
    cityNode.position = position;

    switch (tier) {
      case CityTier.Hamlet:
        this.createHamlet(cityNode);
        break;
      case CityTier.SmallTown:
        this.createSmallTown(cityNode);
        break;
      case CityTier.GrowingTown:
        this.createGrowingTown(cityNode);
        break;
      case CityTier.UrbanCentre:
        this.createUrbanCentre(cityNode);
        break;
      case CityTier.ExpandingCity:
        this.createExpandingCity(cityNode);
        break;
      case CityTier.Metropolis:
        this.createMetropolis(cityNode);
        break;
      case CityTier.AdvancedCity:
        this.createAdvancedCity(cityNode);
        break;
    }

    // Mark as static for performance optimization
    cityNode.getChildMeshes().forEach(mesh => {
      mesh.metadata = { isStatic: true };
    });

    return cityNode;
  }

  private createHamlet(parent: TransformNode): void {
    // Small cluster of 2-3 houses
    this.createHouse(parent, -1, 0);
    this.createHouse(parent, 1, 0);
    this.createTree(parent, 0, 2);
  }

  private createSmallTown(parent: TransformNode): void {
    // 4-6 houses in a small grid
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        this.createHouse(parent, (i - 0.5) * 2, (j - 1) * 2);
      }
    }
    this.createTree(parent, 3, 0);
    this.createTree(parent, -3, 0);
  }

  private createGrowingTown(parent: TransformNode): void {
    // Mix of houses and small buildings
    this.createSmallTown(parent);
    this.createMidRise(parent, 0, -4, this.colors.buildingA, 2.5);
    this.createMidRise(parent, 2, -4, this.colors.buildingB, 2.0);
  }

  private createUrbanCentre(parent: TransformNode): void {
    // Denser building layout with some mid-rises
    this.createGrowingTown(parent);
    this.createMidRise(parent, -2, -4, this.colors.buildingC, 3.0);
    this.createMidRise(parent, 4, 2, this.colors.buildingD, 2.8);
  }

  private createExpandingCity(parent: TransformNode): void {
    // Larger buildings and more density
    this.createUrbanCentre(parent);
    this.createMidRise(parent, -4, 0, this.colors.buildingA, 4.0);
    this.createMidRise(parent, 4, -2, this.colors.buildingB, 3.5);
    this.createMidRise(parent, 0, 4, this.colors.buildingC, 3.8);
  }

  private createMetropolis(parent: TransformNode): void {
    // High-density urban area
    this.createExpandingCity(parent);
    this.createMidRise(parent, -3, 3, this.colors.buildingD, 5.0);
    this.createMidRise(parent, 3, 3, this.colors.buildingA, 4.5);
    this.createMidRise(parent, -5, -2, this.colors.buildingB, 4.8);
  }

  private createAdvancedCity(parent: TransformNode): void {
    // Maximum density with tallest buildings
    this.createMetropolis(parent);
    this.createMidRise(parent, 0, -6, this.colors.buildingC, 6.0);
    this.createMidRise(parent, -2, 6, this.colors.buildingD, 5.5);
    this.createMidRise(parent, 6, 0, this.colors.buildingA, 5.8);
  }

  createHouse(parent: TransformNode, x: number, z: number): Mesh {
    if (!this.scene) throw new Error('Scene not initialized');

    const houseNode = new TransformNode('house', this.scene);
    houseNode.position.set(x, 0, z);
    houseNode.parent = parent;

    const bodyHeight = 0.9;
    const body = MeshBuilder.CreateBox('houseBody', { width: 1.4, depth: 1.2, height: bodyHeight }, this.scene);
    body.material = this.createMaterial('houseMaterial', this.colors.house);
    body.position.y = bodyHeight / 2;
    body.parent = houseNode;

    const roofHeight = 0.5;
    const roof = MeshBuilder.CreateCylinder('houseRoof', { 
      diameterTop: 0, 
      diameterBottom: 1.45, 
      height: roofHeight, 
      tessellation: 4 
    }, this.scene);
    roof.rotation.y = Math.PI / 4;
    roof.material = this.createMaterial('roofMaterial', this.colors.roof);
    roof.position.y = bodyHeight + roofHeight / 2;
    roof.parent = houseNode;

    return body;
  }

  createMidRise(parent: TransformNode, x: number, z: number, color: Color3, height: number = 3.2): Mesh {
    if (!this.scene) throw new Error('Scene not initialized');

    const buildingNode = new TransformNode('midrise', this.scene);
    buildingNode.position.set(x, 0, z);
    buildingNode.parent = parent;

    const body = MeshBuilder.CreateBox('buildingBody', { width: 2, depth: 2, height }, this.scene);
    body.material = this.createMaterial('buildingMaterial', color);
    body.position.y = height / 2;
    body.parent = buildingNode;

    const cap = MeshBuilder.CreateBox('buildingCap', { width: 2.1, depth: 2.1, height: 0.2 }, this.scene);
    cap.material = this.createMaterial('capMaterial', this.colors.roof);
    cap.position.y = height + 0.1;
    cap.parent = buildingNode;

    return body;
  }

  private createTree(parent: TransformNode, x: number, z: number): void {
    if (!this.scene) throw new Error('Scene not initialized');

    const treeNode = new TransformNode('tree', this.scene);
    treeNode.position.set(x, 0, z);
    treeNode.parent = parent;

    const trunk = MeshBuilder.CreateCylinder('trunk', { diameter: 0.35, height: 1.2 }, this.scene);
    trunk.material = this.createMaterial('trunkMaterial', this.colors.treeTrunk);
    trunk.position.y = 0.6;
    trunk.parent = treeNode;

    const crown = MeshBuilder.CreateCylinder('crown', { 
      diameterTop: 0, 
      diameterBottom: 1.4, 
      height: 1.6, 
      tessellation: 6 
    }, this.scene);
    crown.material = this.createMaterial('leafMaterial', this.colors.treeLeaf);
    crown.position.y = 1.6;
    crown.parent = treeNode;
  }

  // Update the createTree method to be public and support different tree types
  createTreeModel(type: 'oak' | 'pine' | 'birch' | 'willow', position: Vector3): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const treeNode = new TransformNode(`tree_${type}`, this.scene);
    treeNode.position = position;

    let trunkColor: Color3;
    let leafColor: Color3;
    let trunkHeight: number;
    let trunkDiameter: number;
    let scale: number;

    // Set properties based on tree type
    switch (type) {
      case 'oak':
        trunkColor = new Color3(0.4, 0.25, 0.1);
        leafColor = new Color3(0.2, 0.6, 0.25);
        trunkHeight = 1.5;
        trunkDiameter = 0.35;
        scale = 1.0;
        break;
      case 'pine':
        trunkColor = new Color3(0.35, 0.2, 0.05);
        leafColor = new Color3(0.15, 0.5, 0.2);
        trunkHeight = 1.2;
        trunkDiameter = 0.35;
        scale = 1.0;
        break;
      case 'birch':
        trunkColor = new Color3(0.85, 0.8, 0.7);
        leafColor = new Color3(0.4, 0.7, 0.45);
        trunkHeight = 1.8;
        trunkDiameter = 0.3;
        scale = 1.0;
        break;
      case 'willow':
        trunkColor = new Color3(0.45, 0.3, 0.15);
        leafColor = new Color3(0.3, 0.6, 0.35);
        trunkHeight = 1.3;
        trunkDiameter = 0.4;
        scale = 1.0;
        break;
      default:
        trunkColor = this.colors.treeTrunk;
        leafColor = this.colors.treeLeaf;
        trunkHeight = 1.2;
        trunkDiameter = 0.35;
        scale = 1.0;
    }
    
    // Apply the scale factor from the demo (scale = 4 in the demo)
    const demoScale = 4;
    trunkHeight = trunkHeight / demoScale;
    trunkDiameter = trunkDiameter / demoScale;
    scale = scale / demoScale;

    // Create trunk
    const trunk = MeshBuilder.CreateCylinder('trunk', { 
      diameter: trunkDiameter, 
      height: trunkHeight,
      tessellation: 5
    }, this.scene);
    trunk.material = this.createMaterial('trunkMaterial', trunkColor);
    trunk.position.y = trunkHeight / 2;
    trunk.parent = treeNode;

    // Create the improved multi-layer crown from the demo
    const yOffset = -0.1 / demoScale;
    const baseY = trunkHeight + yOffset;
    
    // First crown layer
    const d1 = (1.4 / demoScale) / scale, h1 = d1 / 2;
    const crown1 = MeshBuilder.CreateCylinder('crown1', { 
      diameterTop: 0, 
      diameterBottom: d1, 
      height: h1, 
      tessellation: 6 
    }, this.scene);
    crown1.material = this.createMaterial('leafMaterial', leafColor);
    crown1.position.y = baseY + h1 / 2;
    crown1.parent = treeNode;

    // Spacing between crown layers
    const spacing1_2 = ((1.2 / demoScale) / scale) * 0.4;
    const spacing2_3 = ((1.1 / demoScale) / scale) * 0.4;

    // Second crown layer
    const d2 = (1.1 / demoScale) / scale, h2 = d2 / 2;
    const crown2 = MeshBuilder.CreateCylinder('crown2', { 
      diameterTop: 0, 
      diameterBottom: d2, 
      height: h2, 
      tessellation: 6 
    }, this.scene);
    crown2.material = this.createMaterial('leafMaterial', leafColor);
    crown2.position.y = baseY + spacing1_2 + (h2 / 2);
    crown2.parent = treeNode;

    // Third crown layer
    const d3 = (0.8 / demoScale) / scale, h3 = d3 / 2;
    const crown3 = MeshBuilder.CreateCylinder('crown3', { 
      diameterTop: 0, 
      diameterBottom: d3, 
      height: h3, 
      tessellation: 6 
    }, this.scene);
    crown3.material = this.createMaterial('leafMaterial', leafColor);
    crown3.position.y = baseY + spacing1_2 + spacing2_3 + (h3 / 2);
    crown3.parent = treeNode;

    return treeNode;
  }

  /**
   * Create a river model
   * Requirements: 5.2
   */
  createRiverModel(start: Vector3, end: Vector3, width: number): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const riverNode = new TransformNode('river', this.scene);
    
    const direction = end.subtract(start);
    const length = direction.length();
    const center = start.add(direction.scale(0.5));
    
    // Create river as a flattened box
    const river = MeshBuilder.CreateBox('riverSegment', { 
      width: length, 
      height: 0.05, 
      depth: width 
    }, this.scene);
    
    river.material = this.createMaterial('riverMaterial', new Color3(0.15, 0.45, 0.75));
    river.position = center;
    river.position.y = 0.025;
    river.rotation.y = Math.atan2(direction.x, direction.z);
    river.parent = riverNode;
    
    riverNode.getChildMeshes().forEach(mesh => {
      mesh.metadata = { isStatic: true };
    });
    
    return riverNode;
  }

  /**
   * Create a lake model
   * Requirements: 5.2
   */
  createLakeModel(center: Vector3, radius: number): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const lakeNode = new TransformNode('lake', this.scene);
    lakeNode.position = center;
    
    // Create lake as a circular ground
    const lake = MeshBuilder.CreateDisc('lakeSurface', { radius: radius, tessellation: 32 }, this.scene);
    lake.material = this.createMaterial('lakeMaterial', new Color3(0.2, 0.5, 0.8));
    lake.rotation.x = Math.PI / 2; // Rotate to horizontal
    lake.parent = lakeNode;
    
    lakeNode.getChildMeshes().forEach(mesh => {
      mesh.metadata = { isStatic: true };
    });
    
    return lakeNode;
  }

  /**
   * Create a forest model (visual representation of a forest area)
   * Requirements: 5.3
   */
  createForestModel(center: Vector3, radius: number): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const forestNode = new TransformNode('forest', this.scene);
    forestNode.position = center;
    
    // Create forest as a circular ground with a slightly different color
    const forest = MeshBuilder.CreateDisc('forestArea', { radius: radius, tessellation: 32 }, this.scene);
    forest.material = this.createMaterial('forestMaterial', new Color3(0.3, 0.6, 0.3), 0.3); // Semi-transparent
    forest.rotation.x = Math.PI / 2; // Rotate to horizontal
    forest.parent = forestNode;
    
    forestNode.getChildMeshes().forEach(mesh => {
      mesh.metadata = { isStatic: true };
    });
    
    return forestNode;
  }

  // Industry Models
  createIndustryModel(type: IndustryType, position: Vector3): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const industryNode = new TransformNode(`industry_${type}`, this.scene);
    industryNode.position = position;

    switch (type) {
      case IndustryType.Factory:
        this.createFactory(industryNode);
        break;
      case IndustryType.Farm:
        this.createFarm(industryNode);
        break;
      case IndustryType.PowerPlant:
        this.createPowerPlant(industryNode);
        break;
      case IndustryType.Mining:
        this.createMine(industryNode);
        break;
      case IndustryType.Logging:
        this.createLoggingCamp(industryNode);
        break;
      default:
        this.createGenericIndustry(industryNode);
    }

    // Mark as static for performance optimization
    industryNode.getChildMeshes().forEach(mesh => {
      mesh.metadata = { isStatic: true };
    });

    return industryNode;
  }

  private createFactory(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    const baseHeight = 1.2;
    const base = MeshBuilder.CreateBox('factoryBase', { width: 3.5, depth: 2.2, height: baseHeight }, this.scene);
    base.material = this.createMaterial('factoryMaterial', this.colors.factory);
    base.position.y = baseHeight / 2;
    base.parent = parent;

    const annexHeight = 0.8;
    const annex = MeshBuilder.CreateBox('factoryAnnex', { width: 1.6, depth: 1.1, height: annexHeight }, this.scene);
    annex.material = this.createMaterial('annexMaterial', this.colors.buildingA);
    annex.position.set(-1.0, annexHeight / 2, 0.8);
    annex.parent = parent;

    // Smokestacks
    const stackHeight = 2.6;
    const stackBaseY = baseHeight + stackHeight / 2;
    
    [-0.9, 0.9].forEach(offsetX => {
      const stack = MeshBuilder.CreateCylinder('smokestack', { 
        diameter: 0.5, 
        height: stackHeight, 
        tessellation: 12 
      }, this.scene);
      stack.material = this.createMaterial('stackMaterial', new Color3(0.95, 0.95, 0.95));
      stack.position.set(offsetX, stackBaseY, -0.5);
      stack.parent = parent;

      // Add animated smoke
      this.createAnimatedSmoke(parent, new Vector3(offsetX, stackBaseY + stackHeight / 2, -0.5));
    });
  }

  private createFarm(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    // Create field base
    const base = MeshBuilder.CreateGround('fieldBase', { width: 7, height: 5 }, this.scene);
    base.position.y = 0.021;
    base.material = this.createMaterial('fieldMaterial', this.colors.grass.scale(0.95));
    base.parent = parent;

    // Create crop tiles
    const cropMaterial = this.createMaterial('cropMaterial', this.colors.crop);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        const crop = MeshBuilder.CreateBox('crop', { width: 0.9, height: 0.2, depth: 0.9 }, this.scene);
        crop.material = cropMaterial;
        crop.position.set(-2.25 + i * 0.9, 0.14, -1.35 + j * 0.9);
        crop.parent = parent;
      }
    }

    // Add a small farmhouse
    this.createHouse(parent, 4, 0);
  }

  private createPowerPlant(parent: TransformNode): void {
    this.createFactory(parent);
    
    // Add power lines (simple representation)
    if (!this.scene) return;
    
    const pole = MeshBuilder.CreateCylinder('powerPole', { diameter: 0.1, height: 3 }, this.scene);
    pole.material = this.createMaterial('poleMaterial', this.colors.concrete);
    pole.position.set(4, 1.5, 0);
    pole.parent = parent;
  }

  private createMine(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    // Mine entrance
    const entrance = MeshBuilder.CreateBox('mineEntrance', { width: 2, depth: 1, height: 2 }, this.scene);
    entrance.material = this.createMaterial('mineMaterial', this.colors.concrete.scale(0.7));
    entrance.position.y = 1;
    entrance.parent = parent;

    // Conveyor structure
    const conveyor = MeshBuilder.CreateBox('conveyor', { width: 0.5, depth: 4, height: 0.3 }, this.scene);
    conveyor.material = this.createMaterial('conveyorMaterial', this.colors.rail);
    conveyor.position.set(2, 0.5, 0);
    conveyor.parent = parent;
  }

  private createLoggingCamp(parent: TransformNode): void {
    // Simple logging camp with trees and equipment
    this.createTree(parent, -2, -2);
    this.createTree(parent, -1, -3);
    this.createTree(parent, 0, -2);
    
    // Equipment shed
    this.createHouse(parent, 2, 0);
  }

  private createGenericIndustry(parent: TransformNode): void {
    // Default industrial building
    this.createMidRise(parent, 0, 0, this.colors.factory, 2.0);
  }

  // Vehicle Models
  createVehicleModel(type: VehicleType, position: Vector3): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const vehicleNode = new TransformNode(`vehicle_${type}`, this.scene);
    vehicleNode.position = position;

    switch (type) {
      case VehicleType.Truck:
        this.createTruck(vehicleNode);
        break;
      case VehicleType.Train:
        this.createTrain(vehicleNode);
        break;
      case VehicleType.Ship:
        this.createShip(vehicleNode);
        break;
      case VehicleType.Plane:
        this.createPlane(vehicleNode);
        break;
    }

    return vehicleNode;
  }

  private createTruck(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    // Truck cab
    const cab = MeshBuilder.CreateBox('truckCab', { width: 1.2, depth: 0.8, height: 0.8 }, this.scene);
    cab.material = this.createMaterial('truckMaterial', this.colors.train);
    cab.position.set(0, 0.4, 0.6);
    cab.parent = parent;

    // Truck bed
    const bed = MeshBuilder.CreateBox('truckBed', { width: 1.0, depth: 1.5, height: 0.5 }, this.scene);
    bed.material = this.createMaterial('bedMaterial', this.colors.concrete);
    bed.position.set(0, 0.25, -0.5);
    bed.parent = parent;

    // Wheels
    [-0.5, 0.5].forEach(x => {
      [-0.3, 0.3].forEach(z => {
        const wheel = MeshBuilder.CreateCylinder('wheel', { diameter: 0.3, height: 0.1 }, this.scene);
        wheel.material = this.createMaterial('wheelMaterial', this.colors.roadDark);
        wheel.position.set(x, 0.15, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.parent = parent;
      });
    });
  }

  private createTrain(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    const body = MeshBuilder.CreateBox('trainBody', { width: 1.2, height: 1, depth: 3 }, this.scene);
    body.material = this.createMaterial('trainMaterial', this.colors.train);
    body.position.y = 0.6;
    body.parent = parent;

    // Train wheels
    [-1.2, 1.2].forEach(z => {
      [-0.5, 0.5].forEach(x => {
        const wheel = MeshBuilder.CreateCylinder('trainWheel', { diameter: 0.4, height: 0.1 }, this.scene);
        wheel.material = this.createMaterial('trainWheelMaterial', this.colors.roadDark);
        wheel.position.set(x, 0.2, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.parent = parent;
      });
    });
  }

  private createShip(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    // Ship hull
    const hull = MeshBuilder.CreateBox('shipHull', { width: 2, depth: 4, height: 0.8 }, this.scene);
    hull.material = this.createMaterial('shipMaterial', this.colors.concrete);
    hull.position.y = 0.4;
    hull.parent = parent;

    // Ship superstructure
    const superstructure = MeshBuilder.CreateBox('shipSuper', { width: 1, depth: 1.5, height: 1 }, this.scene);
    superstructure.material = this.createMaterial('superMaterial', this.colors.buildingB);
    superstructure.position.y = 1.3;
    superstructure.parent = parent;
  }

  private createPlane(parent: TransformNode): void {
    if (!this.scene) throw new Error('Scene not initialized');

    // Plane fuselage
    const fuselage = MeshBuilder.CreateCylinder('planeFuselage', { 
      diameter: 0.5, 
      height: 3, 
      tessellation: 8 
    }, this.scene);
    fuselage.material = this.createMaterial('planeMaterial', this.colors.curb);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.parent = parent;

    // Wings
    const wing = MeshBuilder.CreateBox('planeWing', { width: 3, depth: 0.8, height: 0.1 }, this.scene);
    wing.material = this.createMaterial('wingMaterial', this.colors.curb);
    wing.position.y = 0.2;
    wing.parent = parent;
  }

  // Need Icon Models
  createNeedIcon(needType: NeedType, position: Vector3): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const iconNode = new TransformNode(`need_${needType}`, this.scene);
    iconNode.position = position;

    // Create a simple geometric representation for each need type
    let iconMesh: Mesh;
    let iconColor: Color3;

    switch (needType) {
      case NeedType.Wood:
        iconMesh = MeshBuilder.CreateCylinder('woodIcon', { diameter: 0.3, height: 0.8 }, this.scene);
        iconColor = this.colors.treeTrunk;
        break;
      case NeedType.Fuel:
        iconMesh = MeshBuilder.CreateSphere('fuelIcon', { diameter: 0.5 }, this.scene);
        iconColor = this.colors.roadDark;
        break;
      case NeedType.Electricity:
        iconMesh = MeshBuilder.CreateBox('electricityIcon', { width: 0.2, height: 0.8, depth: 0.2 }, this.scene);
        iconColor = new Color3(1, 1, 0); // Yellow for electricity
        break;
      case NeedType.Food:
        iconMesh = MeshBuilder.CreateSphere('foodIcon', { diameter: 0.4 }, this.scene);
        iconColor = this.colors.crop;
        break;
      case NeedType.Construction:
        iconMesh = MeshBuilder.CreateBox('constructionIcon', { width: 0.4, height: 0.4, depth: 0.4 }, this.scene);
        iconColor = this.colors.concrete;
        break;
      case NeedType.ConsumerGoods:
        iconMesh = MeshBuilder.CreateBox('goodsIcon', { width: 0.3, height: 0.3, depth: 0.3 }, this.scene);
        iconColor = this.colors.buildingC;
        break;
      case NeedType.Safety:
        iconMesh = MeshBuilder.CreateCylinder('safetyIcon', { diameterTop: 0, diameterBottom: 0.4, height: 0.6 }, this.scene);
        iconColor = new Color3(1, 0, 0); // Red for safety/emergency
        break;
      case NeedType.CleanAir:
        iconMesh = MeshBuilder.CreateSphere('airIcon', { diameter: 0.5 }, this.scene);
        iconColor = new Color3(0.7, 0.9, 1); // Light blue for clean air
        break;
      case NeedType.Culture:
        iconMesh = MeshBuilder.CreateCylinder('cultureIcon', { 
          diameterTop: 0.3, 
          diameterBottom: 0.5, 
          height: 0.6 
        }, this.scene);
        iconColor = new Color3(0.8, 0.2, 0.8); // Purple for culture
        break;
      default:
        iconMesh = MeshBuilder.CreateSphere('defaultIcon', { diameter: 0.4 }, this.scene);
        iconColor = this.colors.curb;
    }

    iconMesh.material = this.createMaterial(`${needType}IconMaterial`, iconColor);
    iconMesh.parent = iconNode;

    // Add floating animation
    this.addFloatingAnimation(iconMesh);

    // Mark for glow effect
    iconMesh.metadata = { shouldGlow: true };

    return iconNode;
  }

  private createAnimatedSmoke(parent: TransformNode, anchorPosition: Vector3): void {
    if (!this.scene) throw new Error('Scene not initialized');

    const smokeMaterial = this.createMaterial('smokeMaterial', this.colors.smoke, 0.75);
    const smokeParticles: Mesh[] = [];

    // Create smoke puffs
    for (let i = 0; i < 8; i++) {
      const puff = MeshBuilder.CreateSphere('smokePuff', { 
        diameter: 0.3 + Math.random() * 0.2, 
        segments: 6 
      }, this.scene);
      puff.material = smokeMaterial;
      puff.parent = parent;
      puff.position = anchorPosition.clone().add(new Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.4,
        (Math.random() - 0.5) * 0.1
      ));
      smokeParticles.push(puff);
    }

    // Animate smoke
    this.scene.onBeforeRenderObservable.add(() => {
      const deltaTime = this.scene!.getEngine().getDeltaTime() / 1000;
      
      smokeParticles.forEach((puff, index) => {
        puff.position.y += deltaTime * 0.6;
        const time = performance.now() * 0.001 + index;
        puff.position.x += Math.sin(time) * 0.001;
        puff.position.z += Math.cos(time * 1.2) * 0.001;
        
        let life = (puff.position.y - anchorPosition.y) / 3;
        if (life < 0) life = 0;
        if (life > 1) {
          puff.position.y = anchorPosition.y;
          life = 0;
        }
        
        puff.scaling.setAll(0.6 + life * 0.8);
        if (puff.material && 'alpha' in puff.material) {
          (puff.material as StandardMaterial).alpha = 0.8 - life * 0.7;
        }
      });
    });
  }

  private addFloatingAnimation(mesh: Mesh): void {
    if (!this.scene) return;

    const animationKeys: IAnimationKey[] = [];
    const frameRate = 30;
    
    animationKeys.push({
      frame: 0,
      value: mesh.position.y
    });
    
    animationKeys.push({
      frame: frameRate,
      value: mesh.position.y + 0.2
    });
    
    animationKeys.push({
      frame: frameRate * 2,
      value: mesh.position.y
    });

    const animationY = new Animation(
      'floatingAnimation',
      'position.y',
      frameRate,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );
    
    animationY.setKeys(animationKeys);
    mesh.animations.push(animationY);
    
    this.scene.beginAnimation(mesh, 0, frameRate * 2, true);
  }

  // Terrain and Map Elements
  createTerrain(width: number, height: number): Mesh {
    if (!this.scene) throw new Error('Scene not initialized');

    // For now, we'll create a simple ground plane as a placeholder
    // The actual terrain generation will be handled by the TerrainGenerationService
    const terrain = MeshBuilder.CreateGround('terrain', { width, height }, this.scene);
    terrain.material = this.createMaterial('terrainMaterial', this.colors.grass.scale(0.92));
    terrain.metadata = { isStatic: true };
    
    return terrain;
  }

  createRoad(start: Vector3, end: Vector3, width: number = 3): TransformNode {
    if (!this.scene) throw new Error('Scene not initialized');

    const roadNode = new TransformNode('road', this.scene);
    
    const direction = end.subtract(start);
    const length = direction.length();
    const center = start.add(direction.scale(0.5));
    
    const road = MeshBuilder.CreateBox('roadSegment', { 
      width: length, 
      height: 0.08, 
      depth: width 
    }, this.scene);
    
    road.material = this.createMaterial('roadMaterial', this.colors.roadDark);
    road.position = center;
    road.position.y = 0.04;
    road.rotation.y = Math.atan2(direction.x, direction.z);
    road.parent = roadNode;
    
    // Add center stripe
    const stripe = MeshBuilder.CreateBox('roadStripe', { 
      width: length, 
      height: 0.003, 
      depth: 0.16 
    }, this.scene);
    stripe.material = this.createMaterial('stripeMaterial', this.colors.stripe);
    stripe.position = center;
    stripe.position.y = 0.09;
    stripe.rotation.y = road.rotation.y;
    stripe.parent = roadNode;
    
    roadNode.getChildMeshes().forEach(mesh => {
      mesh.metadata = { isStatic: true };
    });
    
    return roadNode;
  }

  /**
   * Initialize base meshes for instancing
   * Requirements: Performance optimization for rendering large numbers of trees
   */
  initializeBaseTreeMeshes(): void {
    if (!this.scene) throw new Error('Scene not initialized');
    
    // Apply the scale factor from the demo (scale = 4 in the demo)
    const demoScale = 4;
    
    // Create base trunk mesh with demo scaling
    this.baseTreeTrunk = MeshBuilder.CreateCylinder('baseTreeTrunk', { 
      diameter: 0.35 / demoScale, 
      height: 1.2 / demoScale,
      tessellation: 5
    }, this.scene);
    this.baseTreeTrunk.isVisible = false; // Hide the base mesh
    this.baseTreeTrunk.material = this.createMaterial('baseTrunkMaterial', this.colors.treeTrunk);
    
    // Create base crown meshes for the multi-layer tree model with demo scaling
    this.baseTreeCrown = MeshBuilder.CreateCylinder('baseTreeCrown', { 
      diameterTop: 0, 
      diameterBottom: 1.4 / demoScale, 
      height: 0.7 / demoScale, 
      tessellation: 6 
    }, this.scene);
    this.baseTreeCrown.isVisible = false; // Hide the base mesh
    this.baseTreeCrown.material = this.createMaterial('baseLeafMaterial', this.colors.treeLeaf);
  }

  /**
   * Create instanced trees for better performance using the improved model from the demo
   * Requirements: 5.1, Performance optimization
   */
  createInstancedTree(type: 'oak' | 'pine' | 'birch' | 'willow', position: Vector3): InstancedMesh[] {
    if (!this.scene) throw new Error('Scene not initialized');
    if (!this.baseTreeTrunk || !this.baseTreeCrown) {
      this.initializeBaseTreeMeshes();
    }
    
    // Get properties based on tree type
    let trunkHeight: number;
    let trunkDiameter: number;
    let trunkColor: Color3;
    let leafColor: Color3;
    let scale: number;
    
    switch (type) {
      case 'oak':
        trunkColor = new Color3(0.4, 0.25, 0.1);
        leafColor = new Color3(0.2, 0.6, 0.25);
        trunkHeight = 1.5;
        trunkDiameter = 0.35;
        scale = 1.0;
        break;
      case 'pine':
        trunkColor = new Color3(0.35, 0.2, 0.05);
        leafColor = new Color3(0.15, 0.5, 0.2);
        trunkHeight = 1.2;
        trunkDiameter = 0.35;
        scale = 1.0;
        break;
      case 'birch':
        trunkColor = new Color3(0.85, 0.8, 0.7);
        leafColor = new Color3(0.4, 0.7, 0.45);
        trunkHeight = 1.8;
        trunkDiameter = 0.3;
        scale = 1.0;
        break;
      case 'willow':
        trunkColor = new Color3(0.45, 0.3, 0.15);
        leafColor = new Color3(0.3, 0.6, 0.35);
        trunkHeight = 1.3;
        trunkDiameter = 0.4;
        scale = 1.0;
        break;
      default:
        trunkColor = this.colors.treeTrunk;
        leafColor = this.colors.treeLeaf;
        trunkHeight = 1.2;
        trunkDiameter = 0.35;
    }
    
    const instances: InstancedMesh[] = [];
    
    // Create trunk instance (material must be set on the base mesh, not instances)
    if (this.baseTreeTrunk) {
      const trunkInstance = this.baseTreeTrunk.createInstance(`tree_${type}_trunk`);
      trunkInstance.position = new Vector3(position.x, position.y + trunkHeight / 2, position.z);
      trunkInstance.scaling = new Vector3(trunkDiameter / (0.35 / 4), trunkHeight / (1.2 / 4), trunkDiameter / (0.35 / 4));
      instances.push(trunkInstance);
    }
    
    // Create the improved multi-layer crown from the demo
    if (this.baseTreeCrown) {
      const yOffset = -0.1 / 4;
      const baseY = position.y + trunkHeight + yOffset;
      
      // Define scale factor (default to 1 if not provided)
      const scale = 1.0;
      
      // First crown layer
      const d1 = (1.4 / 4) / scale, h1 = d1 / 2;
      const crown1Instance = this.baseTreeCrown.createInstance(`tree_${type}_crown1`);
      crown1Instance.position = new Vector3(position.x, baseY + h1 / 2, position.z);
      crown1Instance.scaling = new Vector3(d1 / (1.4 / 4), h1 / (0.7 / 4), d1 / (1.4 / 4));
      instances.push(crown1Instance);
      
      // Spacing between crown layers
      const spacing1_2 = ((1.2 / 4) / scale) * 0.4;
      const spacing2_3 = ((1.1 / 4) / scale) * 0.4;
      
      // Second crown layer
      const d2 = (1.1 / 4) / scale, h2 = d2 / 2;
      const crown2Instance = this.baseTreeCrown.createInstance(`tree_${type}_crown2`);
      crown2Instance.position = new Vector3(position.x, baseY + spacing1_2 + (h2 / 2), position.z);
      crown2Instance.scaling = new Vector3(d2 / (1.4 / 4), h2 / (0.7 / 4), d2 / (1.4 / 4));
      instances.push(crown2Instance);
      
      // Third crown layer
      const d3 = (0.8 / 4) / scale, h3 = d3 / 2;
      const crown3Instance = this.baseTreeCrown.createInstance(`tree_${type}_crown3`);
      crown3Instance.position = new Vector3(position.x, baseY + spacing1_2 + spacing2_3 + (h3 / 2), position.z);
      crown3Instance.scaling = new Vector3(d3 / (1.4 / 4), h3 / (0.7 / 4), d3 / (1.4 / 4));
      instances.push(crown3Instance);
    }
    
    return instances;
  }
}