# Collision Detection Service

The `CollisionDetectionService` provides comprehensive collision detection and terrain validation for the OpenTTD-style city generation system. It ensures that roads and buildings are placed only in valid locations, respecting terrain constraints, existing structures, and map boundaries.

## Features

### Road Placement Validation
- **Terrain Validation**: Checks for suitable terrain conditions (slope, elevation)
- **Water Detection**: Prevents road placement on water bodies
- **Impassable Terrain**: Blocks construction on mountains, cliffs, and other obstacles
- **Overlap Detection**: Ensures roads don't overlap with existing infrastructure
- **Boundary Checking**: Validates placement within map bounds

### Building Placement Validation
- **Stricter Terrain Requirements**: Buildings require flatter terrain than roads
- **Road Adjacency**: Ensures buildings are placed adjacent to existing roads
- **Overlap Prevention**: Prevents buildings from overlapping with roads or other buildings
- **Dead End Protection**: Prevents buildings from blocking potential road extensions

### Segment Validation
- **Complete Path Checking**: Validates entire road segments before construction
- **Early Collision Detection**: Stops construction at first collision point
- **Multi-tile Validation**: Handles both straight and diagonal segments

## API Reference

### Core Methods

#### `canPlaceRoad(x: number, z: number, roadState: RoadGenerationState): CollisionResult`
Checks if a road can be placed at the specified coordinates.

```typescript
const result = collisionService.canPlaceRoad(10, 15, roadState);
if (!result.hasCollision) {
  // Safe to place road
  placeRoadTile(10, 15);
}
```

#### `canPlaceBuilding(x: number, z: number, roadState: RoadGenerationState, buildingMap: Map<string, any>): CollisionResult`
Validates building placement with stricter terrain requirements.

```typescript
const result = collisionService.canPlaceBuilding(11, 15, roadState, buildingMap);
if (!result.hasCollision && collisionService.isAdjacentToRoad(11, 15, roadState)) {
  // Safe to place building
  placeBuildingTile(11, 15);
}
```

#### `validateRoadSegment(startX: number, startZ: number, endX: number, endZ: number, roadState: RoadGenerationState): CollisionResult`
Validates an entire road segment before construction.

```typescript
const result = collisionService.validateRoadSegment(0, 0, 5, 0, roadState);
if (!result.hasCollision) {
  // Build the entire segment
  buildRoadSegment(0, 0, 5, 0);
}
```

### Utility Methods

#### `isAdjacentToRoad(x: number, z: number, roadState: RoadGenerationState): boolean`
Checks if a position is adjacent to any existing road.

#### `wouldBlockRoadExtension(x: number, z: number, roadState: RoadGenerationState): boolean`
Determines if placing a building would block potential road extensions from dead ends.

#### `getAdjacentPositions(x: number, z: number): Point[]`
Returns all four cardinal adjacent positions.

## Collision Types

The service returns detailed collision information through the `CollisionResult` interface:

```typescript
interface CollisionResult {
  hasCollision: boolean;
  collisionType: 'road' | 'terrain' | 'water' | 'impassable' | 'bounds' | 'none';
  message?: string;
}
```

### Collision Types Explained

- **`road`**: Collision with existing road infrastructure
- **`terrain`**: Unsuitable terrain (too steep, unstable)
- **`water`**: Attempting to build on water bodies
- **`impassable`**: Blocked by mountains, cliffs, or other obstacles
- **`bounds`**: Outside the valid map boundaries
- **`none`**: No collision detected, safe to build

## Terrain System

The service includes a simplified terrain system for validation:

### Terrain Features
- **Water Bodies**: Circular areas representing lakes, rivers
- **Impassable Areas**: Mountains, cliffs, and other obstacles
- **Elevation**: Height variation across the map
- **Slope**: Gradient calculation for construction suitability

### Terrain Constraints
- **Roads**: Can handle slopes up to 30% grade
- **Buildings**: Require flatter terrain (15% grade maximum)
- **Water**: No construction allowed on water
- **Impassable**: No construction on designated impassable terrain

## Usage Examples

### Basic Road Construction
```typescript
// Initialize service and state
const collisionService = new CollisionDetectionService();
const roadState: RoadGenerationState = {
  placedRoads: new Map(),
  currentSegments: [],
  intersections: [],
  deadEnds: [],
  corners: []
};

// Check and place a road
const result = collisionService.canPlaceRoad(5, 5, roadState);
if (!result.hasCollision) {
  // Place the road tile
  roadState.placedRoads.set('5,5', {
    x: 5, z: 5,
    connections: [Direction.North, Direction.South],
    isIntersection: false,
    isCorner: false,
    isDeadEnd: false
  });
}
```

### Building Placement with Validation
```typescript
const buildingMap = new Map();

// Find a spot adjacent to roads
for (const [key, road] of roadState.placedRoads) {
  const adjacentPositions = collisionService.getAdjacentPositions(road.x, road.z);
  
  for (const pos of adjacentPositions) {
    const result = collisionService.canPlaceBuilding(pos.x, pos.z, roadState, buildingMap);
    
    if (!result.hasCollision && 
        !collisionService.wouldBlockRoadExtension(pos.x, pos.z, roadState)) {
      // Place building
      buildingMap.set(`${pos.x},${pos.z}`, { type: 'house', population: 4 });
      break;
    }
  }
}
```

### Road Segment Construction
```typescript
// Validate and build a road segment
const startX = 0, startZ = 0;
const endX = 5, endZ = 0;

const segmentResult = collisionService.validateRoadSegment(startX, startZ, endX, endZ, roadState);
if (!segmentResult.hasCollision) {
  // Build segment tile by tile
  for (let x = startX; x <= endX; x++) {
    roadState.placedRoads.set(`${x},${startZ}`, {
      x, z: startZ,
      connections: [Direction.East, Direction.West],
      isIntersection: false,
      isCorner: false,
      isDeadEnd: x === startX || x === endX
    });
  }
}
```

## Integration with City Generation

The collision detection service integrates with the broader city generation system:

1. **Road Network Builder**: Uses collision detection to validate road placement during network construction
2. **Building Placer**: Ensures buildings are placed in valid, accessible locations
3. **Classic City Generator**: Coordinates collision checking across all generation phases

## Configuration

### Map Bounds
The service respects configurable map boundaries:
```typescript
private readonly mapBounds = {
  minX: -1000,
  maxX: 1000,
  minZ: -1000,
  maxZ: 1000
};
```

### Terrain Tolerances
Adjustable terrain constraints:
```typescript
private readonly maxElevationDifference = 2.0;
private readonly maxSlope = 0.3; // 30% grade for roads
private readonly maxBuildingSlope = 0.15; // 15% grade for buildings
```

## Testing

The service includes comprehensive unit tests covering:
- Basic collision detection scenarios
- Terrain validation edge cases
- Road overlap detection
- Building placement validation
- Boundary condition handling
- Complex multi-collision scenarios

Run tests with:
```bash
ng test --include="**/collision-detection.service.spec.ts"
```

## Performance Considerations

- **Efficient Lookups**: Uses Map data structures for O(1) collision checking
- **Early Termination**: Stops validation at first collision detected
- **Minimal Terrain Calculation**: Simplified terrain system for performance
- **Boundary Pre-checking**: Quick boundary validation before expensive terrain checks

## Future Enhancements

Potential improvements for the collision detection system:
- **Real Terrain Integration**: Connect to actual heightmap/terrain data
- **Advanced Slope Calculation**: More sophisticated gradient analysis
- **Dynamic Water Bodies**: Support for changing water levels
- **Terrain Modification**: Allow terrain alteration for construction
- **Performance Optimization**: Spatial indexing for large maps