/**
 * Data validation interfaces and utilities for game state integrity
 */

import { ValidationSeverity, GameSubsystem } from './enums';
import { City, Industry, Vehicle, Policy, Route } from './core-entities';

// Validation result interfaces
export interface ValidationError {
  id: string;
  severity: ValidationSeverity;
  subsystem: GameSubsystem;
  message: string;
  details: string;
  affectedEntityId?: string;
  suggestedFix?: string;
  timestamp: Date;
}

export interface ValidationWarning {
  id: string;
  subsystem: GameSubsystem;
  message: string;
  details: string;
  affectedEntityId?: string;
  timestamp: Date;
}

export interface CriticalIssue {
  id: string;
  subsystem: GameSubsystem;
  message: string;
  details: string;
  requiresImmediateAction: boolean;
  affectedEntityIds: string[];
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  criticalIssues: CriticalIssue[];
  validationTimestamp: Date;
  subsystemsChecked: GameSubsystem[];
}



// Validation rule interfaces
export interface ValidationRule<T> {
  name: string;
  description: string;
  validate(entity: T): ValidationError[];
}

export interface StateValidationRule {
  name: string;
  description: string;
  subsystem: GameSubsystem;
  validate(gameState: any): ValidationError[];
}

// Correction suggestions
export interface Correction {
  type: 'auto-fix' | 'manual-action' | 'rollback';
  description: string;
  action: () => void | Promise<void>;
  riskLevel: 'low' | 'medium' | 'high';
}

// Validation utilities
export class ValidationUtils {
  /**
   * Validate that a number is within acceptable range
   */
  static validateNumberRange(
    value: number, 
    min: number, 
    max: number, 
    fieldName: string,
    entityId: string
  ): ValidationError | null {
    if (value < min || value > max) {
      return {
        id: `range-${entityId}-${fieldName}`,
        severity: ValidationSeverity.Error,
        subsystem: GameSubsystem.Economic,
        message: `${fieldName} out of valid range`,
        details: `Value ${value} is outside acceptable range [${min}, ${max}]`,
        affectedEntityId: entityId,
        suggestedFix: `Set ${fieldName} to a value between ${min} and ${max}`,
        timestamp: new Date()
      };
    }
    return null;
  }

  /**
   * Validate that required fields are not null or undefined
   */
  static validateRequiredField<T>(
    value: T | null | undefined, 
    fieldName: string,
    entityId: string,
    subsystem: GameSubsystem
  ): ValidationError | null {
    if (value === null || value === undefined) {
      return {
        id: `required-${entityId}-${fieldName}`,
        severity: ValidationSeverity.Critical,
        subsystem,
        message: `Required field ${fieldName} is missing`,
        details: `Entity ${entityId} has null or undefined value for required field ${fieldName}`,
        affectedEntityId: entityId,
        suggestedFix: `Initialize ${fieldName} with appropriate default value`,
        timestamp: new Date()
      };
    }
    return null;
  }

  /**
   * Validate that references between entities are valid
   */
  static validateEntityReference(
    referencedId: string,
    existingIds: string[],
    fieldName: string,
    entityId: string,
    subsystem: GameSubsystem
  ): ValidationError | null {
    if (!existingIds.includes(referencedId)) {
      return {
        id: `reference-${entityId}-${fieldName}`,
        severity: ValidationSeverity.Error,
        subsystem,
        message: `Invalid entity reference in ${fieldName}`,
        details: `Entity ${entityId} references non-existent entity ${referencedId}`,
        affectedEntityId: entityId,
        suggestedFix: `Remove invalid reference or create missing entity`,
        timestamp: new Date()
      };
    }
    return null;
  }

  /**
   * Validate array constraints (min/max length, unique values)
   */
  static validateArrayConstraints<T>(
    array: T[],
    constraints: {
      minLength?: number;
      maxLength?: number;
      unique?: boolean;
    },
    fieldName: string,
    entityId: string,
    subsystem: GameSubsystem
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (constraints.minLength !== undefined && array.length < constraints.minLength) {
      errors.push({
        id: `array-min-${entityId}-${fieldName}`,
        severity: ValidationSeverity.Warning,
        subsystem,
        message: `Array ${fieldName} below minimum length`,
        details: `Array has ${array.length} items, minimum required: ${constraints.minLength}`,
        affectedEntityId: entityId,
        timestamp: new Date()
      });
    }

    if (constraints.maxLength !== undefined && array.length > constraints.maxLength) {
      errors.push({
        id: `array-max-${entityId}-${fieldName}`,
        severity: ValidationSeverity.Error,
        subsystem,
        message: `Array ${fieldName} exceeds maximum length`,
        details: `Array has ${array.length} items, maximum allowed: ${constraints.maxLength}`,
        affectedEntityId: entityId,
        timestamp: new Date()
      });
    }

    if (constraints.unique && new Set(array).size !== array.length) {
      errors.push({
        id: `array-unique-${entityId}-${fieldName}`,
        severity: ValidationSeverity.Error,
        subsystem,
        message: `Array ${fieldName} contains duplicate values`,
        details: `Array should contain unique values only`,
        affectedEntityId: entityId,
        timestamp: new Date()
      });
    }

    return errors;
  }
}

// Specific validation rules for core entities
export class CityValidationRules {
  static validatePopulationRange: ValidationRule<City> = {
    name: 'population-range',
    description: 'Validate city population is within acceptable range',
    validate: (city: City): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      const populationError = ValidationUtils.validateNumberRange(
        city.population, 0, 10000000, 'population', city.id
      );
      if (populationError) errors.push(populationError);

      return errors;
    }
  };

  static validateApprovalRating: ValidationRule<City> = {
    name: 'approval-rating',
    description: 'Validate city approval rating is between 0-100',
    validate: (city: City): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      const approvalError = ValidationUtils.validateNumberRange(
        city.approvalRating, 0, 100, 'approvalRating', city.id
      );
      if (approvalError) errors.push(approvalError);

      return errors;
    }
  };

  static validateRequiredFields: ValidationRule<City> = {
    name: 'required-fields',
    description: 'Validate all required city fields are present',
    validate: (city: City): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      const nameError = ValidationUtils.validateRequiredField(
        city.name, 'name', city.id, GameSubsystem.Economic
      );
      if (nameError) errors.push(nameError);

      const positionError = ValidationUtils.validateRequiredField(
        city.position, 'position', city.id, GameSubsystem.Economic
      );
      if (positionError) errors.push(positionError);

      return errors;
    }
  };
}

export class IndustryValidationRules {
  static validateProfitability: ValidationRule<Industry> = {
    name: 'profitability-range',
    description: 'Validate industry profitability is within reasonable range',
    validate: (industry: Industry): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      const profitError = ValidationUtils.validateNumberRange(
        industry.profitability, -1000000, 1000000, 'profitability', industry.id
      );
      if (profitError) errors.push(profitError);

      return errors;
    }
  };

  static validateProductionCapacity: ValidationRule<Industry> = {
    name: 'production-capacity',
    description: 'Validate production capacity is positive',
    validate: (industry: Industry): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      if (industry.productionCapacity < 0) {
        errors.push({
          id: `production-capacity-${industry.id}`,
          severity: ValidationSeverity.Error,
          subsystem: GameSubsystem.Economic,
          message: 'Production capacity cannot be negative',
          details: `Industry ${industry.id} has negative production capacity: ${industry.productionCapacity}`,
          affectedEntityId: industry.id,
          suggestedFix: 'Set production capacity to 0 or positive value',
          timestamp: new Date()
        });
      }

      return errors;
    }
  };
}

export class VehicleValidationRules {
  static validateAge: ValidationRule<Vehicle> = {
    name: 'vehicle-age',
    description: 'Validate vehicle age is non-negative',
    validate: (vehicle: Vehicle): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      if (vehicle.age < 0) {
        errors.push({
          id: `age-${vehicle.id}`,
          severity: ValidationSeverity.Error,
          subsystem: GameSubsystem.Transport,
          message: 'Vehicle age cannot be negative',
          details: `Vehicle ${vehicle.id} has negative age: ${vehicle.age}`,
          affectedEntityId: vehicle.id,
          suggestedFix: 'Set vehicle age to 0 or positive value',
          timestamp: new Date()
        });
      }

      return errors;
    }
  };

  static validateCapacity: ValidationRule<Vehicle> = {
    name: 'vehicle-capacity',
    description: 'Validate vehicle capacity and cargo load',
    validate: (vehicle: Vehicle): ValidationError[] => {
      const errors: ValidationError[] = [];
      
      if (vehicle.capacity <= 0) {
        errors.push({
          id: `capacity-${vehicle.id}`,
          severity: ValidationSeverity.Error,
          subsystem: GameSubsystem.Transport,
          message: 'Vehicle capacity must be positive',
          details: `Vehicle ${vehicle.id} has invalid capacity: ${vehicle.capacity}`,
          affectedEntityId: vehicle.id,
          timestamp: new Date()
        });
      }

      const totalCargoWeight = vehicle.cargo.reduce((sum, cargo) => sum + cargo.quantity, 0);
      if (totalCargoWeight > vehicle.capacity) {
        errors.push({
          id: `overloaded-${vehicle.id}`,
          severity: ValidationSeverity.Warning,
          subsystem: GameSubsystem.Transport,
          message: 'Vehicle is overloaded',
          details: `Vehicle ${vehicle.id} carrying ${totalCargoWeight} units, capacity: ${vehicle.capacity}`,
          affectedEntityId: vehicle.id,
          timestamp: new Date()
        });
      }

      return errors;
    }
  };
}