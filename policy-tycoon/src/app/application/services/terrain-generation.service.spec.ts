import { TestBed } from '@angular/core/testing';
import { TerrainGenerationService } from './terrain-generation.service';
import { of } from 'rxjs';

describe('TerrainGenerationService', () => {
  let service: TerrainGenerationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TerrainGenerationService]
    });
    service = TestBed.inject(TerrainGenerationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return an Observable from generateWorld', () => {
    // Mock the internal async method to resolve immediately
    spyOn(service as any, 'generateWorldAsync').and.returnValue(Promise.resolve());
    
    const config = {
      renderDistance: 2,
      waterLevel: 3,
      steepness: 2,
      continuity: 5
    };
    
    const result = service.generateWorld(config);
    expect(result).toBeTruthy();
    expect(typeof result.subscribe).toBe('function');
  });

  it('should complete the Observable when generation is successful', (done: () => void) => {
    // Mock the internal async method to resolve immediately
    spyOn(service as any, 'generateWorldAsync').and.returnValue(Promise.resolve());
    
    const config = {
      renderDistance: 2,
      waterLevel: 3,
      steepness: 2,
      continuity: 5
    };
    
    const result = service.generateWorld(config);
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

  it('should error the Observable when generation fails', (done: () => void) => {
    // Mock the internal async method to reject
    spyOn(service as any, 'generateWorldAsync').and.returnValue(Promise.reject(new Error('Generation failed')));
    
    const config = {
      renderDistance: 2,
      waterLevel: 3,
      steepness: 2,
      continuity: 5
    };
    
    const result = service.generateWorld(config);
    result.subscribe({
      complete: () => {
        fail('Observable should not complete');
        done();
      },
      error: (error) => {
        expect(error).toBeTruthy();
        done();
      }
    });
  });
});