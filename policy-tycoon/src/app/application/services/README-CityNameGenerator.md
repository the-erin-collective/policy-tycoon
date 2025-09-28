# CityNameGenerator Service

The `CityNameGeneratorService` implements the `CityNameGenerator` interface for OpenTTD-style city generation. It provides unique city name generation and 3D text label management for displaying city names above city centers.

## Features

### Name Generation
- **Predefined Names**: Contains 100+ authentic city names inspired by OpenTTD
- **Unique Selection**: Prevents duplicate names across multiple cities
- **Collision Avoidance**: Respects existing names from external sources
- **Deterministic**: Uses seeded random generation for consistent results
- **Fallback System**: Generates numbered variants when all names are used

### 3D Label Management
- **Billboard Text**: Creates camera-facing 3D text labels
- **Dynamic Positioning**: Labels positioned above city centers
- **Visibility Control**: Toggle label visibility on/off
- **Resource Management**: Proper cleanup of 3D meshes and textures
- **Real-time Updates**: Update label positions as cities move

## Usage

### Basic Setup

```typescript
import { CityNameGeneratorService } from './city-name-generator.service';
import { Scene } from '@babylonjs/core';

// Initialize service
const nameGenerator = new CityNameGeneratorService();
nameGenerator.initialize(scene); // BabylonJS scene required for 3D labels
```

### Generate Unique Names

```typescript
import { SeededRandom } from '../../data/models/city-generation';

const rng = new SeededRandom(12345);
const existingNames = new Set<string>();

// Generate unique city name
const cityName = nameGenerator.generateUniqueName(existingNames, rng);
console.log(cityName); // e.g., "Springfield"

// Generate another unique name
const cityName2 = nameGenerator.generateUniqueName(existingNames, rng);
console.log(cityName2); // e.g., "Riverside" (different from first)
```

### Create 3D Labels

```typescript
// Create label above city center
const label = nameGenerator.createNameLabel('Springfield', 10, 20);

// Label properties
console.log(label.id);        // Unique identifier
console.log(label.cityName);  // "Springfield"
console.log(label.centerX);   // 10
console.log(label.centerZ);   // 20
console.log(label.visible);   // true
console.log(label.textMesh);  // BabylonJS mesh object
```

### Manage Labels

```typescript
// Update label position
nameGenerator.updateNameLabelPosition(label, 30, 40);

// Toggle visibility of all labels
nameGenerator.setLabelsVisible(false); // Hide all
nameGenerator.setLabelsVisible(true);  // Show all

// Get label by ID
const foundLabel = nameGenerator.getLabelById(label.id);

// Remove label
nameGenerator.removeNameLabel(label);
```

### Integration with City Generation

```typescript
import { GeneratedCity, CitySize } from '../../data/models/city-generation';

function generateCityWithName(centerX: number, centerZ: number, size: CitySize): GeneratedCity {
  const rng = new SeededRandom();
  const existingNames = new Set<string>(); // Get from existing cities
  
  // Generate unique name
  const cityName = nameGenerator.generateUniqueName(existingNames, rng);
  
  // Create 3D label
  const nameLabel = nameGenerator.createNameLabel(cityName, centerX, centerZ);
  
  // ... generate roads and buildings ...
  
  return {
    roads: [], // Generated road segments
    buildings: [], // Generated buildings
    population: 0, // Calculated population
    centerX,
    centerZ,
    name: cityName,
    id: `city_${Date.now()}`
  };
}
```

## Requirements Compliance

The service satisfies all requirements from the OpenTTD city generation specification:

### Requirement 7.1 - Unique Name Assignment
- ✅ Generates unique names from predefined list
- ✅ Prevents duplicates across multiple cities
- ✅ Creates numbered variants when needed

### Requirement 7.2 - Floating Text Above City Center
- ✅ Creates 3D text meshes positioned above city centers
- ✅ Uses BabylonJS dynamic textures for text rendering
- ✅ Proper height positioning to avoid ground overlap

### Requirement 7.3 - Camera Movement Compatibility
- ✅ Uses billboard mode for camera-facing text
- ✅ Labels remain visible during camera movement
- ✅ Consistent positioning regardless of camera angle

### Requirement 7.4 - Distinct Names Without Duplicates
- ✅ Internal tracking prevents duplicate generation
- ✅ Respects external existing names
- ✅ Deterministic generation with seeded random

### Requirement 7.5 - Readable Labels Without UI Overlap
- ✅ Positioned at appropriate height above cities
- ✅ Clear text rendering with background
- ✅ Proper material configuration for visibility

## API Reference

### Core Methods

#### `generateUniqueName(existingNames: Set<string>, rng: SeededRandom): string`
Generates a unique city name avoiding collisions.

#### `createNameLabel(cityName: string, centerX: number, centerZ: number): CityNameLabel`
Creates a 3D text label for a city name.

#### `updateNameLabelPosition(label: CityNameLabel, centerX: number, centerZ: number): void`
Updates the position of an existing label.

#### `removeNameLabel(label: CityNameLabel): void`
Removes a label and cleans up resources.

### Utility Methods

#### `getAvailableNames(): string[]`
Returns all predefined city names.

#### `setLabelsVisible(visible: boolean): void`
Toggle visibility of all labels.

#### `getActiveLabels(): Map<string, CityNameLabel>`
Get all currently active labels.

#### `clearAllLabels(): void`
Remove all labels and reset state.

## Testing

The service includes comprehensive unit tests covering:

- Name uniqueness and collision avoidance
- Deterministic generation with seeds
- 3D label creation and management
- Position updates and visibility control
- Resource cleanup and disposal
- Requirements validation

Run tests with:
```bash
ng test --include="**/city-name-generator.service.spec.ts"
```

## Performance Considerations

- **Memory Management**: Automatic cleanup of 3D meshes and textures
- **Efficient Lookups**: Uses Map and Set for O(1) label operations
- **Minimal Overhead**: Only creates 3D resources when needed
- **Billboard Optimization**: Uses BabylonJS billboard mode for efficient rendering

## Dependencies

- **@babylonjs/core**: 3D rendering engine
- **Angular**: Dependency injection framework
- **TypeScript**: Type safety and interfaces

## Future Enhancements

- **Localization**: Support for different language name sets
- **Custom Names**: Allow user-defined city names
- **Name Categories**: Themed name sets (medieval, modern, sci-fi)
- **Label Styling**: Customizable fonts, colors, and effects