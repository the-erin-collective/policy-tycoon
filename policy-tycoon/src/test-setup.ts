/**
 * Test setup for zoneless Angular application
 * This file configures the testing environment for zoneless mode with signals
 */

// Import Angular compiler to enable JIT compilation for tests
import '@angular/compiler';

// Import Vitest globals explicitly
import { 
  describe as vitestDescribe, 
  it as vitestIt, 
  test as vitestTest,
  beforeEach as vitestBeforeEach, 
  afterEach as vitestAfterEach, 
  expect as vitestExpect 
} from 'vitest';

// Configure global test environment
(globalThis as any).ngDevMode = true;

// Expose Vitest functions globally to mimic Jasmine API
(globalThis as any).describe = vitestDescribe;
(globalThis as any).it = vitestIt;
(globalThis as any).test = vitestTest;
(globalThis as any).beforeEach = vitestBeforeEach;
(globalThis as any).afterEach = vitestAfterEach;
(globalThis as any).expect = vitestExpect;

// Simple test configuration for zoneless mode
// We don't need Zone.js or complex Angular testing setup
// since we're testing services directly

console.log('✅ Test environment configured for zoneless mode with signals');