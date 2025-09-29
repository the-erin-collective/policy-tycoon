/**
 * Terrain generation models and interfaces
 */

import * as BABYLON from '@babylonjs/core';

// Tile type definition
export interface TileType {
  name: string;
  color: BABYLON.Color3;
}

// Terrain generation configuration
export interface TerrainGenerationConfig {
  gridSize?: number;
  chunkSize?: number;
  tileSize?: number;
  maxHeight?: number;
  waterLevel: number;
  seed?: number;
  steepness: number;
  continuity: number;
  renderDistance: number;
  verticalScale?: number;
}

// Grid cell interface for WFC algorithm
export interface WFGridCell {
  possibleHeights: number[];
  collapsed: boolean;
  height: number | null;
  tileType?: TileType;
}

// World chunk interface
export interface WorldChunk {
  grid?: WFGridCell[][];
  terrain?: BABYLON.Mesh;
  mergedTrunks?: BABYLON.Mesh;
  mergedLeaves?: BABYLON.Mesh;
}

// World interface
export interface World {
  [key: string]: WorldChunk;
}