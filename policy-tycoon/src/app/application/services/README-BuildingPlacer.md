# BuildingPlacer Service

The BuildingPlacer service implements population-driven building placement for OpenTTD-style city generation. It uses a random walk algorithm to find suitable building spots adjacent to roads and places buildings iteratively until the target population is reached.

## Features

### Random Walk Algorithm (Task 8.1)
- Performs random walks starting from town center (intersection points)
- Follows roads for 3-7 steps using seeded randomization
- Selects directions based on available road connections
- Finds empty tiles adjacent to roads during the walk
- Terminates early when reaching dead ends
- Produces deterministic results with the same seed

### Building Spot Validation (Task 8.2)
- Validates terrain suitability using CollisionDetectionService
- Ensures tiles are adjacent to roads
- Prevents placement on water, impassable terrain, or steep slopes
- Checks that buildings don't block potential road extensions from dead ends
- Prevents building overlap by tracking placed buildings

### Iterative Building Placement (Task 8.3)
- Continues placement loop until target population is reached
- Integrates random walk with spot validation and building selection
- Updates population counter with each building placement
- Prevents infinite loops with maximum attempt limits
- Uses CityConfigurationService for building type selection

## Usage

```typescript
import { BuildingPlacerService } from './building-placer.service';
import { SeededRandom } from '../../utils/seeded-random';

// Inject dependencies
const buildingPlacer = new BuildingPlacerService(
  collisionDetectionService,
  cityConfigurationService
);

// Place buildings in a road network
const result = buildingPlacer.placeInitialBuildings(
  roadNetwork,      // RoadNetwork with segments and intersections
  targetPopulation, // Target population (e.g., 200 for small city)
  rng              // SeededRandom for deterministic results
);

console.log(`Placed ${result.buildings.length} buildings`);
console.log(`Total population: ${result.totalPopulation}`);
```

## Algorithm Details

### Random Walk Process
1. Start from town center (first intersection or road network center)
2. For 3-7 steps:
   - Get available directions from current position
   - Randomly select a direction using seeded RNG
   - Move to next position if it has a road
   - Find empty tiles adjacent to the current road position
   - Add valid spots to the collection
3. Remove duplicate spots and return results

### Building Placement Process
1. Set target population based on city size
2. Initialize placement state with empty building map
3. While current population < target population:
   - Perform random walk to find potential building spots
   - Select random spot from valid spots found
   - Validate spot for building placement
   - Select random building type from configuration
   - Place building and update population counter
   - Add building to placement map to prevent overlap
4. Return final building placement with total population

### Validation Criteria
- Tile must not be occupied by existing road or building
- Tile must be adjacent to at least one road segment
- Terrain must be suitable (not water, not too steep)
- Tile must not block potential road extensions from dead ends

## Dependencies

- **CollisionDetectionService**: Terrain validation and adjacency checking
- **CityConfigurationService**: Building type selection and population values
- **SeededRandom**: Deterministic random number generation

## Testing

The service includes comprehensive unit tests covering:
- Random walk path generation and termination
- Building spot validation with various scenarios
- Iterative placement loop and population tracking
- Edge cases (empty networks, unreachable targets)
- Deterministic behavior with fixed seeds

Run tests with:
```bash
ng test --include="**/building-placer.service.spec.ts"
```

## Requirements Satisfied

- **Requirement 2.1**: Iterative placement loop until target population reached
- **Requirement 2.2**: Random walks along roads starting from town center
- **Requirement 2.3**: Direction selection at each step using available roads
- **Requirement 2.4**: Building spot validation for terrain and adjacency
- **Requirement 3.4**: Population tracking and building placement integration

## Example

See `building-placer-example.ts` for detailed usage examples including:
- Basic building placement in crossroad towns
- Random walk algorithm demonstration
- City size comparison with different target populations