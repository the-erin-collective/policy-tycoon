/**
 * Seeded random number generator for deterministic generation
 * Uses a Linear Congruential Generator (LCG) algorithm for predictable results
 */
export class SeededRandom {
  public seed: number;
  private current: number;

  // LCG parameters (same as used in many standard libraries)
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = Math.pow(2, 32);

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.current = seed;
  }

  /**
   * Get the original seed value
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Reset the generator to its initial seed state
   */
  reset(): void {
    this.current = this.seed;
  }

  /**
   * Generate next random number in sequence (0 to 1)
   */
  next(): number {
    this.current = (this.a * this.current + this.c) % this.m;
    return this.current / this.m;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Min must be less than max');
    }
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random integer between min (inclusive) and max (inclusive)
   */
  nextIntInclusive(min: number, max: number): number {
    if (min > max) {
      throw new Error('Min must be less than or equal to max');
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between 0 and 1
   */
  nextFloat(): number {
    return this.next();
  }

  /**
   * Generate random float between min (inclusive) and max (exclusive)
   */
  nextFloatRange(min: number, max: number): number {
    if (min >= max) {
      throw new Error('Min must be less than max');
    }
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean with optional probability
   */
  nextBoolean(probability: number = 0.5): boolean {
    if (probability < 0 || probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    return this.next() < probability;
  }

  /**
   * Select random element from array
   */
  selectFromArray<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot select from empty array');
    }
    const index = this.nextInt(0, array.length);
    return array[index];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Select multiple random elements from array without replacement
   */
  selectMultipleFromArray<T>(array: T[], count: number): T[] {
    if (count < 0) {
      throw new Error('Count must be non-negative');
    }
    if (count > array.length) {
      throw new Error('Count cannot exceed array length');
    }
    if (count === 0) {
      return [];
    }
    
    const shuffled = this.shuffleArray(array);
    return shuffled.slice(0, count);
  }

  /**
   * Set a new seed value and reset the generator
   */
  setSeed(seed: number): void {
    this.seed = seed;
    this.current = seed;
  }
}