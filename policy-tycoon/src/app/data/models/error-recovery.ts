/**
 * Error recovery system for game state management
 */

import { GameSubsystem, ValidationSeverity } from './enums';
import { 
  ValidationResult, 
  ValidationError, 
  CriticalIssue,
  Correction 
} from './validation';

export interface CorruptionReport {
  corruptedSubsystems: GameSubsystem[];
  corruptedEntities: string[];
  corruptionType: 'data-integrity' | 'state-inconsistency' | 'reference-broken';
  severity: 'minor' | 'major' | 'critical';
  canAutoRecover: boolean;
  recoveryActions: string[];
}

// Recovery state interfaces
export interface GameStateSnapshot {
  id: string;
  timestamp: Date;
  gameState: any;
  checksum: string;
  version: string;
  isValid: boolean;
}

export interface RecoveryAction {
  id: string;
  type: 'rollback' | 'repair' | 'disable-subsystem' | 'emergency-mode';
  description: string;
  targetSubsystem?: GameSubsystem;
  execute: () => Promise<boolean>;
  rollback?: () => Promise<boolean>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryResult {
  success: boolean;
  actionsExecuted: string[];
  remainingIssues: ValidationError[];
  newSnapshot?: GameStateSnapshot;
  message: string;
}

export interface EmergencyModeConfig {
  disabledSubsystems: GameSubsystem[];
  reducedFunctionality: string[];
  safetyChecksEnabled: boolean;
  autoSaveInterval: number;
}

/**
 * Main error recovery system
 */
export class ErrorRecoverySystem {
  private snapshots: GameStateSnapshot[] = [];
  private maxSnapshots = 10;
  private emergencyMode = false;
  private emergencyConfig: EmergencyModeConfig | null = null;
  private disabledSubsystems = new Set<GameSubsystem>();

  /**
   * Create a snapshot of the current game state
   */
  createSnapshot(gameState: any, version: string): GameStateSnapshot {
    const snapshot: GameStateSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date(),
      gameState: this.deepClone(gameState),
      checksum: this.calculateChecksum(gameState),
      version,
      isValid: true
    };

    this.snapshots.push(snapshot);
    
    // Keep only the most recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Validate the current game state
   */
  validateGameState(gameState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];
    const criticalIssues: CriticalIssue[] = [];
    const subsystemsChecked: GameSubsystem[] = [];

    try {
      // Validate basic structure
      if (!gameState) {
        criticalIssues.push({
          id: 'null-game-state',
          subsystem: GameSubsystem.UI,
          message: 'Game state is null or undefined',
          details: 'The entire game state object is missing',
          requiresImmediateAction: true,
          affectedEntityIds: [],
          timestamp: new Date()
        });
      }

      // Validate cities
      if (gameState.cities) {
        subsystemsChecked.push(GameSubsystem.Economic);
        this.validateCities(gameState.cities, errors, criticalIssues);
      }

      // Validate industries
      if (gameState.industries) {
        this.validateIndustries(gameState.industries, errors, criticalIssues);
      }

      // Validate transport network
      if (gameState.transportNetwork) {
        subsystemsChecked.push(GameSubsystem.Transport);
        this.validateTransportNetwork(gameState.transportNetwork, errors, criticalIssues);
      }

      // Validate political state
      if (gameState.politicalState) {
        subsystemsChecked.push(GameSubsystem.Political);
        this.validatePoliticalState(gameState.politicalState, errors, criticalIssues);
      }

    } catch (error) {
      criticalIssues.push({
        id: 'validation-exception',
        subsystem: GameSubsystem.UI,
        message: 'Exception during validation',
        details: `Validation failed with error: ${error}`,
        requiresImmediateAction: true,
        affectedEntityIds: [],
        timestamp: new Date()
      });
    }

    return {
      isValid: errors.length === 0 && criticalIssues.length === 0,
      errors,
      warnings,
      criticalIssues,
      validationTimestamp: new Date(),
      subsystemsChecked
    };
  }

  /**
   * Detect state corruption
   */
  detectStateCorruption(gameState: any): CorruptionReport {
    const corruptedSubsystems: GameSubsystem[] = [];
    const corruptedEntities: string[] = [];
    let corruptionType: 'data-integrity' | 'state-inconsistency' | 'reference-broken' = 'data-integrity';
    let severity: 'minor' | 'major' | 'critical' = 'minor';
    let canAutoRecover = true;

    try {
      // Check for null/undefined critical objects
      if (!gameState.cities || !Array.isArray(gameState.cities)) {
        corruptedSubsystems.push(GameSubsystem.Economic);
        severity = 'critical';
        canAutoRecover = false;
      }

      // Check for broken references
      if (gameState.industries) {
        for (const industry of gameState.industries) {
          if (industry.inputConnections) {
            for (const connection of industry.inputConnections) {
              if (!this.findEntityById(gameState.transportNetwork?.stations, connection.stationId)) {
                corruptedEntities.push(industry.id);
                corruptionType = 'reference-broken';
                severity = 'major';
              }
            }
          }
        }
      }

      // Check for data integrity issues
      if (gameState.cities) {
        for (const city of gameState.cities) {
          if (typeof city.population !== 'number' || city.population < 0) {
            corruptedEntities.push(city.id);
            corruptedSubsystems.push(GameSubsystem.Economic);
            severity = 'major';
          }
        }
      }

    } catch (error) {
      severity = 'critical';
      canAutoRecover = false;
      corruptionType = 'state-inconsistency';
    }

    return {
      corruptedSubsystems: [...new Set(corruptedSubsystems)],
      corruptedEntities: [...new Set(corruptedEntities)],
      corruptionType,
      severity,
      canAutoRecover,
      recoveryActions: this.generateRecoveryActions(corruptedSubsystems, corruptedEntities, severity)
    };
  }

  /**
   * Attempt to recover from errors
   */
  async recoverFromErrors(
    validationResult: ValidationResult, 
    gameState: any
  ): Promise<RecoveryResult> {
    const actionsExecuted: string[] = [];
    const remainingIssues: ValidationError[] = [];

    try {
      // Handle critical issues first
      for (const issue of validationResult.criticalIssues) {
        if (issue.requiresImmediateAction) {
          const action = this.createRecoveryAction(issue);
          const success = await action.execute();
          
          if (success) {
            actionsExecuted.push(action.id);
          } else {
            // If critical recovery fails, enable emergency mode
            await this.enableEmergencyMode();
            actionsExecuted.push('emergency-mode-enabled');
          }
        }
      }

      // Handle regular errors
      for (const error of validationResult.errors) {
        if (error.severity === ValidationSeverity.Critical) {
          const action = this.createRecoveryAction(error);
          const success = await action.execute();
          
          if (success) {
            actionsExecuted.push(action.id);
          } else {
            remainingIssues.push(error);
          }
        } else {
          remainingIssues.push(error);
        }
      }

      // Create new snapshot if recovery was successful
      let newSnapshot: GameStateSnapshot | undefined;
      if (remainingIssues.length === 0) {
        newSnapshot = this.createSnapshot(gameState, 'post-recovery');
      }

      return {
        success: remainingIssues.length === 0,
        actionsExecuted,
        remainingIssues,
        newSnapshot,
        message: this.generateRecoveryMessage(actionsExecuted, remainingIssues)
      };

    } catch (error) {
      await this.enableEmergencyMode();
      
      return {
        success: false,
        actionsExecuted: ['emergency-mode-enabled'],
        remainingIssues: validationResult.errors,
        message: `Recovery failed, emergency mode enabled: ${error}`
      };
    }
  }

  /**
   * Roll back to the last valid state
   */
  async rollbackToLastValidState(): Promise<boolean> {
    const validSnapshot = this.snapshots
      .slice()
      .reverse()
      .find(snapshot => snapshot.isValid);

    if (!validSnapshot) {
      console.error('No valid snapshot found for rollback');
      return false;
    }

    try {
      // This would be implemented by the game state manager
      // For now, we just mark the action as successful
      console.log(`Rolling back to snapshot ${validSnapshot.id} from ${validSnapshot.timestamp}`);
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Disable a failing subsystem
   */
  disableFailingSubsystem(subsystem: GameSubsystem): void {
    this.disabledSubsystems.add(subsystem);
    console.warn(`Subsystem ${subsystem} has been disabled due to critical errors`);
  }

  /**
   * Enable emergency mode
   */
  async enableEmergencyMode(): Promise<void> {
    this.emergencyMode = true;
    this.emergencyConfig = {
      disabledSubsystems: [GameSubsystem.Political, GameSubsystem.Environmental],
      reducedFunctionality: ['complex-calculations', 'background-processing'],
      safetyChecksEnabled: true,
      autoSaveInterval: 30000 // 30 seconds
    };

    console.warn('Emergency mode enabled - reduced functionality active');
  }

  /**
   * Check if emergency mode is active
   */
  isEmergencyModeActive(): boolean {
    return this.emergencyMode;
  }

  /**
   * Get emergency mode configuration
   */
  getEmergencyConfig(): EmergencyModeConfig | null {
    return this.emergencyConfig;
  }

  // Private helper methods
  private validateCities(cities: any[], errors: ValidationError[], criticalIssues: CriticalIssue[]): void {
    if (!Array.isArray(cities)) {
      criticalIssues.push({
        id: 'cities-not-array',
        subsystem: GameSubsystem.Economic,
        message: 'Cities data is not an array',
        details: 'Cities should be stored as an array of city objects',
        requiresImmediateAction: true,
        affectedEntityIds: [],
        timestamp: new Date()
      });
      return;
    }

    for (const city of cities) {
      if (!city.id || typeof city.id !== 'string') {
        errors.push({
          id: `city-invalid-id-${Date.now()}`,
          severity: ValidationSeverity.Critical,
          subsystem: GameSubsystem.Economic,
          message: 'City has invalid or missing ID',
          details: 'Each city must have a unique string ID',
          affectedEntityId: city.id || 'unknown',
          timestamp: new Date()
        });
      }
    }
  }

  private validateIndustries(industries: any[], errors: ValidationError[], criticalIssues: CriticalIssue[]): void {
    // Similar validation logic for industries
  }

  private validateTransportNetwork(network: any, errors: ValidationError[], criticalIssues: CriticalIssue[]): void {
    // Similar validation logic for transport network
  }

  private validatePoliticalState(politicalState: any, errors: ValidationError[], criticalIssues: CriticalIssue[]): void {
    // Similar validation logic for political state
  }

  private findEntityById(entities: any[], id: string): any {
    return entities?.find(entity => entity.id === id);
  }

  private createRecoveryAction(issue: ValidationError | CriticalIssue): RecoveryAction {
    return {
      id: `recovery-${issue.id}`,
      type: 'repair',
      description: `Attempt to fix: ${issue.message}`,
      execute: async () => {
        // Implementation would depend on the specific error type
        console.log(`Executing recovery action for: ${issue.message}`);
        return true;
      },
      riskLevel: 'medium'
    };
  }

  private generateRecoveryActions(
    subsystems: GameSubsystem[], 
    entities: string[], 
    severity: string
  ): string[] {
    const actions: string[] = [];
    
    if (severity === 'critical') {
      actions.push('enable-emergency-mode');
      actions.push('disable-affected-subsystems');
    } else {
      actions.push('repair-corrupted-data');
      actions.push('validate-references');
    }
    
    return actions;
  }

  private generateRecoveryMessage(actionsExecuted: string[], remainingIssues: ValidationError[]): string {
    if (remainingIssues.length === 0) {
      return `Recovery successful. Executed ${actionsExecuted.length} recovery actions.`;
    } else {
      return `Partial recovery. Executed ${actionsExecuted.length} actions, ${remainingIssues.length} issues remain.`;
    }
  }

  private deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  private calculateChecksum(obj: any): string {
    // Simple checksum implementation
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}