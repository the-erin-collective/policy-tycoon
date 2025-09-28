/**
 * Core interfaces and data structures for OpenTTD-style city generation
 */

import { Vector3 } from '@babylonjs/core';

// Direction enum for road connections
export enum Direction {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west',
  Northeast = 'northeast',
  Southeast = 'southeast',
  Southwest = 'southwest',
  Northwest = 'northwest'
}

// Corner direction enum for road segments
export enum CornerDirection {
  NE = 'NE',
  NW = 'NW',
  SE = 'SE',
  SW = 'SW'
}

// City size enumeration
export enum CitySize {
  Small = 'small',    // 150-300 population
  Medium = 'medium',  // 300-500 population
  Large = 'large'     // 500-800 population
}

// Enhanced RoadSegment interface with corner and intersection support
export interface RoadSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  roadType: 'horizontal' | 'vertical' | 'diagonal' | 'corner' | 'intersection';
  gridX: number;
  gridZ: number;
  cornerDirection?: CornerDirection; // Only for corner type
  connections?: Direction[]; // For intersections and complex junctions
}

// Building interface for city generation
export interface Building {
  x: number;
  z: number;
  type: BuildingType;
  population: number;
}

// Building type definition
export interface BuildingType {
  id: string;
  name: string;
  population: number;
  width: number;
  height: number;
}

// Point interface for coordinates
export interface Point {
  x: number;
  z: number;
}

// Generated city data structure
export interface GeneratedCity {
  roads: RoadSegment[];
  buildings: Building[];
  population: number;
  centerX: number;
  centerZ: number;
  name: string;
  id: string;
}

// Road network structure
export interface RoadNetwork {
  segments: RoadSegment[];
  intersections: Point[];
  deadEnds: Point[];
}

// Building placement result
export interface BuildingPlacement {
  buildings: Building[];
  totalPopulation: number;
}

// City name label for 3D rendering
export interface CityNameLabel {
  id: string;
  cityName: string;
  centerX: number;
  centerZ: number;
  textMesh?: any; // THREE.Mesh or Babylon.js equivalent
  visible: boolean;
}

// Seeded random number generator interface
export interface SeededRandom {
  seed: number;
  nextInt(min: number, max: number): number;
  nextIntInclusive(min: number, max: number): number;
  nextFloat(): number;
  nextBoolean(probability?: number): boolean;
  selectFromArray<T>(array: T[]): T;
  setSeed(seed: number): void;
}

// Main city generator interface
export interface ClassicCityGenerator {
  generateCity(
    centerX: number, 
    centerZ: number, 
    size: CitySize, 
    existingCityNames: Set<string>, 
    seed?: number
  ): GeneratedCity;
}

// Road network builder interface
export interface RoadNetworkBuilder {
  buildInitialNetwork(centerX: number, centerZ: number, rng: SeededRandom): RoadNetwork;
}

// Building placer interface
export interface BuildingPlacer {
  placeInitialBuildings(
    roadNetwork: RoadNetwork, 
    targetPopulation: number, 
    rng: SeededRandom
  ): BuildingPlacement;
}

// City configuration interface
export interface CityConfiguration {
  getPopulationRange(size: CitySize): { min: number; max: number };
  getBuildingTypes(): BuildingType[];
  selectRandomBuilding(rng: SeededRandom): BuildingType;
}

// City name generator interface
export interface CityNameGenerator {
  generateUniqueName(existingNames: Set<string>, rng: SeededRandom): string;
  createNameLabel(cityName: string, centerX: number, centerZ: number): CityNameLabel;
  updateNameLabelPosition(label: CityNameLabel, centerX: number, centerZ: number): void;
  removeNameLabel(label: CityNameLabel): void;
}

// City name database interface
export interface CityNameDatabase {
  getAvailableNames(): string[];
  markNameAsUsed(name: string): void;
  releaseNameForReuse(name: string): void;
}

// Grid visualizer interface
export interface GridVisualizer {
  renderGrid(scene: any, gridSize: number, extent: number): void;
  toggleGridVisibility(visible: boolean): void;
  updateGridPosition(centerX: number, centerZ: number): void;
  clearGrid(): void;
}

// Grid render options
export interface GridRenderOptions {
  gridSize: number;
  lineColor: number;
  lineOpacity: number;
  extent: number;
  lineThickness: number; // Added for more control over grid line thickness
  enableMajorMinorGrid: boolean; // Added to enable major/minor grid lines like Transport Tycoon
}

// Road generation state for internal use
export interface RoadGenerationState {
  placedRoads: Map<string, RoadTile>; // "x,z" -> RoadTile
  currentSegments: RoadSegment[];
  intersections: Point[];
  deadEnds: Point[];
  corners: CornerInfo[];
}

// Road tile for generation state
export interface RoadTile {
  x: number;
  z: number;
  connections: Direction[];
  isIntersection: boolean;
  isCorner: boolean;
  isDeadEnd: boolean;
}

// Corner information for road generation
export interface CornerInfo {
  x: number;
  z: number;
  direction: CornerDirection;
  connectsFrom: Direction;
  connectsTo: Direction;
}

// Building placement state for internal use
export interface BuildingPlacementState {
  placedBuildings: Map<string, Building>; // "x,z" -> Building
  currentPopulation: number;
  targetPopulation: number;
  availableSpots: Point[];
}