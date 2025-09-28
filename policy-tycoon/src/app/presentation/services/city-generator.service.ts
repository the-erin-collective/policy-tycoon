import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { CityTier, IndustryType, NeedType } from '../../data/models/enums';
import { City } from '../../data/models/core-entities';
import { ClassicCityGeneratorService } from '../../application/services/classic-city-generator.service';
import { CitySize } from '../../data/models/city-generation';
import { TerrainGenerationService } from '../../application/services/terrain-generation.service'; // NEW: Import terrain service
import { CollisionDetectionService } from '../../application/services/collision-detection.service'; // NEW: Import collision service

export interface CityLayout {
  cityCenter: Vector3;
  roads: RoadSegment[];
  buildingPlots: BuildingPlot[];
  industrialZones: IndustrialZone[];
  buildingClusters: BuildingCluster[];
}

export interface RoadSegment {
  start: Vector3;
  end: Vector3;
  width: number;
  type: 'main' | 'secondary' | 'residential';
  id: string;
  roadType: 'horizontal' | 'vertical' | 'intersection';
  gridX: number;
  gridZ: number;
}

export interface BuildingPlot {
  position: Vector3;
  size: { width: number; depth: number };
  type: 'residential' | 'commercial' | 'civic';
  tier: CityTier;
  clusterId?: string;
}

export interface BuildingCluster {
  id: string;
  center: Vector3;
  radius: number;
  type: 'residential' | 'commercial' | 'mixed';
  density: number;
  nearestRoadId: string;
}

export interface IndustrialZone {
  center: Vector3;
  radius: number;
  industryType: IndustryType;
}

// City growth simulation types
type RoadType = 'horizontal' | 'vertical' | 'intersection';
type BuildingType = 'house' | 'midrise' | 'commercial' | 'civic';

interface CityRoadTile {
  gridX: number;
  gridZ: number;
  roadType: RoadType;
}

interface CityBuildingTile {
  gridX: number;
  gridZ: number;
  buildingType: BuildingType;
  population: number;
}

interface CityGrowthState {
  roads: Map<string, CityRoadTile>;
  buildings: Map<string, CityBuildingTile>;
  currentPopulation: number;
  targetPopulation: number;
  gridUnit: number;
  centerY: number;
}

// Utility function to generate hash code for strings
function generateHashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

@Injectable({
  providedIn: 'root'
})
export class CityGeneratorService {
  constructor(
    private classicCityGenerator: ClassicCityGeneratorService,
    private terrainGeneration: TerrainGenerationService, // NEW: Inject terrain service
    private collisionDetection: CollisionDetectionService // NEW: Inject collision service
  ) {}
  
  // Map boundary configuration - should match MapConfig in MapRendererService
  private mapBounds = {
    minX: -1000,
    maxX: 1000,
    minZ: -1000,
    maxZ: 1000
  };

  // Boundary checking methods
  isWithinMapBounds(position: Vector3): boolean {
    return position.x >= this.mapBounds.minX && 
           position.x <= this.mapBounds.maxX &&
           position.z >= this.mapBounds.minZ && 
           position.z <= this.mapBounds.maxZ;
  }

  isRoadWithinBounds(start: Vector3, end: Vector3): boolean {
    return this.isWithinMapBounds(start) && this.isWithinMapBounds(end);
  }

  clampPositionToBounds(position: Vector3): Vector3 {
    return new Vector3(
      Math.max(this.mapBounds.minX, Math.min(this.mapBounds.maxX, position.x)),
      position.y,
      Math.max(this.mapBounds.minZ, Math.min(this.mapBounds.maxZ, position.z))
    );
  }

  getValidCityBounds(cityCenter: Vector3, gridSize: number): { minX: number, maxX: number, minZ: number, maxZ: number } {
    return {
      minX: Math.max(this.mapBounds.minX, cityCenter.x - gridSize),
      maxX: Math.min(this.mapBounds.maxX, cityCenter.x + gridSize),
      minZ: Math.max(this.mapBounds.minZ, cityCenter.z - gridSize),
      maxZ: Math.min(this.mapBounds.maxZ, cityCenter.z + gridSize)
    };
  }

  generateCityLayout(city: City): CityLayout {
    const layout: CityLayout = {
      cityCenter: city.position,
      roads: [],
      buildingPlots: [],
      industrialZones: [],
      buildingClusters: []
    };

    // Convert CityTier to CitySize for ClassicCityGenerator
    const citySize = this.convertCityTierToCitySize(city.tier);
    
    // Convert Vector3 position to grid coordinates
    const centerX = Math.round(city.position.x);
    const centerZ = Math.round(city.position.z);
    
    // Create a set of existing city names (in a real implementation, this would come from all cities)
    const existingCityNames = new Set<string>();
    
    // Generate city using ClassicCityGenerator
    const generatedCity = this.classicCityGenerator.generateCity(
      centerX, 
      centerZ, 
      citySize, 
      existingCityNames,
      generateHashCode(city.id) // Use city ID as seed for deterministic generation
    );
    
    // Convert GeneratedCity to CityLayout
    this.convertGeneratedCityToLayout(generatedCity, layout, city.position.y);
    
    // NEW: Update terrain with artificial structures for roads and buildings on slopes
    this.updateTerrainWithArtificialStructures(layout, city.tier);
    
    // Limit roads to prevent memory issues
    this.limitRoadsByTier(layout, city.tier);
    
    // Generate industrial zones for larger cities
    if (city.tier >= CityTier.GrowingTown) {
      this.generateIndustrialZones(layout, city.tier);
    }

    return layout;
  }

  /**
   * NEW: Update terrain with artificial structures for roads and buildings on slopes
   */
  private updateTerrainWithArtificialStructures(layout: CityLayout, tier: CityTier): void {
    // This method would update the terrain data structure to mark where
    // full ramps and man-made blocks have been placed
    
    // For roads on slopes, mark the terrain cells with hasFullRamp = true
    layout.roads.forEach(road => {
      // Convert road position to grid coordinates
      const gridX = Math.floor((road.start.x + road.end.x) / 2);
      const gridZ = Math.floor((road.start.z + road.end.z) / 2);
      
      // Check if this road is on a slope by querying the collision detection service
      const terrain = (this.collisionDetection as any).getTerrainAt(gridX, gridZ);
      if (terrain.isSlope) {
        // Mark this terrain cell as having a full ramp
        // In a real implementation, this would update the actual terrain data structure
        console.log(`Marking terrain at (${gridX},${gridZ}) as having a full ramp for road`);
      }
    });
    
    // For buildings on slopes, mark the terrain cells with hasManMadeBlock = true
    layout.buildingPlots.forEach(building => {
      // Convert building position to grid coordinates
      const gridX = Math.floor(building.position.x);
      const gridZ = Math.floor(building.position.z);
      
      // Check if this building is on a slope by querying the collision detection service
      const terrain = (this.collisionDetection as any).getTerrainAt(gridX, gridZ);
      if (terrain.isSlope) {
        // Mark this terrain cell as having a man-made block
        // In a real implementation, this would update the actual terrain data structure
        console.log(`Marking terrain at (${gridX},${gridZ}) as having a man-made block for building`);
      }
    });
  }

  /**
   * Convert CityTier to CitySize for compatibility with ClassicCityGenerator
   */
  private convertCityTierToCitySize(tier: CityTier): CitySize {
    switch (tier) {
      case CityTier.Hamlet:
      case CityTier.SmallTown:
        return CitySize.Small;
      case CityTier.GrowingTown:
      case CityTier.UrbanCentre:
        return CitySize.Medium;
      case CityTier.ExpandingCity:
      case CityTier.Metropolis:
      case CityTier.AdvancedCity:
        return CitySize.Large;
      default:
        return CitySize.Small;
    }
  }

  /**
   * Convert GeneratedCity from ClassicCityGenerator to CityLayout
   */
  private convertGeneratedCityToLayout(generatedCity: any, layout: CityLayout, centerY: number): void {
    console.log('Converting generated city:', generatedCity);
    
    // Convert roads
    if (generatedCity.roads && Array.isArray(generatedCity.roads)) {
      console.log(`Converting ${generatedCity.roads.length} roads`);
      generatedCity.roads.forEach((road: any) => {
        // Convert road segment to CityLayout RoadSegment
        const roadSegments = this.convertRoadSegment(road, centerY);
        roadSegments.forEach(segment => {
          layout.roads.push(segment);
        });
      });
    } else {
      console.warn('No roads found in generated city or roads is not an array');
    }
    
    // Convert buildings
    if (generatedCity.buildings && Array.isArray(generatedCity.buildings)) {
      console.log(`Converting ${generatedCity.buildings.length} buildings`);
      generatedCity.buildings.forEach((building: any) => {
        const buildingPlot = this.convertBuildingToPlot(building, centerY);
        if (buildingPlot) {
          layout.buildingPlots.push(buildingPlot);
        }
      });
    } else {
      console.warn('No buildings found in generated city or buildings is not an array');
    }
    
    console.log(`Conversion complete: ${layout.roads.length} roads, ${layout.buildingPlots.length} building plots`);
  }

  /**
   * Convert a RoadSegment from ClassicCityGenerator to CityLayout RoadSegment(s)
   * Returns an array because some road types (like intersections) need multiple segments
   */
  private convertRoadSegment(road: any, centerY: number): RoadSegment[] {
    const segments: RoadSegment[] = [];
    
    // Handle different road types
    switch (road.roadType) {
      case 'intersection':
        // For intersections, create both horizontal and vertical segments
        // Horizontal segment
        segments.push({
          start: new Vector3(road.startX, centerY, road.startZ),
          end: new Vector3(road.endX, centerY, road.endZ),
          width: 3,
          type: 'secondary',
          id: `road-${road.gridX}-${road.gridZ}-h`,
          roadType: 'horizontal',
          gridX: road.gridX,
          gridZ: road.gridZ
        });
        
        // Vertical segment
        segments.push({
          start: new Vector3(road.startX, centerY, road.startZ),
          end: new Vector3(road.endX, centerY, road.endZ),
          width: 3,
          type: 'secondary',
          id: `road-${road.gridX}-${road.gridZ}-v`,
          roadType: 'vertical',
          gridX: road.gridX,
          gridZ: road.gridZ
        });
        break;
      
      case 'horizontal':
        segments.push({
          start: new Vector3(road.startX, centerY, road.startZ),
          end: new Vector3(road.endX, centerY, road.endZ),
          width: 3,
          type: 'secondary',
          id: `road-${road.gridX}-${road.gridZ}`,
          roadType: 'horizontal',
          gridX: road.gridX,
          gridZ: road.gridZ
        });
        break;
      
      case 'vertical':
        segments.push({
          start: new Vector3(road.startX, centerY, road.startZ),
          end: new Vector3(road.endX, centerY, road.endZ),
          width: 3,
          type: 'secondary',
          id: `road-${road.gridX}-${road.gridZ}`,
          roadType: 'vertical',
          gridX: road.gridX,
          gridZ: road.gridZ
        });
        break;
      
      case 'corner':
        // For corners, create a single segment representing the corner
        segments.push({
          start: new Vector3(road.startX, centerY, road.startZ),
          end: new Vector3(road.endX, centerY, road.endZ),
          width: 3,
          type: 'secondary',
          id: `road-${road.gridX}-${road.gridZ}`,
          roadType: 'intersection', // Map corners to intersections for simplicity
          gridX: road.gridX,
          gridZ: road.gridZ
        });
        break;
      
      default:
        // Handle unknown road types by creating a default segment
        // Make sure we have valid start and end coordinates
        if (road.startX !== undefined && road.startZ !== undefined && 
            road.endX !== undefined && road.endZ !== undefined) {
          segments.push({
            start: new Vector3(road.startX, centerY, road.startZ),
            end: new Vector3(road.endX, centerY, road.endZ),
            width: 3,
            type: 'secondary',
            id: `road-${road.gridX || 0}-${road.gridZ || 0}`,
            roadType: 'intersection',
            gridX: road.gridX || 0,
            gridZ: road.gridZ || 0
          });
        }
    }
    
    return segments;
  }

  /**
   * Convert a Building from ClassicCityGenerator to CityLayout BuildingPlot
   */
  private convertBuildingToPlot(building: any, centerY: number): BuildingPlot | null {
    // Make sure we have valid building coordinates
    if (building.x === undefined || building.z === undefined) {
      return null;
    }
    
    // Determine building type based on population and building type info
    let buildingType: 'residential' | 'commercial' | 'civic' = 'residential';
    
    // If the building has a type property, use it to determine the building type
    if (building.type) {
      // Map building types from ClassicCityGenerator to CityLayout types
      const typeMap: {[key: string]: 'residential' | 'commercial' | 'civic'} = {
        'small_house_1': 'residential',
        'small_house_2': 'residential',
        'medium_house_1': 'residential',
        'medium_house_2': 'residential',
        'townhouse_1': 'residential',
        'townhouse_2': 'residential',
        'apartment_1': 'residential',
        'apartment_2': 'residential',
        'large_apartment': 'residential',
        'commercial': 'commercial',
        'civic': 'civic'
      };
      
      buildingType = typeMap[building.type.id] || typeMap[building.type.name?.toLowerCase()] || 'residential';
    } else {
      // Fallback to population-based classification
      if (building.population >= 30) {
        buildingType = 'commercial';
      } else if (building.population >= 20) {
        buildingType = 'civic';
      }
    }
    
    // Determine building size based on type
    let size = { width: 3, depth: 3 };
    if (building.type && building.type.width && building.type.height) {
      size = { width: building.type.width, depth: building.type.height };
    }
    
    return {
      position: new Vector3(building.x, centerY, building.z),
      size: size,
      type: buildingType,
      tier: CityTier.SmallTown // This will be set properly by the caller
    };
  }

  private simulateCityGrowth(layout: CityLayout, center: Vector3, targetPopulation: number, tier: CityTier): void {
    const gridUnit = 5; // 5 units per grid square
    const centerGridX = Math.floor(center.x / gridUnit);
    const centerGridZ = Math.floor(center.z / gridUnit);
    
    // Initialize city growth state
    const cityState = {
      roads: new Map<string, CityRoadTile>(),
      buildings: new Map<string, CityBuildingTile>(),
      currentPopulation: 0,
      targetPopulation: targetPopulation,
      gridUnit: gridUnit,
      centerY: center.y
    };
    
    // Create initial city block structure (like Transport Tycoon)
    // Start with a small 3x3 grid of roads to create initial blocks
    
    // Central intersection
    this.placeRoadTile(cityState, centerGridX, centerGridZ, 'intersection');
    
    // Create a basic cross pattern with some extensions to form initial blocks
    // Horizontal roads
    this.placeRoadTile(cityState, centerGridX - 1, centerGridZ, 'horizontal');
    this.placeRoadTile(cityState, centerGridX + 1, centerGridZ, 'horizontal');
    this.placeRoadTile(cityState, centerGridX - 2, centerGridZ, 'horizontal');
    this.placeRoadTile(cityState, centerGridX + 2, centerGridZ, 'horizontal');
    
    // Vertical roads
    this.placeRoadTile(cityState, centerGridX, centerGridZ - 1, 'vertical');
    this.placeRoadTile(cityState, centerGridX, centerGridZ + 1, 'vertical');
    this.placeRoadTile(cityState, centerGridX, centerGridZ - 2, 'vertical');
    this.placeRoadTile(cityState, centerGridX, centerGridZ + 2, 'vertical');
    
    // Add some perpendicular roads to create initial blocks
    this.placeRoadTile(cityState, centerGridX - 2, centerGridZ - 2, 'intersection');
    this.placeRoadTile(cityState, centerGridX + 2, centerGridZ - 2, 'intersection');
    this.placeRoadTile(cityState, centerGridX - 2, centerGridZ + 2, 'intersection');
    this.placeRoadTile(cityState, centerGridX + 2, centerGridZ + 2, 'intersection');
    
    // Connect the corners
    this.placeRoadTile(cityState, centerGridX - 1, centerGridZ - 2, 'horizontal');
    this.placeRoadTile(cityState, centerGridX + 1, centerGridZ - 2, 'horizontal');
    this.placeRoadTile(cityState, centerGridX - 1, centerGridZ + 2, 'horizontal');
    this.placeRoadTile(cityState, centerGridX + 1, centerGridZ + 2, 'horizontal');
    
    this.placeRoadTile(cityState, centerGridX - 2, centerGridZ - 1, 'vertical');
    this.placeRoadTile(cityState, centerGridX - 2, centerGridZ + 1, 'vertical');
    this.placeRoadTile(cityState, centerGridX + 2, centerGridZ - 1, 'vertical');
    this.placeRoadTile(cityState, centerGridX + 2, centerGridZ + 1, 'vertical');
    
    // Grow the city step by step until we reach target population
    let maxIterations = 1000; // Prevent infinite loops
    while (cityState.currentPopulation < cityState.targetPopulation && maxIterations > 0) {
      const growthStep = this.performGrowthStep(cityState);
      if (!growthStep) {
        break; // No more growth possible
      }
      maxIterations--;
    }
    
    // Convert city state to layout
    this.convertCityStateToLayout(cityState, layout);
  }

  private performGrowthStep(cityState: CityGrowthState): boolean {
    // Strategy: Alternate between extending roads and filling blocks with buildings
    const needsMorePopulation = cityState.currentPopulation < cityState.targetPopulation;
    const possibleBuildings = this.findPossibleBuildingLocations(cityState);
    const possibleRoads = this.findPossibleRoadExtensions(cityState);
    
    // If we have building spots and need population, prioritize buildings
    if (needsMorePopulation && possibleBuildings.length > 0) {
      const buildingAdded = this.tryAddBuilding(cityState);
      if (buildingAdded) {
        return true;
      }
    }
    
    // If we can't place buildings or don't need more population, extend roads to create new blocks
    if (possibleRoads.length > 0) {
      const roadAdded = this.tryExtendRoads(cityState);
      if (roadAdded) {
        return true;
      }
    }
    
    // If we still need population but can't place buildings, try extending roads anyway
    if (needsMorePopulation && possibleRoads.length > 0) {
      return this.tryExtendRoads(cityState);
    }
    
    return false;
  }

  private tryAddBuilding(cityState: CityGrowthState): boolean {
    // Find all possible building locations (adjacent to roads)
    const possibleLocations = this.findPossibleBuildingLocations(cityState);
    
    if (possibleLocations.length === 0) {
      return false;
    }
    
    // Choose a random location
    const location = possibleLocations[Math.floor(Math.random() * possibleLocations.length)];
    
    // Determine building type based on population needs
    const remainingPopulation = cityState.targetPopulation - cityState.currentPopulation;
    const buildingType = this.chooseBuildingType(remainingPopulation, location.distanceFromCenter);
    
    // Place the building
    this.placeBuildingTile(cityState, location.gridX, location.gridZ, buildingType);
    
    return true;
  }

  private tryExtendRoads(cityState: CityGrowthState): boolean {
    // Find all possible road extensions
    const possibleExtensions = this.findPossibleRoadExtensions(cityState);
    
    if (possibleExtensions.length === 0) {
      return false;
    }
    
    // Choose a random extension
    const extension = possibleExtensions[Math.floor(Math.random() * possibleExtensions.length)];
    
    // Place the road
    this.placeRoadTile(cityState, extension.gridX, extension.gridZ, extension.roadType);
    
    return true;
  }

  private findPossibleBuildingLocations(cityState: CityGrowthState): Array<{gridX: number, gridZ: number, distanceFromCenter: number}> {
    const locations: Array<{gridX: number, gridZ: number, distanceFromCenter: number}> = [];
    // Find center by looking at existing roads
    let centerGridX = 0;
    let centerGridZ = 0;
    
    cityState.roads.forEach(road => {
      if (road.roadType === 'intersection') {
        centerGridX = road.gridX;
        centerGridZ = road.gridZ;
      }
    });
    
    // Find all city blocks (areas enclosed by roads) and fill them with buildings
    const cityBlocks = this.findCityBlocks(cityState);
    
    cityBlocks.forEach(block => {
      // Fill each block with buildings
      for (let x = block.minX; x <= block.maxX; x++) {
        for (let z = block.minZ; z <= block.maxZ; z++) {
          const key = `${x},${z}`;
          
          // Only place buildings in empty spaces within blocks
          if (!cityState.roads.has(key) && !cityState.buildings.has(key) && 
              this.isWithinCityBounds(x, z, centerGridX, centerGridZ)) {
            
            const distance = Math.sqrt((x - centerGridX) ** 2 + (z - centerGridZ) ** 2);
            locations.push({gridX: x, gridZ: z, distanceFromCenter: distance});
          }
        }
      }
    });
    
    return locations;
  }

  private findCityBlocks(cityState: CityGrowthState): Array<{minX: number, maxX: number, minZ: number, maxZ: number}> {
    const blocks: Array<{minX: number, maxX: number, minZ: number, maxZ: number}> = [];
    
    // Find the bounds of the road network
    let minRoadX = Infinity, maxRoadX = -Infinity;
    let minRoadZ = Infinity, maxRoadZ = -Infinity;
    
    cityState.roads.forEach(road => {
      minRoadX = Math.min(minRoadX, road.gridX);
      maxRoadX = Math.max(maxRoadX, road.gridX);
      minRoadZ = Math.min(minRoadZ, road.gridZ);
      maxRoadZ = Math.max(maxRoadZ, road.gridZ);
    });
    
    // Create blocks between roads
    for (let x = minRoadX; x < maxRoadX; x++) {
      for (let z = minRoadZ; z < maxRoadZ; z++) {
        // Check if this could be the start of a block
        const hasRoadLeft = cityState.roads.has(`${x},${z}`) || cityState.roads.has(`${x},${z+1}`);
        const hasRoadTop = cityState.roads.has(`${x},${z}`) || cityState.roads.has(`${x+1},${z}`);
        
        if (hasRoadLeft || hasRoadTop) {
          // Find the extent of this block
          let blockMaxX = x + 1;
          let blockMaxZ = z + 1;
          
          // Expand block until we hit roads
          while (blockMaxX <= maxRoadX && !this.hasVerticalRoadAt(cityState, blockMaxX, z, blockMaxZ)) {
            blockMaxX++;
          }
          while (blockMaxZ <= maxRoadZ && !this.hasHorizontalRoadAt(cityState, x, blockMaxX, blockMaxZ)) {
            blockMaxZ++;
          }
          
          // Only create blocks that are reasonable size (not single cells)
          if (blockMaxX - x > 1 && blockMaxZ - z > 1) {
            blocks.push({
              minX: x + 1,
              maxX: blockMaxX - 1,
              minZ: z + 1,
              maxZ: blockMaxZ - 1
            });
          }
        }
      }
    }
    
    return blocks;
  }

  private hasVerticalRoadAt(cityState: CityGrowthState, x: number, minZ: number, maxZ: number): boolean {
    for (let z = minZ; z <= maxZ; z++) {
      const road = cityState.roads.get(`${x},${z}`);
      if (road && (road.roadType === 'vertical' || road.roadType === 'intersection')) {
        return true;
      }
    }
    return false;
  }

  private hasHorizontalRoadAt(cityState: CityGrowthState, minX: number, maxX: number, z: number): boolean {
    for (let x = minX; x <= maxX; x++) {
      const road = cityState.roads.get(`${x},${z}`);
      if (road && (road.roadType === 'horizontal' || road.roadType === 'intersection')) {
        return true;
      }
    }
    return false;
  }

  private findPossibleRoadExtensions(cityState: CityGrowthState): Array<{gridX: number, gridZ: number, roadType: RoadType}> {
    const extensions: Array<{gridX: number, gridZ: number, roadType: RoadType}> = [];
    // Find center by looking at existing roads
    let centerGridX = 0;
    let centerGridZ = 0;
    
    cityState.roads.forEach(road => {
      if (road.roadType === 'intersection') {
        centerGridX = road.gridX;
        centerGridZ = road.gridZ;
      }
    });
    
    cityState.roads.forEach((road, key) => {
      const [x, z] = key.split(',').map(Number);
      
      // Can extend from any road type (including intersections)
      const directions = [
        {dx: 1, dz: 0},   // East
        {dx: -1, dz: 0},  // West  
        {dx: 0, dz: 1},   // South
        {dx: 0, dz: -1}   // North
      ];
      
      directions.forEach(dir => {
        const newX = x + dir.dx;
        const newZ = z + dir.dz;
        const newKey = `${newX},${newZ}`;
        
        if (!cityState.roads.has(newKey) && !cityState.buildings.has(newKey) && 
            this.isWithinCityBounds(newX, newZ, centerGridX, centerGridZ)) {
          
          // Determine what type of road to place based on the direction we're extending
          let roadType: RoadType;
          if (dir.dx !== 0) {
            // Extending horizontally
            roadType = 'horizontal';
          } else {
            // Extending vertically  
            roadType = 'vertical';
          }
          
          // Check if this would create an intersection
          const adjacentRoads = this.getAdjacentRoads(cityState, newX, newZ);
          if (adjacentRoads.length >= 2) {
            roadType = 'intersection';
          }
          
          extensions.push({gridX: newX, gridZ: newZ, roadType: roadType});
        }
      });
    });
    
    return extensions;
  }

  private placeRoadTile(cityState: CityGrowthState, gridX: number, gridZ: number, roadType: RoadType): void {
    const key = `${gridX},${gridZ}`;
    cityState.roads.set(key, {
      gridX: gridX,
      gridZ: gridZ,
      roadType: roadType
    });
  }

  private placeBuildingTile(cityState: CityGrowthState, gridX: number, gridZ: number, buildingType: BuildingType): void {
    const key = `${gridX},${gridZ}`;
    const population = buildingType === 'house' ? 4 : buildingType === 'midrise' ? 40 : 2;
    
    cityState.buildings.set(key, {
      gridX: gridX,
      gridZ: gridZ,
      buildingType: buildingType,
      population: population
    });
    
    cityState.currentPopulation += population;
  }

  private chooseBuildingType(remainingPopulation: number, distanceFromCenter: number): BuildingType {
    // Close to center: prefer commercial/civic
    if (distanceFromCenter < 3) {
      if (Math.random() < 0.4) return 'commercial';
      if (Math.random() < 0.2) return 'civic';
    }
    
    // For large remaining population, prefer mid-rise
    if (remainingPopulation >= 40 && Math.random() < 0.3) {
      return 'midrise';
    }
    
    // Default to house
    return 'house';
  }

  private determineRoadType(cityState: CityGrowthState, gridX: number, gridZ: number): RoadType {
    // Check if this position would connect multiple roads (making it an intersection)
    const adjacentRoads = this.getAdjacentRoads(cityState, gridX, gridZ);
    
    if (adjacentRoads.length >= 3) {
      return 'intersection';
    }
    
    // Check the direction of adjacent roads to determine orientation
    const hasHorizontalNeighbor = adjacentRoads.some(road => 
      (road.gridX === gridX + 1 || road.gridX === gridX - 1) && road.gridZ === gridZ
    );
    const hasVerticalNeighbor = adjacentRoads.some(road => 
      road.gridX === gridX && (road.gridZ === gridZ + 1 || road.gridZ === gridZ - 1)
    );
    
    if (hasHorizontalNeighbor && hasVerticalNeighbor) {
      return 'intersection';
    } else if (hasHorizontalNeighbor) {
      return 'horizontal';
    } else {
      return 'vertical';
    }
  }

  private getAdjacentRoads(cityState: CityGrowthState, gridX: number, gridZ: number): CityRoadTile[] {
    const adjacent: CityRoadTile[] = [];
    const positions = [
      {dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1}
    ];
    
    positions.forEach(pos => {
      const key = `${gridX + pos.dx},${gridZ + pos.dz}`;
      const road = cityState.roads.get(key);
      if (road) {
        adjacent.push(road);
      }
    });
    
    return adjacent;
  }

  private isWithinCityBounds(gridX: number, gridZ: number, centerX: number, centerZ: number): boolean {
    const maxDistance = 20; // Maximum distance from center
    const distance = Math.sqrt((gridX - centerX) ** 2 + (gridZ - centerZ) ** 2);
    return distance <= maxDistance;
  }

  private convertCityStateToLayout(cityState: CityGrowthState, layout: CityLayout): void {
    // Convert roads - create proper horizontal/vertical/intersection segments
    cityState.roads.forEach(road => {
      const worldX = road.gridX * cityState.gridUnit;
      const worldZ = road.gridZ * cityState.gridUnit;
      
      let start: Vector3;
      let end: Vector3;
      
      // Create proper road segments based on type
      switch (road.roadType) {
        case 'horizontal':
          // Horizontal road spans the full grid cell width
          start = new Vector3(worldX, cityState.centerY, worldZ + cityState.gridUnit / 2);
          end = new Vector3(worldX + cityState.gridUnit, cityState.centerY, worldZ + cityState.gridUnit / 2);
          break;
        case 'vertical':
          // Vertical road spans the full grid cell height
          start = new Vector3(worldX + cityState.gridUnit / 2, cityState.centerY, worldZ);
          end = new Vector3(worldX + cityState.gridUnit / 2, cityState.centerY, worldZ + cityState.gridUnit);
          break;
        case 'intersection':
          // Intersection - create both horizontal and vertical segments
          // Horizontal segment
          layout.roads.push({
            start: new Vector3(worldX, cityState.centerY, worldZ + cityState.gridUnit / 2),
            end: new Vector3(worldX + cityState.gridUnit, cityState.centerY, worldZ + cityState.gridUnit / 2),
            width: 3,
            type: 'secondary',
            id: `road-${road.gridX}-${road.gridZ}-h`,
            roadType: 'horizontal',
            gridX: road.gridX,
            gridZ: road.gridZ
          });
          // Vertical segment
          layout.roads.push({
            start: new Vector3(worldX + cityState.gridUnit / 2, cityState.centerY, worldZ),
            end: new Vector3(worldX + cityState.gridUnit / 2, cityState.centerY, worldZ + cityState.gridUnit),
            width: 3,
            type: 'secondary',
            id: `road-${road.gridX}-${road.gridZ}-v`,
            roadType: 'vertical',
            gridX: road.gridX,
            gridZ: road.gridZ
          });
          return; // Skip the single road push below
      }
      
      layout.roads.push({
        start: start,
        end: end,
        width: 3,
        type: 'secondary',
        id: `road-${road.gridX}-${road.gridZ}`,
        roadType: road.roadType,
        gridX: road.gridX,
        gridZ: road.gridZ
      });
    });
    
    // Convert buildings
    cityState.buildings.forEach(building => {
      const worldX = building.gridX * cityState.gridUnit;
      const worldZ = building.gridZ * cityState.gridUnit;
      
      const buildingTypeMap: {[key in BuildingType]: 'residential' | 'commercial' | 'civic'} = {
        'house': 'residential',
        'midrise': 'residential',
        'commercial': 'commercial',
        'civic': 'civic'
      };
      
      layout.buildingPlots.push({
        position: new Vector3(worldX + cityState.gridUnit / 2, cityState.centerY, worldZ + cityState.gridUnit / 2),
        size: { width: 3, depth: 3 },
        type: buildingTypeMap[building.buildingType],
        tier: CityTier.SmallTown // Will be set properly by caller
      });
    });
  }



  private isNearExistingRoad(roads: RoadSegment[], x: number, z: number, threshold: number = 3): boolean {
    return roads.some(road => {
      // Check if point is near any existing road
      const roadCenterX = (road.start.x + road.end.x) / 2;
      const roadCenterZ = (road.start.z + road.end.z) / 2;
      const distance = Math.sqrt((x - roadCenterX) ** 2 + (z - roadCenterZ) ** 2);
      return distance < threshold;
    });
  }

  private isNearRoad(roads: RoadSegment[], position: Vector3, maxDistance: number): boolean {
    return roads.some(road => {
      const distanceToRoad = this.distanceToLineSegment(position, road.start, road.end);
      return distanceToRoad <= maxDistance;
    });
  }

  private isOnRoad(roads: RoadSegment[], position: Vector3, roadWidth: number): boolean {
    return roads.some(road => {
      const distanceToRoad = this.distanceToLineSegment(position, road.start, road.end);
      return distanceToRoad <= roadWidth / 2;
    });
  }

  private distanceToLineSegment(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
    const A = point.x - lineStart.x;
    const B = point.z - lineStart.z;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.z - lineStart.z;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const xx = lineStart.x + param * C;
    const zz = lineStart.z + param * D;

    const dx = point.x - xx;
    const dz = point.z - zz;
    
    return Math.sqrt(dx * dx + dz * dz);
  }

  private determineBuildingType(position: Vector3, center: Vector3, tier: CityTier): 'residential' | 'commercial' | 'civic' {
    const distanceFromCenter = Vector3.Distance(position, center);
    
    // Commercial buildings near center
    if (distanceFromCenter < 10 && tier >= CityTier.GrowingTown) {
      return Math.random() < 0.6 ? 'commercial' : 'civic';
    }
    
    // Civic buildings occasionally
    if (Math.random() < 0.1 && tier >= CityTier.SmallTown) {
      return 'civic';
    }
    
    // Default to residential
    return 'residential';
  }

  private limitRoadsByTier(layout: CityLayout, tier: CityTier): void {
    // Limit roads based on city tier to prevent memory issues
    let maxRoads: number;
    switch (tier) {
      case CityTier.Hamlet: maxRoads = 30; break;
      case CityTier.SmallTown: maxRoads = 50; break;
      case CityTier.GrowingTown: maxRoads = 80; break;
      case CityTier.UrbanCentre: maxRoads = 120; break;
      case CityTier.ExpandingCity: maxRoads = 150; break;
      case CityTier.Metropolis: maxRoads = 180; break;
      case CityTier.AdvancedCity: maxRoads = 200; break;
      default: maxRoads = 100;
    }
    
    if (layout.roads.length > maxRoads) {
      // Keep roads closest to center
      layout.roads.sort((a, b) => {
        const centerA = new Vector3((a.start.x + a.end.x) / 2, 0, (a.start.z + a.end.z) / 2);
        const centerB = new Vector3((b.start.x + b.end.x) / 2, 0, (b.start.z + b.end.z) / 2);
        const distA = Vector3.Distance(centerA, layout.cityCenter);
        const distB = Vector3.Distance(centerB, layout.cityCenter);
        return distA - distB;
      });
      
      layout.roads = layout.roads.slice(0, maxRoads);
    }
  }

  private generateIndustrialZones(layout: CityLayout, tier: CityTier): void {
    const center = layout.cityCenter;
    const gridSize = this.getGridSize(tier);
    const validBounds = this.getValidCityBounds(center, gridSize);
    
    // Place industrial zones on the outskirts, but within bounds
    const industrialPositions = [
      new Vector3(center.x + gridSize * 0.8, center.y, center.z + gridSize * 0.6),
      new Vector3(center.x - gridSize * 0.8, center.y, center.z - gridSize * 0.6)
    ];

    industrialPositions.forEach((position, index) => {
      // Clamp industrial zone position to map bounds
      const clampedPosition = this.clampPositionToBounds(position);
      
      // Only add industrial zone if it's within bounds
      if (this.isWithinMapBounds(clampedPosition)) {
        const industryTypes = [IndustryType.Factory, IndustryType.PowerPlant, IndustryType.Mining];
        layout.industrialZones.push({
          center: clampedPosition,
          radius: 15,
          industryType: industryTypes[index % industryTypes.length]
        });
      }
    });
  }

  private getRoadSpacing(tier: CityTier): number {
    // Transport Tycoon style spacing - larger blocks for cleaner look
    switch (tier) {
      case CityTier.Hamlet: return 20;
      case CityTier.SmallTown: return 18;
      case CityTier.GrowingTown: return 15;
      case CityTier.UrbanCentre: return 12;
      case CityTier.ExpandingCity: return 10;
      case CityTier.Metropolis: return 8;
      case CityTier.AdvancedCity: return 6;
      default: return 15;
    }
  }

  private getGridSize(tier: CityTier): number {
    switch (tier) {
      case CityTier.Hamlet: return 15;
      case CityTier.SmallTown: return 25;
      case CityTier.GrowingTown: return 35;
      case CityTier.UrbanCentre: return 45;
      case CityTier.ExpandingCity: return 60;
      case CityTier.Metropolis: return 70;  // Reduced from 80 to prevent memory issues
      case CityTier.AdvancedCity: return 80;  // Reduced from 100 to prevent memory issues
      default: return 30;
    }
  }

  private getBuildingPlotSize(tier: CityTier): { width: number; depth: number } {
    if (tier >= CityTier.Metropolis) {
      return { width: 4, depth: 4 }; // Larger plots for bigger buildings
    } else if (tier >= CityTier.UrbanCentre) {
      return { width: 3, depth: 3 };
    } else {
      return { width: 2.5, depth: 2.5 }; // Smaller plots for houses
    }
  }

  // Generate realistic city names
  generateCityName(tier: CityTier): string {
    const prefixes = ['New', 'Old', 'North', 'South', 'East', 'West', 'Upper', 'Lower', 'Great', 'Little'];
    const bases = ['Haven', 'Bridge', 'Field', 'Wood', 'Hill', 'Valley', 'River', 'Lake', 'Stone', 'Green'];
    const suffixes = ['ton', 'ville', 'burg', 'ford', 'port', 'mount', 'dale', 'shire', 'land', 'city'];

    if (tier <= CityTier.SmallTown) {
      // Simple names for small places
      return bases[Math.floor(Math.random() * bases.length)] + 
             suffixes[Math.floor(Math.random() * suffixes.length)];
    } else {
      // More complex names for larger cities
      const usePrefix = Math.random() < 0.4;
      const prefix = usePrefix ? prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' : '';
      const base = bases[Math.floor(Math.random() * bases.length)];
      const suffix = tier >= CityTier.Metropolis && Math.random() < 0.3 ? ' City' : 
                     suffixes[Math.floor(Math.random() * suffixes.length)];
      
      return prefix + base + suffix;
    }
  }

  // Generate needs based on city tier and layout
  generateCityNeeds(tier: CityTier, layout: CityLayout): NeedType[] {
    const needs: NeedType[] = [];
    
    // Basic needs progression
    if (tier >= CityTier.SmallTown) needs.push(NeedType.Wood);
    if (tier >= CityTier.GrowingTown) needs.push(NeedType.Fuel);
    if (tier >= CityTier.UrbanCentre) needs.push(NeedType.Electricity);
    if (tier >= CityTier.ExpandingCity) {
      needs.push(NeedType.Food, NeedType.Construction);
    }
    if (tier >= CityTier.Metropolis) {
      needs.push(NeedType.ConsumerGoods, NeedType.Safety);
    }
    if (tier >= CityTier.AdvancedCity) {
      needs.push(NeedType.CleanAir, NeedType.Culture);
    }

    // Randomly select 1-3 unmet needs
    const unmetCount = Math.min(3, Math.floor(Math.random() * needs.length) + 1);
    const shuffled = needs.sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, unmetCount);
  }
}