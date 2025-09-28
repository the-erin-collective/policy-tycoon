/**
 * Core game entity interfaces
 */

import { Vector3 } from '@babylonjs/core';
import { 
  CityTier, 
  NeedType, 
  IndustryType, 
  OwnershipModel, 
  ConstructionStatus, 
  OperationalStatus,
  VehicleType,
  CargoType,
  PolicyStatus,
  ApplicationStatus,
  SafetyLevel
} from './enums';

// Export CityTier so it can be imported from this module
export { CityTier };

// Base interfaces

export interface Price {
  amount: number;
  currency: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// City and Population Management
export interface CityNeed {
  type: NeedType;
  priority: number;
  satisfactionLevel: number; // 0-100
  daysUnsatisfied: number;
  iconVisible: boolean;
}

export interface NeedSatisfactionRecord {
  date: Date;
  needType: NeedType;
  satisfactionLevel: number;
}

export interface CityIdeology {
  progressive: number; // 0-100
  conservative: number; // 0-100
  driftRate: number;
  lastUpdated: Date;
}

export interface TransportConnection {
  id: string;
  stationId: string;
  routeId: string;
  cargoTypes: CargoType[];
  capacity: number;
}

export interface Service {
  type: string;
  quality: number;
  coverage: number;
}

export interface City {
  id: string;
  name: string;
  position: Vector3;
  population: number;
  tier: CityTier;
  
  // Growth and needs
  currentNeeds: CityNeed[];
  unmetNeeds: CityNeed[];
  needSatisfactionHistory: NeedSatisfactionRecord[];
  
  // Political characteristics
  ideology: CityIdeology;
  approvalRating: number;
  
  // Economic data
  costOfLiving: number;
  averageWage: number;
  unemployment: number;
  
  // Infrastructure
  connectedTransport: TransportConnection[];
  availableServices: Service[];
}

// Industry and Economic Systems
export interface OperatingCosts {
  labor: number;
  materials: number;
  energy: number;
  maintenance: number;
  total: number;
}

export interface Subsidy {
  id: string;
  type: string;
  amount: number;
  duration: number;
  conditions: string[];
}

export interface Tax {
  id: string;
  type: string;
  rate: number;
  baseAmount: number;
}

export interface Industry {
  id: string;
  type: IndustryType;
  position: Vector3;
  ownershipModel: OwnershipModel;
  
  // Economic data
  profitability: number;
  productionCapacity: number;
  currentProduction: number;
  operatingCosts: OperatingCosts;
  
  // Lifecycle
  constructionStatus: ConstructionStatus;
  operationalStatus: OperationalStatus;
  ageInDays: number;
  
  // Transport connections
  inputConnections: TransportConnection[];
  outputConnections: TransportConnection[];
  
  // Policy effects
  appliedSubsidies: Subsidy[];
  appliedTaxes: Tax[];
}

export interface IndustryApplication {
  id: string;
  industryType: IndustryType;
  proposedLocation: Vector3;
  estimatedProfitability: number;
  requiredInvestment: number;
  expectedEmployment: number;
  
  // Approval workflow
  status: ApplicationStatus;
  bookmarked: boolean;
  daysRemaining: number;
  
  // Need satisfaction
  addressedNeeds: CityNeed[];
  affectedCities: City[];
}

// Transport and Logistics
export interface Station {
  id: string;
  name: string;
  position: Vector3;
  capacity: number;
  cargoTypes: CargoType[];
  connectedRoutes: string[];
}

export interface Cargo {
  id: string;
  type: CargoType;
  quantity: number;
  origin: string;
  destination: string;
  value: number;
}

export interface RouteSubsidy {
  id: string;
  amount: number;
  conditions: string[];
}

export interface Route {
  id: string;
  origin: Station;
  destination: Station;
  waypoints: Vector3[];
  cargoTypes: CargoType[];
  
  // Performance metrics
  averageDeliveryTime: number;
  throughput: number;
  profitability: number;
  
  // Policy effects
  subsidies: RouteSubsidy[];
  safetyLevel: SafetyLevel;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  currentRoute: Route;
  position: Vector3;
  
  // Status
  cargo: Cargo[];
  capacity: number;
  age: number;
  maintenanceCost: number;
  reliability: number;
  
  // Breakdown system
  breakdownProbability: number;
  isUnderRepair: boolean;
  repairTimeRemaining: number;
}

// Policy and Political Systems
export interface IdeologyScore {
  progressiveWeight: number;
  conservativeWeight: number;
  calculatedAt: Date;
  technologyContext: string[];
}

export interface ApprovalEffect {
  cityId: string;
  change: number;
  reason: string;
}

export interface EconomicModifier {
  type: string;
  value: number;
  duration: number;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  
  // Implementation
  prerequisites: Policy[];
  implementationDuration: number;
  implementationCost: number;
  
  // Political effects
  ideologyScore: IdeologyScore;
  approvalEffects: ApprovalEffect[];
  
  // Economic effects
  economicModifiers: EconomicModifier[];
  
  // Status
  status: PolicyStatus;
  queuePosition: number;
}