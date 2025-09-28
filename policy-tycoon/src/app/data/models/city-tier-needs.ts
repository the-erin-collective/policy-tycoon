/**
 * City tier needs mapping and growth requirements
 */

import { CityTier, NeedType } from './enums';

export interface CityTierNeeds {
  tier: CityTier;
  populationRange: {
    min: number;
    max: number;
  };
  requiredNeeds: NeedType[];
  newNeedsUnlocked: NeedType[];
  promotionRequirements: {
    daysWithNeedsMet: number;
    minimumSatisfactionLevel: number;
  };
  demotionTriggers: {
    daysWithNeedsUnmet: number;
    populationExodusRate: number;
  };
}

export const CityGrowthNeeds: CityTierNeeds[] = [
  {
    tier: CityTier.Hamlet,
    populationRange: { min: 0, max: 499 },
    requiredNeeds: [],
    newNeedsUnlocked: [],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  },
  {
    tier: CityTier.SmallTown,
    populationRange: { min: 500, max: 999 },
    requiredNeeds: [],
    newNeedsUnlocked: [NeedType.Wood],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  },
  {
    tier: CityTier.GrowingTown,
    populationRange: { min: 1000, max: 4999 },
    requiredNeeds: [NeedType.Wood],
    newNeedsUnlocked: [NeedType.Fuel],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  },
  {
    tier: CityTier.UrbanCentre,
    populationRange: { min: 5000, max: 19999 },
    requiredNeeds: [NeedType.Wood, NeedType.Fuel],
    newNeedsUnlocked: [NeedType.Electricity],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  },
  {
    tier: CityTier.ExpandingCity,
    populationRange: { min: 20000, max: 99999 },
    requiredNeeds: [NeedType.Wood, NeedType.Fuel, NeedType.Electricity],
    newNeedsUnlocked: [NeedType.Food, NeedType.Construction],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  },
  {
    tier: CityTier.Metropolis,
    populationRange: { min: 100000, max: 499999 },
    requiredNeeds: [NeedType.Wood, NeedType.Fuel, NeedType.Electricity, NeedType.Food, NeedType.Construction],
    newNeedsUnlocked: [NeedType.ConsumerGoods, NeedType.Safety],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  },
  {
    tier: CityTier.AdvancedCity,
    populationRange: { min: 500000, max: Number.MAX_SAFE_INTEGER },
    requiredNeeds: [
      NeedType.Wood, 
      NeedType.Fuel, 
      NeedType.Electricity, 
      NeedType.Food, 
      NeedType.Construction,
      NeedType.ConsumerGoods, 
      NeedType.Safety
    ],
    newNeedsUnlocked: [NeedType.CleanAir, NeedType.Culture],
    promotionRequirements: {
      daysWithNeedsMet: 90,
      minimumSatisfactionLevel: 80
    },
    demotionTriggers: {
      daysWithNeedsUnmet: 90,
      populationExodusRate: 0.1
    }
  }
];

/**
 * Utility functions for city tier management
 */
export class CityTierManager {
  /**
   * Get tier requirements for a specific city tier
   */
  static getTierRequirements(tier: CityTier): CityTierNeeds | undefined {
    return CityGrowthNeeds.find(req => req.tier === tier);
  }

  /**
   * Get the appropriate tier for a given population
   */
  static getTierForPopulation(population: number): CityTier {
    for (const tierReq of CityGrowthNeeds) {
      if (population >= tierReq.populationRange.min && population <= tierReq.populationRange.max) {
        return tierReq.tier;
      }
    }
    return CityTier.Hamlet;
  }

  /**
   * Get all needs that should be available for a city at a specific tier
   */
  static getAllAvailableNeeds(tier: CityTier): NeedType[] {
    const allNeeds: NeedType[] = [];
    
    for (const tierReq of CityGrowthNeeds) {
      if (tierReq.tier <= tier) {
        allNeeds.push(...tierReq.newNeedsUnlocked);
      }
    }
    
    return [...new Set(allNeeds)]; // Remove duplicates
  }

  /**
   * Check if a city can be promoted to the next tier
   */
  static canPromote(city: any, daysWithNeedsMet: number): boolean {
    const currentTierReq = this.getTierRequirements(city.tier);
    if (!currentTierReq) return false;

    const nextTier = city.tier + 1;
    const nextTierReq = this.getTierRequirements(nextTier);
    if (!nextTierReq) return false; // Already at max tier

    // Check if population is in range for next tier
    if (city.population < nextTierReq.populationRange.min) return false;

    // Check if needs have been met for required duration
    return daysWithNeedsMet >= currentTierReq.promotionRequirements.daysWithNeedsMet;
  }

  /**
   * Check if a city should be demoted due to unmet needs
   */
  static shouldDemote(city: any, daysWithNeedsUnmet: number): boolean {
    const currentTierReq = this.getTierRequirements(city.tier);
    if (!currentTierReq) return false;

    return daysWithNeedsUnmet >= currentTierReq.demotionTriggers.daysWithNeedsUnmet;
  }

  /**
   * Calculate population exodus rate for a city with unmet needs
   */
  static getPopulationExodusRate(tier: CityTier): number {
    const tierReq = this.getTierRequirements(tier);
    return tierReq?.demotionTriggers.populationExodusRate || 0.1;
  }
}