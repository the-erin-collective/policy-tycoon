// Converted from Vitest to Jasmine (Karma)
import { PerformanceConfigService } from '../../application/services/performance-config.service';
import { PerformanceMonitorService } from '../../application/services/performance-monitor.service';
import { GridVisualizerService } from './grid-visualizer.service';

describe('Complete Integration Verification - Key Features', () => {
  it('should verify all major components are integrated', () => {
    // Test performance services
    const performanceConfig = new PerformanceConfigService();
    const performanceMonitor = new PerformanceMonitorService();
    
    expect(performanceConfig).toBeTruthy();
    expect(performanceMonitor).toBeTruthy();
    
    // Test enhanced grid visualization
    const gridVisualizer = new GridVisualizerService();
    const gridOptions = gridVisualizer.getGridOptions();
    
    expect(gridOptions.lineOpacity).toBe(0.3); // Subtle transparency
    expect(gridOptions.lineThickness).toBe(0.5); // Thin lines
    expect(gridOptions.enableMajorMinorGrid).toBe(true); // Major/minor pattern
    
    console.log('All major components verified successfully');
  });

  it('should demonstrate configuration options work correctly', () => {
    const performanceConfig = new PerformanceConfigService();
    
    // Test quality level settings
    performanceConfig.setQualityLevel('low');
    let settings = performanceConfig.getSettings();
    expect(settings.maxTrees).toBe(1000);
    
    performanceConfig.setQualityLevel('ultra');
    settings = performanceConfig.getSettings();
    expect(settings.maxTrees).toBe(10000);
    
    // Test custom settings
    performanceConfig.updateSettings({ maxForests: 50 });
    settings = performanceConfig.getSettings();
    expect(settings.maxForests).toBe(50);
    
    console.log('Configuration options verified successfully');
  });

  it('should verify grid visualization enhancements', () => {
    const gridVisualizer = new GridVisualizerService();
    const initialOptions = gridVisualizer.getGridOptions();
    
    // Test default enhanced options
    expect(initialOptions.lineOpacity).toBe(0.3);
    expect(initialOptions.lineThickness).toBe(0.5);
    expect(initialOptions.enableMajorMinorGrid).toBe(true);
    
    // Test updating options
    gridVisualizer.updateGridOptions({ 
      lineOpacity: 0.1, 
      lineThickness: 0.2 
    });
    
    const updatedOptions = gridVisualizer.getGridOptions();
    expect(updatedOptions.lineOpacity).toBe(0.1);
    expect(updatedOptions.lineThickness).toBe(0.2);
    
    console.log('Grid visualization enhancements verified successfully');
  });
});
