import { TestBed } from '@angular/core/testing';
import { ClassicCityGeneratorService } from './classic-city-generator.service';
import { RecursiveRoadBuilderService } from './recursive-road-builder.service';
import { BuildingPlacerService } from './building-placer.service';
import { CityNameGeneratorService } from './city-name-generator.service';
import { CityConfigurationService } from './city-configuration.service';
import { GenerationLoggerService } from './generation-logger.service';
import { TerrainGenerationService } from './terrain-generation.service';
import { SiteFinderService } from './site-finder.service';
import { of } from 'rxjs';

describe('ClassicCityGeneratorService Bounds', () => {
  let service: ClassicCityGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClassicCityGeneratorService,
        {
          provide: RecursiveRoadBuilderService,
          useValue: {
            buildInitialNetwork: jasmine.createSpy('buildInitialNetwork').and.returnValue({ segments: [] }),
            getMapBounds: jasmine.createSpy('getMapBounds').and.returnValue({ minX: -100, maxX: 100, minZ: -100, maxZ: 100 })
          }
        },
        {
          provide: BuildingPlacerService,
          useValue: {
            placeInitialBuildings: jasmine.createSpy('placeInitialBuildings').and.returnValue({ buildings: [], totalPopulation: 100 })
          }
        },
        {
          provide: CityNameGeneratorService,
          useValue: {
            generateUniqueName: jasmine.createSpy('generateUniqueName').and.returnValue('Test City'),
            createNameLabel: jasmine.createSpy('createNameLabel').and.returnValue({})
          }
        },
        {
          provide: CityConfigurationService,
          useValue: {
            generateTargetPopulation: jasmine.createSpy('generateTargetPopulation').and.returnValue(1000)
          }
        },
        {
          provide: GenerationLoggerService,
          useValue: {
            info: jasmine.createSpy('info'),
            warn: jasmine.createSpy('warn'),
            error: jasmine.createSpy('error')
          }
        },
        {
          provide: TerrainGenerationService,
          useValue: {
            generateWorld: jasmine.createSpy('generateWorld').and.returnValue(of(void 0))
          }
        },
        {
          provide: SiteFinderService,
          useValue: {
            findCityStartPoints: jasmine.createSpy('findCityStartPoints').and.returnValue([
              { x: 0, z: 0, areaSize: 50 },
              { x: 5, z: 5, areaSize: 40 }
            ])
          }
        }
      ]
    });
    service = TestBed.inject(ClassicCityGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should constrain city generation to rendered terrain bounds', () => {
    const siteFinderSpy = TestBed.inject(SiteFinderService) as any;
    
    // Call generateCities without explicit bounds
    service.generateCities(2, 25).subscribe(cities => {
      expect(cities.length).toBe(2);
      expect(siteFinderSpy.findCityStartPoints).toHaveBeenCalled();
      
      // Verify that the bounds passed to siteFinder are within rendered terrain
      const callArgs = siteFinderSpy.findCityStartPoints.calls.mostRecent().args;
      const bounds = callArgs[2]; // Third argument is the bounds
      
      // With our changes, the bounds should be constrained to rendered terrain
      // The rendered terrain is 24x24 units, so bounds should be within that range
      expect(bounds.minX).toBeGreaterThanOrEqual(-12);
      expect(bounds.maxX).toBeLessThanOrEqual(12);
      expect(bounds.minZ).toBeGreaterThanOrEqual(-12);
      expect(bounds.maxZ).toBeLessThanOrEqual(12);
    });
  });
});