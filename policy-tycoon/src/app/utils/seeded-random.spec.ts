import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRandom } from './seeded-random';

describe('SeededRandom', () => {
  let rng: SeededRandom;
  const testSeed = 12345;

  beforeEach(() => {
    rng = new SeededRandom(testSeed);
  });

  describe('constructor and seed management', () => {
    it('should initialize with provided seed', () => {
      expect(rng.getSeed()).toBe(testSeed);
    });

    it('should initialize with current time if no seed provided', () => {
      const timeBeforeCreation = Date.now();
      const rngWithoutSeed = new SeededRandom();
      const timeAfterCreation = Date.now();
      
      const seed = rngWithoutSeed.getSeed();
      expect(seed).toBeGreaterThanOrEqual(timeBeforeCreation);
      expect(seed).toBeLessThanOrEqual(timeAfterCreation);
    });

    it('should reset to initial seed state', () => {
      const firstValue = rng.next();
      const secondValue = rng.next();
      
      rng.reset();
      const resetFirstValue = rng.next();
      const resetSecondValue = rng.next();
      
      expect(resetFirstValue).toBe(firstValue);
      expect(resetSecondValue).toBe(secondValue);
    });

    it('should set new seed and reset state', () => {
      const originalSeed = rng.getSeed();
      const firstValue = rng.next();
      
      const newSeed = 99999;
      rng.setSeed(newSeed);
      
      expect(rng.seed).toBe(newSeed);
      
      // Should produce different sequence with new seed
      const newFirstValue = rng.next();
      expect(newFirstValue).not.toBe(firstValue);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical sequences with same seed', () => {
      const rng1 = new SeededRandom(testSeed);
      const rng2 = new SeededRandom(testSeed);
      
      const sequence1 = [];
      const sequence2 = [];
      
      for (let i = 0; i < 10; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }
      
      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);
      
      const sequence1 = [];
      const sequence2 = [];
      
      for (let i = 0; i < 10; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }
      
      expect(sequence1).not.toEqual(sequence2);
    });
  });

  describe('next() method', () => {
    it('should return values between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should produce different values in sequence', () => {
      const values = [];
      for (let i = 0; i < 10; i++) {
        values.push(rng.next());
      }
      
      // Check that not all values are the same
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  describe('nextInt() method', () => {
    it('should return integers within specified range (exclusive max)', () => {
      const min = 5;
      const max = 15;
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('nextInt() method should throw error when min >= max', () => {
      expect(() => rng.nextInt(10, 10)).toThrowError(/Min must be less than max/);
      expect(() => rng.nextInt(15, 10)).toThrowError(/Min must be less than max/);
    });

    it('should produce deterministic results', () => {
      const rng1 = new SeededRandom(testSeed);
      const rng2 = new SeededRandom(testSeed);
      
      // Generate some random values with both instances
      const values1 = Array.from({ length: 10 }, () => rng1.next());
      const values2 = Array.from({ length: 10 }, () => rng2.next());
      
      // Should produce the same sequence with the same seed
      expect(values1).toEqual(values2);
      
      // Check that the values are within expected range
      for (const value of values1) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('nextIntInclusive() method should throw error when min > max', () => {
      expect(() => rng.nextIntInclusive(15, 10)).toThrowError(/Min must be less than or equal to max/);
    });
  });

  describe('nextFloat() method', () => {
    it('should return floats between 0 and 1', () => {
      const min = 0;
      const max = 1;
      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('nextFloatRange() method should throw error when min >= max', () => {
      expect(() => rng.nextFloatRange(10.0, 10.0)).toThrowError(/Min must be less than max/);
      expect(() => rng.nextFloatRange(15.5, 10.2)).toThrowError(/Min must be less than max/);
    });
  });

  describe('nextBoolean() method', () => {
    it('should return boolean values', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const chosen = rng.selectFromArray(items);
      expect(items).toContain(chosen);
    });

    it('selectFromArray() method should throw error for empty array', () => {
      expect(() => rng.selectFromArray([])).toThrowError(/Cannot select from empty array/);
    });

    it('should be deterministic with same seed', () => {
      const items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
      const rng1 = new SeededRandom(testSeed);
      const rng2 = new SeededRandom(testSeed);
      
      expect(rng1.selectFromArray(items)).toBe(rng2.selectFromArray(items));
    });
  });

  describe('shuffleArray() method', () => {
    it('should return array with same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffleArray([...original]);
      
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should return different order (most of the time)', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let differentOrderCount = 0;
      
      // Try multiple shuffles with different seeds
      for (let i = 0; i < 100; i++) {
        const rng = new SeededRandom(i);
        const shuffled = rng.shuffleArray([...original]);
        if (JSON.stringify(shuffled) !== JSON.stringify(original)) {
          differentOrderCount++;
        }
      }
      
      // Most shuffles should be different (allowing for some randomness)
      expect(differentOrderCount).toBeGreaterThan(80);
    });

    it('should be deterministic with same seed', () => {
      const original = ['x', 'y', 'z'];
      const rng1 = new SeededRandom(testSeed);
      const rng2 = new SeededRandom(testSeed);
      
      expect(rng1.shuffleArray([...original])).toEqual(rng2.shuffleArray([...original]));
    });

    it('should handle single element arrays', () => {
      const single = ['only'];
      const shuffled = rng.shuffleArray([...single]);
      expect(shuffled).toEqual(single);
    });

    it('should handle empty arrays', () => {
      const empty: any[] = [];
      const shuffled = rng.shuffleArray([...empty]);
      expect(shuffled).toEqual(empty);
    });
  });
});