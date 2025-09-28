/**
 * Unit tests for core data models
 */

import { describe, it, expect, beforeEach } from 'vitest';

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
import { TimeSpeed } from './enums';

describe('Core Data Models', () => {
  
  describe('Enums', () => {
    it('should have correct CityTier values', () => {
      expect(CityTier.Hamlet).toBe(0);
      expect(CityTier.SmallTown).toBe(1);
      expect(CityTier.AdvancedCity).toBe(6);
    });

    it('should have correct OwnershipModel values', () => {
      expect(OwnershipModel.StateOwned).toBe('state-owned');
      expect(OwnershipModel.Mixed).toBe('mixed');
      expect(OwnershipModel.Private).toBe('private');
    });
  });

  describe('CityTierManager', () => {
    it('should return correct tier for population', () => {
      expect(CityTierManager.getTierForPopulation(250)).toBe(CityTier.Hamlet);
      expect(CityTierManager.getTierForPopulation(750)).toBe(CityTier.SmallTown);
      expect(CityTierManager.getTierForPopulation(2500)).toBe(CityTier.GrowingTown);
      expect(CityTierManager.getTierForPopulation(15000)).toBe(CityTier.UrbanCentre);
    });

    it('should return correct tier requirements', () => {
      const hamletReq = CityTierManager.getTierRequirements(CityTier.Hamlet);
      expect(hamletReq).toBeDefined();
      expect(hamletReq?.requiredNeeds).toEqual([]);
      expect(hamletReq?.newNeedsUnlocked).toEqual([]);

      const townReq = CityTierManager.getTierRequirements(CityTier.SmallTown);
      expect(townReq).toBeDefined();
      expect(townReq?.newNeedsUnlocked).toContain(NeedType.Wood);
    });

    it('should get all available needs for tier', () => {
      const hamletNeeds = CityTierManager.getAllAvailableNeeds(CityTier.Hamlet);
      expect(hamletNeeds).toEqual([]);

      const townNeeds = CityTierManager.getAllAvailableNeeds(CityTier.SmallTown);
      expect(townNeeds).toContain(NeedType.Wood);

      const cityNeeds = CityTierManager.getAllAvailableNeeds(CityTier.UrbanCentre);
      expect(cityNeeds).toContain(NeedType.Wood);
      expect(cityNeeds).toContain(NeedType.Fuel);
      expect(cityNeeds).toContain(NeedType.Electricity);
    });

    it('should validate promotion eligibility', () => {
      const mockCity = {
        tier: CityTier.SmallTown,
        population: 1200
      };

      expect(CityTierManager.canPromote(mockCity, 90)).toBe(true);
      expect(CityTierManager.canPromote(mockCity, 50)).toBe(false);
    });

    it('should validate demotion conditions', () => {
      const mockCity = {
        tier: CityTier.GrowingTown
      };

      expect(CityTierManager.shouldDemote(mockCity, 90)).toBe(true);
      expect(CityTierManager.shouldDemote(mockCity, 50)).toBe(false);
    });
  });

  describe('ValidationUtils', () => {
    it('should validate number ranges correctly', () => {
      const error = ValidationUtils.validateNumberRange(150, 0, 100, 'testField', 'entity1');
      expect(error).toBeTruthy();
      expect(error?.severity).toBe(ValidationSeverity.Error);

      const noError = ValidationUtils.validateNumberRange(50, 0, 100, 'testField', 'entity1');
      expect(noError).toBeNull();
    });

    it('should validate required fields', () => {
      const error = ValidationUtils.validateRequiredField(null, 'testField', 'entity1', GameSubsystem.Economic);
      expect(error).toBeTruthy();
      expect(error?.severity).toBe(ValidationSeverity.Critical);

      const noError = ValidationUtils.validateRequiredField('value', 'testField', 'entity1', GameSubsystem.Economic);
      expect(noError).toBeNull();
    });

    it('should validate entity references', () => {
      const existingIds = ['id1', 'id2', 'id3'];
      
      const error = ValidationUtils.validateEntityReference('id4', existingIds, 'refField', 'entity1', GameSubsystem.Transport);
      expect(error).toBeTruthy();
      expect(error?.severity).toBe(ValidationSeverity.Error);

      const noError = ValidationUtils.validateEntityReference('id2', existingIds, 'refField', 'entity1', GameSubsystem.Transport);
      expect(noError).toBeNull();
    });

    it('should validate array constraints', () => {
      const shortArray = [1, 2];
      const longArray = [1, 2, 3, 4, 5, 6];
      const duplicateArray = [1, 2, 2, 3];

      const minLengthErrors = ValidationUtils.validateArrayConstraints(
        shortArray, 
        { minLength: 5 }, 
        'testArray', 
        'entity1', 
        GameSubsystem.Economic
      );
      expect(minLengthErrors.length).toBe(1);

      const maxLengthErrors = ValidationUtils.validateArrayConstraints(
        longArray, 
        { maxLength: 3 }, 
        'testArray', 
        'entity1', 
        GameSubsystem.Economic
      );
      expect(maxLengthErrors.length).toBe(1);

      const uniqueErrors = ValidationUtils.validateArrayConstraints(
        duplicateArray, 
        { unique: true }, 
        'testArray', 
        'entity1', 
        GameSubsystem.Economic
      );
      expect(uniqueErrors.length).toBe(1);
    });
  });

  describe('CityValidationRules', () => {
    it('should validate city population range', () => {
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

      const errors = CityValidationRules.validatePopulationRange.validate(validCity);
      expect(errors.length).toBe(0);

      const invalidCity = { ...validCity, population: -100 };
      const invalidErrors = CityValidationRules.validatePopulationRange.validate(invalidCity);
      expect(invalidErrors.length).toBe(1);
    });

    it('should validate approval rating range', () => {
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

      const errors = CityValidationRules.validateApprovalRating.validate(validCity);
      expect(errors.length).toBe(0);

      const invalidCity = { ...validCity, approvalRating: 150 };
      const invalidErrors = CityValidationRules.validateApprovalRating.validate(invalidCity);
      expect(invalidErrors.length).toBe(1);
    });
  });

  describe('ErrorRecoverySystem', () => {
    let recoverySystem: ErrorRecoverySystem;

    beforeEach(() => {
      recoverySystem = new ErrorRecoverySystem();
    });

    it('should create snapshots', () => {
      const gameState = { cities: [], industries: [] };
      const snapshot = recoverySystem.createSnapshot(gameState, '1.0.0');
      
      expect(snapshot.id).toBeDefined();
      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.isValid).toBe(true);
      expect(snapshot.gameState).toEqual(gameState);
    });

    it('should validate game state', () => {
      const validGameState = {
        cities: [
          { id: 'city1', name: 'Test City', population: 1000 }
        ],
        industries: [],
        transportNetwork: { stations: [] }
      };

      const result = recoverySystem.validateGameState(validGameState);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect corruption', () => {
      const corruptedGameState = {
        cities: null, // This should trigger corruption detection
        industries: []
      };

      const report = recoverySystem.detectStateCorruption(corruptedGameState);
      expect(report.severity).toBe('critical');
      expect(report.canAutoRecover).toBe(false);
    });

    it('should not be in emergency mode initially', () => {
      expect(recoverySystem.isEmergencyModeActive()).toBe(false);
      expect(recoverySystem.getEmergencyConfig()).toBeNull();
    });
  });

  describe('GameStateManager', () => {
    let stateManager: GameStateManager;
    let initialState: any;

    beforeEach(() => {
      initialState = createInitialGameState();
      stateManager = new GameStateManager(initialState);
    });

    it('should create initial game state', () => {
      expect(initialState.cities).toEqual([]);
      expect(initialState.industries).toEqual([]);
      expect(initialState.politicalState.currentApproval).toBe(70);
      expect(initialState.timeState.gameSpeed).toBe(TimeSpeed.Fastest); // ×8 speed
      expect(initialState.financialState.treasury).toBe(1000000);
    });

    it('should get current state', () => {
      const currentState = stateManager.getCurrentState();
      
      // Compare individual properties instead of deep equality due to Date serialization
      expect(currentState.cities).toEqual(initialState.cities);
      expect(currentState.industries).toEqual(initialState.industries);
      expect(currentState.vehicles).toEqual(initialState.vehicles);
      expect(currentState.policies).toEqual(initialState.policies);
      expect(currentState.transportNetwork).toEqual(initialState.transportNetwork);
      expect(currentState.economicState).toEqual(initialState.economicState);
      expect(currentState.politicalState.currentApproval).toBe(initialState.politicalState.currentApproval);
      expect(currentState.politicalState.politicalCapital).toBe(initialState.politicalState.politicalCapital);
      expect(currentState.politicalState.chaosFlag).toBe(initialState.politicalState.chaosFlag);
      expect(currentState.timeState.gameSpeed).toBe(initialState.timeState.gameSpeed);
      expect(currentState.timeState.isPaused).toBe(initialState.timeState.isPaused);
      expect(currentState.timeState.totalGameDays).toBe(initialState.timeState.totalGameDays);
      expect(currentState.financialState).toEqual(initialState.financialState);
      expect(currentState.environmentalState).toEqual(initialState.environmentalState);
      expect(currentState.metadata.version).toBe(initialState.metadata.version);
      expect(currentState.metadata.playerId).toBe(initialState.metadata.playerId);
      expect(currentState.metadata.difficulty).toBe(initialState.metadata.difficulty);
      
      expect(currentState).not.toBe(initialState); // Should be a clone
    });

    it('should update subsystem state', () => {
      stateManager.updateSubsystem(
        GameSubsystem.Political, 
        { currentApproval: 80 }, 
        'Test update'
      );

      const updatedState = stateManager.getCurrentState();
      expect(updatedState.politicalState.currentApproval).toBe(80);
    });

    it('should handle transactions', () => {
      const txId = stateManager.beginTransaction();
      expect(txId).toBeDefined();

      stateManager.addToTransaction(
        txId, 
        GameSubsystem.Political, 
        { currentApproval: 85 }, 
        'Transaction test'
      );

      stateManager.commitTransaction(txId);

      const finalState = stateManager.getCurrentState();
      expect(finalState.politicalState.currentApproval).toBe(85);
    });

    it('should rollback transactions', () => {
      const originalApproval = stateManager.getCurrentState().politicalState.currentApproval;
      
      const txId = stateManager.beginTransaction();
      stateManager.addToTransaction(
        txId, 
        GameSubsystem.Political, 
        { currentApproval: 90 }, 
        'Rollback test'
      );

      stateManager.rollbackTransaction(txId);

      const finalState = stateManager.getCurrentState();
      expect(finalState.politicalState.currentApproval).toBe(originalApproval);
    });

    it('should maintain state history', () => {
      stateManager.updateSubsystem(GameSubsystem.Political, { currentApproval: 75 }, 'History test 1');
      stateManager.updateSubsystem(GameSubsystem.Political, { currentApproval: 80 }, 'History test 2');

      const history = stateManager.getStateHistory();
      expect(history.length).toBe(2);
    });
  });
});