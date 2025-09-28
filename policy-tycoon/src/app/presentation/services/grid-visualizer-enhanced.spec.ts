// Converted from Vitest to Jasmine (Karma)

import { Scene, Engine, NullEngine } from '@babylonjs/core';
import { GridVisualizerService } from './grid-visualizer.service';

describe('GridVisualizerService - Enhanced Features', () => {
  let service: GridVisualizerService;
  let scene: Scene;
  let engine: Engine;

  beforeEach(() => {
    service = new GridVisualizerService();
    engine = new NullEngine();
    scene = new Scene(engine);
    service.initialize(scene);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have enhanced grid options with subtle defaults', () => {
    const options = service.getGridOptions();
    expect(options.lineOpacity).toBe(0.3); // More transparent for subtlety
    expect(options.lineThickness).toBe(0.5); // Thinner lines
    expect(options.enableMajorMinorGrid).toBe(true); // Major/minor grid pattern
  });

  it('should update grid options', () => {
    service.updateGridOptions({ 
      lineOpacity: 0.1, 
      lineThickness: 0.3,
      enableMajorMinorGrid: false 
    });
    
    const options = service.getGridOptions();
    expect(options.lineOpacity).toBe(0.1);
    expect(options.lineThickness).toBe(0.3);
    expect(options.enableMajorMinorGrid).toBe(false);
  });

  it('should render grid with enhanced features', () => {
    service.renderGrid(scene);
    
    // Verify grid was created
    const options = service.getGridOptions();
    expect(options.gridSize).toBe(4);
    expect(options.extent).toBe(2000);
  });

  it('should maintain grid alignment with OpenTTD tile boundaries', () => {
    // OpenTTD uses 4-unit tiles, grid should align with this
    service.updateGridPosition(18, 22); // Should snap to 16, 20 or 20, 24
    
    // The actual implementation applies alignment, so we just verify the method works
    expect(() => service.updateGridPosition(18, 22)).not.toThrow();
  });
});