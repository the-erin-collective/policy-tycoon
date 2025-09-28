/**
 * Game state management interfaces and utilities
 */

import { 
  City, 
  Industry, 
  Vehicle, 
  Policy, 
  Route, 
  Station,
  IndustryApplication 
} from './core-entities';
import { GameSubsystem, TimeSpeed } from './enums';

// Main game state interface
export interface GameState {
  // Core game data
  cities: City[];
  industries: Industry[];
  vehicles: Vehicle[];
  policies: Policy[];
  
  // Transport network
  transportNetwork: {
    routes: Route[];
    stations: Station[];
  };
  
  // Economic state
  economicState: {
    industryApplications: IndustryApplication[];
    globalPrices: Record<string, number>;
    tradeContracts: any[];
  };
  
  // Political state
  politicalState: {
    currentApproval: number;
    politicalCapital: number;
    chaosFlag: boolean;
    nextElectionDate: Date;
  };
  
  // Time and game progression
  timeState: {
    currentDate: Date;
    gameSpeed: TimeSpeed;
    isPaused: boolean;
    totalGameDays: number;
  };
  
  // Financial state
  financialState: {
    treasury: number;
    debt: number;
    ministryBudgets: Record<string, number>;
    inflationRate: number;
    currencyStrength: number;
  };
  
  // Environmental state
  environmentalState: {
    co2Level: number;
    waterReserves: number;
    naturalRechargeRate: number;
    pollutionLevel: number;
  };
  
  // Game metadata
  metadata: {
    version: string;
    createdAt: Date;
    lastSaved: Date;
    playerId: string;
    difficulty: string;
  };
}

// State update interfaces
export interface StateUpdate {
  subsystem: GameSubsystem;
  timestamp: Date;
  changes: Record<string, any>;
  reason: string;
}

export interface StateTransaction {
  id: string;
  updates: StateUpdate[];
  rollbackData?: any;
  committed: boolean;
  timestamp: Date;
}

// State management utilities
export class GameStateManager {
  private currentState: GameState;
  private stateHistory: GameState[] = [];
  private maxHistorySize = 50;
  private pendingTransactions: StateTransaction[] = [];

  constructor(initialState: GameState) {
    this.currentState = initialState;
  }

  /**
   * Get the current game state
   */
  getCurrentState(): GameState {
    return this.deepClone(this.currentState);
  }

  /**
   * Update a specific subsystem's state
   */
  updateSubsystem(subsystem: GameSubsystem, updates: Record<string, any>, reason: string): void {
    const stateUpdate: StateUpdate = {
      subsystem,
      timestamp: new Date(),
      changes: updates,
      reason
    };

    this.applyStateUpdate(stateUpdate);
    this.saveStateToHistory();
  }

  /**
   * Begin a state transaction for atomic updates
   */
  beginTransaction(): string {
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction: StateTransaction = {
      id: transactionId,
      updates: [],
      rollbackData: this.deepClone(this.currentState),
      committed: false,
      timestamp: new Date()
    };

    this.pendingTransactions.push(transaction);
    return transactionId;
  }

  /**
   * Add an update to a pending transaction
   */
  addToTransaction(transactionId: string, subsystem: GameSubsystem, updates: Record<string, any>, reason: string): void {
    const transaction = this.pendingTransactions.find(tx => tx.id === transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const stateUpdate: StateUpdate = {
      subsystem,
      timestamp: new Date(),
      changes: updates,
      reason
    };

    transaction.updates.push(stateUpdate);
  }

  /**
   * Commit a transaction, applying all updates atomically
   */
  commitTransaction(transactionId: string): void {
    const transactionIndex = this.pendingTransactions.findIndex(tx => tx.id === transactionId);
    if (transactionIndex === -1) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const transaction = this.pendingTransactions[transactionIndex];
    
    try {
      // Apply all updates in the transaction
      for (const update of transaction.updates) {
        this.applyStateUpdate(update);
      }

      transaction.committed = true;
      this.saveStateToHistory();
      
      // Remove the committed transaction
      this.pendingTransactions.splice(transactionIndex, 1);
      
    } catch (error) {
      // Rollback on error
      this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction(transactionId: string): void {
    const transactionIndex = this.pendingTransactions.findIndex(tx => tx.id === transactionId);
    if (transactionIndex === -1) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const transaction = this.pendingTransactions[transactionIndex];
    
    if (transaction.rollbackData) {
      this.currentState = transaction.rollbackData;
    }

    // Remove the rolled back transaction
    this.pendingTransactions.splice(transactionIndex, 1);
  }

  /**
   * Get state history for debugging or rollback
   */
  getStateHistory(): GameState[] {
    return this.stateHistory.slice();
  }

  /**
   * Rollback to a previous state
   */
  rollbackToState(stateIndex: number): boolean {
    if (stateIndex < 0 || stateIndex >= this.stateHistory.length) {
      return false;
    }

    this.currentState = this.deepClone(this.stateHistory[stateIndex]);
    return true;
  }

  /**
   * Clear old state history to manage memory
   */
  cleanupHistory(): void {
    if (this.stateHistory.length > this.maxHistorySize) {
      const excessCount = this.stateHistory.length - this.maxHistorySize;
      this.stateHistory.splice(0, excessCount);
    }
  }

  // Private helper methods
  private applyStateUpdate(update: StateUpdate): void {
    switch (update.subsystem) {
      case GameSubsystem.Economic:
        this.applyEconomicUpdate(update.changes);
        break;
      case GameSubsystem.Transport:
        this.applyTransportUpdate(update.changes);
        break;
      case GameSubsystem.Political:
        this.applyPoliticalUpdate(update.changes);
        break;
      case GameSubsystem.Environmental:
        this.applyEnvironmentalUpdate(update.changes);
        break;
      case GameSubsystem.UI:
        this.applyUIUpdate(update.changes);
        break;
      default:
        console.warn(`Unknown subsystem: ${update.subsystem}`);
    }
  }

  private applyEconomicUpdate(changes: Record<string, any>): void {
    if (changes['cities']) {
      this.currentState.cities = changes['cities'];
    }
    if (changes['industries']) {
      this.currentState.industries = changes['industries'];
    }
    if (changes['industryApplications']) {
      this.currentState.economicState.industryApplications = changes['industryApplications'];
    }
    if (changes['globalPrices']) {
      this.currentState.economicState.globalPrices = { ...this.currentState.economicState.globalPrices, ...changes['globalPrices'] };
    }
  }

  private applyTransportUpdate(changes: Record<string, any>): void {
    if (changes['routes']) {
      this.currentState.transportNetwork.routes = changes['routes'];
    }
    if (changes['stations']) {
      this.currentState.transportNetwork.stations = changes['stations'];
    }
    if (changes['vehicles']) {
      this.currentState.vehicles = changes['vehicles'];
    }
  }

  private applyPoliticalUpdate(changes: Record<string, any>): void {
    if (changes['currentApproval'] !== undefined) {
      this.currentState.politicalState.currentApproval = changes['currentApproval'];
    }
    if (changes['politicalCapital'] !== undefined) {
      this.currentState.politicalState.politicalCapital = changes['politicalCapital'];
    }
    if (changes['chaosFlag'] !== undefined) {
      this.currentState.politicalState.chaosFlag = changes['chaosFlag'];
    }
  }

  private applyEnvironmentalUpdate(changes: Record<string, any>): void {
    if (changes['co2Level'] !== undefined) {
      this.currentState.environmentalState.co2Level = changes['co2Level'];
    }
    if (changes['waterReserves'] !== undefined) {
      this.currentState.environmentalState.waterReserves = changes['waterReserves'];
    }
    if (changes['pollutionLevel'] !== undefined) {
      this.currentState.environmentalState.pollutionLevel = changes['pollutionLevel'];
    }
  }

  private applyUIUpdate(changes: Record<string, any>): void {
    if (changes['gameSpeed'] !== undefined) {
      this.currentState.timeState.gameSpeed = changes['gameSpeed'];
    }
    if (changes['isPaused'] !== undefined) {
      this.currentState.timeState.isPaused = changes['isPaused'];
    }
  }

  private saveStateToHistory(): void {
    this.stateHistory.push(this.deepClone(this.currentState));
    this.cleanupHistory();
  }

  private deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Factory function for creating initial game state
export function createInitialGameState(): GameState {
  return {
    cities: [],
    industries: [],
    vehicles: [],
    policies: [],
    transportNetwork: {
      routes: [],
      stations: []
    },
    economicState: {
      industryApplications: [],
      globalPrices: {},
      tradeContracts: []
    },
    politicalState: {
      currentApproval: 70, // Starting with 70% approval as per requirements
      politicalCapital: 70,
      chaosFlag: false,
      nextElectionDate: new Date(Date.now() + (5 * 365 * 24 * 60 * 60 * 1000)) // 5 years from now
    },
    timeState: {
      currentDate: new Date(),
      gameSpeed: TimeSpeed.Fastest, // Default to ×4 speed as per requirements
      isPaused: false,
      totalGameDays: 0
    },
    financialState: {
      treasury: 1000000, // Starting treasury
      debt: 0,
      ministryBudgets: {
        transport: 100000,
        industry: 100000,
        finance: 50000,
        infrastructure: 100000,
        environment: 50000
      },
      inflationRate: 0.02, // 2% annual inflation
      currencyStrength: 1.0
    },
    environmentalState: {
      co2Level: 350, // ppm
      waterReserves: 1000000, // units
      naturalRechargeRate: 1000, // units per day
      pollutionLevel: 0.1
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      lastSaved: new Date(),
      playerId: 'player-1',
      difficulty: 'normal'
    }
  };
}