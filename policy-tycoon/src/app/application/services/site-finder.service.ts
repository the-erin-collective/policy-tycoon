import { Injectable } from '@angular/core';
import { TerrainGenerationService } from './terrain-generation.service';
import { CollisionDetectionService } from './collision-detection.service';
import { CityStartPoint } from '../../data/models/city-generation';

@Injectable({ providedIn: 'root' })
export class SiteFinderService {
  constructor(
    private terrainService: TerrainGenerationService,
    private collisionService: CollisionDetectionService
  ) {}

  /**
   * Finds a specified number of suitable starting locations for cities on the map.
   * @param targetCityCount The desired number of cities.
   * @param minAreaSize The minimum number of connected buildable tiles required for a valid site.
   * @param mapBounds The boundaries of the map to search within.
   */
  public findCityStartPoints(targetCityCount: number, minAreaSize: number, mapBounds: { minX: number, maxX: number, minZ: number, maxZ: number }): CityStartPoint[] {
    const foundSites: CityStartPoint[] = [];
    const checkedTiles = new Set<string>(); // Tracks all tiles that have been part of any search.

    const maxAttempts = targetCityCount * 100; // Safety break to prevent infinite loops on bad maps
    let attempts = 0;

    while (foundSites.length < targetCityCount && attempts < maxAttempts) {
      attempts++;

      // 1. Pick a random, unchecked starting tile
      const randX = Math.floor(Math.random() * (mapBounds.maxX - mapBounds.minX + 1)) + mapBounds.minX;
      const randZ = Math.floor(Math.random() * (mapBounds.maxZ - mapBounds.minZ + 1)) + mapBounds.minZ;
      const key = `${randX},${randZ}`;

      if (checkedTiles.has(key)) {
        continue; // Already checked this tile, try again.
      }

      // 2. Perform the "area walk" (flood fill) from this tile
      const areaData = this.calculateBuildableArea(randX, randZ, checkedTiles);

      // 3. Mark all tiles from this search as checked
      areaData.visitedInThisSearch.forEach(visitedKey => checkedTiles.add(visitedKey));

      // 4. If the area is large enough, it's a valid site
      if (areaData.areaSize >= minAreaSize) {
        foundSites.push({
          x: randX,
          z: randZ,
          areaSize: areaData.areaSize,
        });
      }
    }

    if (foundSites.length < targetCityCount) {
        console.warn(`Could only find ${foundSites.length} out of ${targetCityCount} desired city locations.`);
    }

    // Sort sites from largest area to smallest
    return foundSites.sort((a, b) => b.areaSize - a.areaSize);
  }

  /**
   * Calculate the buildable area starting from a given point using BFS (breadth-first search).
   * @param startX The starting X coordinate
   * @param startZ The starting Z coordinate
   * @param globallyCheckedTiles Set of tiles already checked in previous searches
   * @returns Object containing area size and tiles visited in this search
   */
  private calculateBuildableArea(startX: number, startZ: number, globallyCheckedTiles: Set<string>): { areaSize: number, visitedInThisSearch: Set<string> } {
    const startKey = `${startX},${startZ}`;
    const visitedInThisSearch = new Set<string>();

    // Don't even start if the initial tile is invalid
    if (globallyCheckedTiles.has(startKey) || this.terrainService.isWaterAt(startX, startZ)) {
      visitedInThisSearch.add(startKey);
      return { areaSize: 0, visitedInThisSearch };
    }

    const queue: { x: number, z: number }[] = [{ x: startX, z: startZ }];
    visitedInThisSearch.add(startKey);
    let areaSize = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      areaSize++;

      const neighbors = [
        { x: current.x, z: current.z + 1 }, // North
        { x: current.x, z: current.z - 1 }, // South
        { x: current.x + 1, z: current.z }, // East
        { x: current.x - 1, z: current.z }, // West
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.z}`;

        if (visitedInThisSearch.has(neighborKey)) continue;
        visitedInThisSearch.add(neighborKey); // Mark as visited for this search immediately

        // Check validity: not water and passable from the current tile
        if (!this.terrainService.isWaterAt(neighbor.x, neighbor.z) &&
            this.collisionService.isPassable(current.x, current.z, neighbor.x, neighbor.z)) {
          queue.push(neighbor);
        }
      }
    }

    return { areaSize, visitedInThisSearch };
  }
}