/**
 * Core game enums and constants
 */

export enum CityTier {
  Hamlet = 0,      // < 500
  SmallTown = 1,   // 500-1k
  GrowingTown = 2, // 1k-5k
  UrbanCentre = 3, // 5k-20k
  ExpandingCity = 4, // 20k-100k
  Metropolis = 5,  // 100k-500k
  AdvancedCity = 6 // 500k+
}

export enum OwnershipModel {
  StateOwned = 'state-owned',
  Mixed = 'mixed',
  Private = 'private'
}

export enum PolicyStatus {
  Available = 'available',
  Queued = 'queued',
  Implementing = 'implementing',
  Active = 'active',
  Repealed = 'repealed'
}

export enum NeedType {
  Wood = 'wood',
  Fuel = 'fuel',
  Electricity = 'electricity',
  Food = 'food',
  Construction = 'construction',
  ConsumerGoods = 'consumer-goods',
  Safety = 'safety',
  CleanAir = 'clean-air',
  Culture = 'culture'
}

export enum IndustryType {
  Logging = 'logging',
  Mining = 'mining',
  OilRefinery = 'oil-refinery',
  PowerPlant = 'power-plant',
  Farm = 'farm',
  Factory = 'factory',
  Hospital = 'hospital',
  School = 'school',
  University = 'university'
}

export enum VehicleType {
  Truck = 'truck',
  Train = 'train',
  Ship = 'ship',
  Plane = 'plane'
}

export enum CargoType {
  Wood = 'wood',
  Coal = 'coal',
  Oil = 'oil',
  Steel = 'steel',
  Food = 'food',
  Goods = 'goods',
  Passengers = 'passengers'
}

export enum ApplicationStatus {
  Pending = 'pending',
  Bookmarked = 'bookmarked',
  Approved = 'approved',
  Denied = 'denied',
  Expired = 'expired'
}

export enum ConstructionStatus {
  Planning = 'planning',
  UnderConstruction = 'under-construction',
  AwaitingMaterials = 'awaiting-materials',
  Complete = 'complete'
}

export enum OperationalStatus {
  Dormant = 'dormant',
  Operating = 'operating',
  Maintenance = 'maintenance',
  Closed = 'closed'
}

export enum SafetyLevel {
  Minimal = 'minimal',
  Standard = 'standard',
  High = 'high',
  Maximum = 'maximum'
}

export enum TimeSpeed {
  Paused = 0,
  Normal = 1,
  Fast = 2,
  Faster = 4,
  Fastest = 8
}

export enum GameSubsystem {
  Economic = 'economic',
  Transport = 'transport',
  Political = 'political',
  Environmental = 'environmental',
  UI = 'ui'
}

export enum ValidationSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}