/**
 * Simple validation test to verify core data models work correctly
 */

import { 
  CityTier, 
  NeedType, 
  OwnershipModel,
  ValidationSeverity,
  GameSubsystem
} from './enums';
import { 
  CityTierManager, 
  CityGrowthNeeds 
} from './city-tier-needs';
import { 
  ValidationUtils,
  CityValidationRules 
} from './validation';
import { 
  ErrorRecoverySystem 
} from './error-recovery';
import { 
  GameStateManager,
  createInitialGameState 
} from './game-state';
import { City } from './core-entities';
import { Vector3 } from '@babylonjs/core';

// Test function to validate core functionality
export function runValidationTests(): boolean {
  console.log('Running core data model validation tests...');
  
  try {
    // Test 1: Enum values
    console.log('✓ Testing enums...');
    if (CityTier.Hamlet !== 0 || CityTier.AdvancedCity !== 6) {
      throw new Error('CityTier enum values incorrect');
    }
    if (OwnershipModel.StateOwned !== 'state-owned') {
      throw new Error('OwnershipModel enum values incorrect');
    }
    
    // Test 2: CityTierManager
    console.log('✓ Testing CityTierManager...');
    const hamletTier = CityTierManager.getTierForPopulation(250);
    if (hamletTier !== CityTier.Hamlet) {
      throw new Error('CityTierManager population mapping incorrect');
    }
    
    const townNeeds = CityTierManager.getAllAvailableNeeds(CityTier.SmallTown);
    if (!townNeeds.includes(NeedType.Wood)) {
      throw new Error('CityTierManager needs mapping incorrect');
    }
    
    // Test 3: ValidationUtils
    console.log('✓ Testing ValidationUtils...');
    const rangeError = ValidationUtils.validateNumberRange(150, 0, 100, 'testField', 'entity1');
    if (!rangeError || rangeError.severity !== ValidationSeverity.Error) {
      throw new Error('ValidationUtils range validation failed');
    }
    
    const noError = ValidationUtils.validateNumberRange(50, 0, 100, 'testField', 'entity1');
    if (noError !== null) {
      throw new Error('ValidationUtils should return null for valid range');
    }
    
    // Test 4: ErrorRecoverySystem
    console.log('✓ Testing ErrorRecoverySystem...');
    const recoverySystem = new ErrorRecoverySystem();
    const gameState = { cities: [], industries: [] };
    const snapshot = recoverySystem.createSnapshot(gameState, '1.0.0');
    
    if (!snapshot.id || snapshot.version !== '1.0.0' || !snapshot.isValid) {
      throw new Error('ErrorRecoverySystem snapshot creation failed');
    }
    
    // Test 5: GameStateManager
    console.log('✓ Testing GameStateManager...');
    const initialState = createInitialGameState();
    if (initialState.politicalState.currentApproval !== 70) {
      throw new Error('Initial game state incorrect');
    }
    
    const stateManager = new GameStateManager(initialState);
    const currentState = stateManager.getCurrentState();
    if (currentState.politicalState.currentApproval !== 70) {
      throw new Error('GameStateManager getCurrentState failed');
    }
    
    // Test 6: City validation
    console.log('✓ Testing City validation...');
    const validCity: City = {
      id: 'city1',
      name: 'Test City',
      position: new Vector3(0, 0, 0),
      population: 5000,
      tier: CityTier.UrbanCentre,
      currentNeeds: [],
      unmetNeeds: [],
      needSatisfactionHistory: [],
      ideology: { progressive: 50, conservative: 50, driftRate: 0, lastUpdated: new Date() },
      approvalRating: 75,
      costOfLiving: 100,
      averageWage: 50000,
      unemployment: 0.05,
      connectedTransport: [],
      availableServices: []
    };
    
    const cityErrors = CityValidationRules.validatePopulationRange.validate(validCity);
    if (cityErrors.length !== 0) {
      throw new Error('City validation failed for valid city');
    }
    
    console.log('✅ All core data model tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the tests if this file is executed directly
if (typeof window === 'undefined') {
  runValidationTests();
}