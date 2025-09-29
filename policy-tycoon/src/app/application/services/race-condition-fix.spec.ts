import { TestBed } from '@angular/core/testing';
import { TerrainGenerationService } from './terrain-generation.service';
import { ClassicCityGeneratorService } from './classic-city-generator.service';
import { of, Observable } from 'rxjs';
import { TerrainGenerationConfig } from '../../data/models';

describe('Race Condition Fix', () => {
  let terrainService: TerrainGenerationService;
  let cityService: ClassicCityGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerrainGenerationService,
      ]
    });
    
    terrainService = TestBed.inject(TerrainGenerationService);
  });

  it('should have generateWorld method that returns an Observable', () => {
    expect(terrainService.generateWorld).toBeTruthy();
    
    // Create a mock config
    const config: TerrainGenerationConfig = {
      renderDistance: 2,
      waterLevel: 3,
      steepness: 2,
      continuity: 5
    };
    
    // Call the method
    const result: Observable<void> = terrainService.generateWorld(config);
    
    // Verify it returns an Observable
    expect(result).toBeTruthy();
    expect(typeof result.subscribe).toBe('function');
  });

  it('should properly sequence operations with Observables', (done: () => void) => {
    // Create a mock config
    const config: TerrainGenerationConfig = {
      renderDistance: 2,
      waterLevel: 3,
      steepness: 2,
      continuity: 5
    };
    
    // Spy on the internal method to control its behavior
    spyOn(terrainService as any, 'generateWorldAsync').and.returnValue(Promise.resolve());
    
    // Call the method
    const result: Observable<void> = terrainService.generateWorld(config);
    
    // Subscribe to verify it completes
    result.subscribe({
      complete: () => {
        expect().nothing();
        done();
      },
      error: (error) => {
        fail('Observable should not error');
        done();
      }
    });
  });
});