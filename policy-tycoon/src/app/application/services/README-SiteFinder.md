# Site Finder Service

The SiteFinderService is responsible for intelligently selecting optimal locations for city placement on the generated terrain. It implements a sophisticated algorithm that ensures cities are placed in areas with sufficient buildable space and appropriate terrain characteristics.

## Overview

Traditional city placement algorithms often rely on random selection, which can lead to cities being placed in unsuitable locations (e.g., on water, on steep slopes, or in areas too small to support development). The SiteFinderService addresses these issues by:

1. Scanning the terrain to identify potential building locations
2. Measuring the actual buildable area around each potential site
3. Filtering out locations that don't meet minimum size requirements
4. Ranking locations by suitability for different city sizes

## Algorithm

The site finding algorithm works as follows:

1. **Random Sampling**: Pick random locations within the map bounds that haven't been checked yet
2. **Area Calculation**: For each location, perform a breadth-first search (BFS) to calculate the connected buildable area
3. **Validation**: Check that each tile in the area:
   - Is above the water level
   - Is passable from adjacent tiles (height difference ≤ 1)
4. **Filtering**: Only include locations with area size meeting the minimum requirement
5. **Ranking**: Sort locations by area size (largest first)

## Key Features

### Breadth-First Search (BFS)
The service uses BFS to accurately measure connected buildable areas, ensuring that:
- Only directly adjacent tiles (not diagonal) are considered
- Areas with disconnected sections are not overvalued
- The algorithm efficiently explores the terrain

### Water Detection
The service integrates with the TerrainGenerationService to properly identify water tiles and exclude them from buildable areas.

### Passability Checking
Using the CollisionDetectionService, the service ensures that terrain is traversable between adjacent tiles.

### Duplicate Prevention
A global tracking system prevents the same tiles from being checked multiple times, improving efficiency.

## API

### findCityStartPoints()
```typescript
findCityStartPoints(
  targetCityCount: number, 
  minAreaSize: number, 
  mapBounds: { minX: number, maxX: number, minZ: number, maxZ: number }
): CityStartPoint[]
```

Finds suitable locations for city placement.

**Parameters:**
- `targetCityCount`: The desired number of cities to place
- `minAreaSize`: Minimum number of connected buildable tiles required
- `mapBounds`: Map boundaries to search within

**Returns:**
Array of CityStartPoint objects, sorted by area size (largest first)

### CityStartPoint Interface
```typescript
interface CityStartPoint {
  x: number;        // X coordinate of the starting location
  z: number;        // Z coordinate of the starting location
  areaSize: number; // Number of connected buildable tiles
}
```

## Usage Example

```typescript
// Create the service with its dependencies
const siteFinder = new SiteFinderService(terrainService, collisionService);

// Define search parameters
const mapBounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
const targetCities = 10;
const minArea = 25; // Minimum 5x5 area

// Find suitable locations
const startPoints = siteFinder.findCityStartPoints(targetCities, minArea, mapBounds);

// Use the results for city generation
startPoints.forEach(point => {
  // Generate a city at point.x, point.z
  // Size can be determined by point.areaSize
});
```

## Benefits

1. **Reliable Placement**: Cities are only placed in areas that can actually support development
2. **Efficient Search**: Duplicate checking prevents wasted computation
3. **Scalable Cities**: Area size information enables appropriate city sizing
4. **Terrain Awareness**: Proper handling of water and impassable terrain
5. **Deterministic Results**: Given the same terrain, produces consistent results

## Error Handling

The service gracefully handles edge cases:
- Returns empty array if no suitable locations are found
- Continues searching until target count is met or maximum attempts are reached
- Logs warnings when fewer locations than desired are found

This intelligent site selection system significantly improves the quality and reliability of city placement in the Policy Tycoon world generation system.