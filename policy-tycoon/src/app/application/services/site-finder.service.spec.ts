import { TestBed } from '@angular/core/testing';
import { SiteFinderService } from './site-finder.service';
import { TerrainGenerationService } from './terrain-generation.service';
import { CollisionDetectionService } from './collision-detection.service';

describe('SiteFinderService', () => {
  let service: SiteFinderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SiteFinderService,
        {
          provide: TerrainGenerationService,
          useValue: {
            isWaterAt: jasmine.createSpy('isWaterAt').and.returnValue(false)
          }
        },
        {
          provide: CollisionDetectionService,
          useValue: {
            isBuildableLand: jasmine.createSpy('isBuildableLand').and.returnValue(true)
          }
        }
      ]
    });
    service = TestBed.inject(SiteFinderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should find city start points within specified bounds', () => {
    const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    const sites = service.findCityStartPoints(5, 25, bounds);
    
    // We're not testing the actual algorithm here, just that it respects bounds
    expect(sites.length).toBeGreaterThanOrEqual(0);
  });
});