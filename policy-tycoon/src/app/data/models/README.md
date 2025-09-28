# Core Data Models Implementation

This directory contains the complete implementation of core data models and type definitions for Policy Transport Tycoon, as specified in task 2 of the implementation plan.

## Implemented Components

### 1. Core Enums (`enums.ts`)
- **CityTier**: Population-based city classification (Hamlet to AdvancedCity)
- **OwnershipModel**: Industry ownership types (StateOwned, Mixed, Private)
- **PolicyStatus**: Policy implementation states
- **NeedType**: City needs (Wood, Fuel, Electricity, Food, etc.)
- **IndustryType**: Available industry categories
- **VehicleType**: Transport vehicle classifications
- **CargoType**: Transportable goods categories
- **ApplicationStatus**: Industry application workflow states
- **ConstructionStatus**: Building phase tracking
- **OperationalStatus**: Industry operational states
- **SafetyLevel**: Transport safety policy levels
- **TimeSpeed**: Game speed multipliers
- **GameSubsystem**: System component identification
- **ValidationSeverity**: Error classification levels

### 2. Core Entity Interfaces (`core-entities.ts`)
- **City**: Complete city data structure with population, needs, ideology, and economics
- **Industry**: Industry entities with ownership, profitability, and lifecycle tracking
- **Vehicle**: Transport vehicles with cargo, age, and breakdown mechanics
- **Policy**: Government policies with prerequisites and effects
- **Route**: Transport routes with performance metrics
- **Station**: Transport hubs with capacity and cargo handling
- **IndustryApplication**: Industry approval workflow system
- **CityNeed**: Individual city requirement tracking
- **Supporting interfaces**: Vector3, Price, DateRange, and component interfaces

### 3. City Tier Management (`city-tier-needs.ts`)
- **CityTierNeeds**: Complete tier requirement mapping
- **CityGrowthNeeds**: Static configuration for all 7 city tiers
- **CityTierManager**: Utility class with methods for:
  - Population-to-tier mapping
  - Tier requirement lookup
  - Available needs calculation
  - Promotion/demotion validation
  - Population exodus rate calculation

### 4. Validation System (`validation.ts`)
- **ValidationResult**: Comprehensive validation reporting
- **ValidationError**: Detailed error information with severity
- **ValidationWarning**: Non-critical issue reporting
- **CriticalIssue**: System-threatening problem identification
- **ValidationUtils**: Core validation utilities for:
  - Number range validation
  - Required field checking
  - Entity reference validation
  - Array constraint validation
- **Entity-specific validation rules**:
  - CityValidationRules
  - IndustryValidationRules
  - VehicleValidationRules

### 5. Error Recovery System (`error-recovery.ts`)
- **ErrorRecoverySystem**: Main recovery coordinator
- **GameStateSnapshot**: State backup mechanism
- **RecoveryAction**: Automated fix procedures
- **CorruptionReport**: Data integrity analysis
- **EmergencyModeConfig**: Reduced functionality fallback
- **Recovery capabilities**:
  - State snapshot creation and management
  - Corruption detection and analysis
  - Automated recovery execution
  - Emergency mode activation
  - Subsystem isolation

### 6. Game State Management (`game-state.ts`)
- **GameState**: Complete game state structure
- **GameStateManager**: Transactional state management
- **StateUpdate**: Atomic change tracking
- **StateTransaction**: Multi-step update coordination
- **createInitialGameState**: Factory for starting conditions
- **Features**:
  - Atomic transactions with rollback
  - State history management
  - Subsystem-specific updates
  - Memory management and cleanup

## Key Features Implemented

### ✅ Requirements Coverage
- **Requirement 8.4**: Complete data validation utilities with integrity checking
- **Requirement 3.1**: Full ownership model support (state-owned, mixed, private)
- **Requirement 3.2**: Industry lifecycle management with profitability tracking
- **Requirement 3.3**: Dynamic economic simulation data structures

### ✅ City Tier System
- 7-tier city classification system
- Population-based tier progression
- Need unlocking by tier (Wood→Fuel→Electricity→Food/Construction→Consumer Goods/Safety→Clean Air/Culture)
- 90-day promotion/demotion mechanics
- 10% population exodus on unmet needs

### ✅ Validation & Error Handling
- Comprehensive validation rules for all entity types
- Severity-based error classification
- Automated corruption detection
- Recovery action generation
- Emergency mode fallback system

### ✅ State Management
- Transactional updates with rollback capability
- Subsystem isolation for error containment
- State history for debugging and recovery
- Memory management with cleanup routines

### ✅ Type Safety
- Strict TypeScript interfaces for all game entities
- Comprehensive enum definitions for constants
- Proper type exports for external consumption
- Validation utilities with type checking

## Usage Examples

```typescript
// Create initial game state
const gameState = createInitialGameState();
const stateManager = new GameStateManager(gameState);

// City tier management
const tier = CityTierManager.getTierForPopulation(5000); // UrbanCentre
const needs = CityTierManager.getAllAvailableNeeds(CityTier.UrbanCentre);

// Validation
const city: City = { /* city data */ };
const errors = CityValidationRules.validatePopulationRange.validate(city);

// Error recovery
const recoverySystem = new ErrorRecoverySystem();
const snapshot = recoverySystem.createSnapshot(gameState, '1.0.0');
const validationResult = recoverySystem.validateGameState(gameState);
```

## File Structure
```
src/app/data/models/
├── index.ts                 # Main exports
├── enums.ts                 # Core enumerations
├── core-entities.ts         # Entity interfaces
├── city-tier-needs.ts       # City growth system
├── validation.ts            # Validation framework
├── error-recovery.ts        # Recovery system
├── game-state.ts           # State management
├── models.spec.ts          # Unit tests
├── validation-test.ts      # Manual validation
└── README.md              # This documentation
```

## Integration Points
- **Simulation Layer**: Entities provide data structures for economic, transport, and political simulations
- **Application Layer**: State management integrates with NgRx Signals
- **Presentation Layer**: Validation errors can be displayed in UI
- **Data Layer**: Save/load system uses these structures for persistence

This implementation provides a robust foundation for the game's data layer, ensuring type safety, data integrity, and error resilience throughout the application.