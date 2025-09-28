/**
 * Core data models and types for Policy Transport Tycoon
 * 
 * This module exports all the core interfaces, enums, and utilities
 * needed for game state management and data validation.
 */

// Core enums and constants
export * from './enums';

// Core entity interfaces
export * from './core-entities';

// City tier management
export * from './city-tier-needs';

// Validation system
export * from './validation';

// Error recovery system
export * from './error-recovery';

// Game state management
export * from './game-state';

// City generation system
export * from './city-generation';

// Re-export commonly used types for convenience (core entities only)
export type {
  City,
  Industry,
  Vehicle,
  Policy,
  Route,
  Station,
  Cargo,
  IndustryApplication,
  CityNeed,
  CityIdeology
} from './core-entities';

export type {
  CityTierNeeds
} from './city-tier-needs';

export type {
  RecoveryAction,
  EmergencyModeConfig,
  GameStateSnapshot,
  RecoveryResult,
  CorruptionReport
} from './error-recovery';

export type {
  ValidationResult,
  ValidationError
} from './validation';

export {
  CityTier,
  OwnershipModel,
  PolicyStatus,
  NeedType,
  IndustryType,
  VehicleType,
  CargoType,
  ApplicationStatus,
  ConstructionStatus,
  OperationalStatus,
  SafetyLevel,
  TimeSpeed,
  GameSubsystem,
  ValidationSeverity
} from './enums';

// City-generation types and values are already exported above via:
// export * from './city-generation'

export {
  CityTierManager
} from './city-tier-needs';

export {
  ValidationUtils,
  CityValidationRules,
  IndustryValidationRules,
  VehicleValidationRules
} from './validation';

export {
  ErrorRecoverySystem
} from './error-recovery';

export {
  GameStateManager,
  createInitialGameState
} from './game-state';