import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceConfigService } from './performance-config.service';

describe('PerformanceConfigService', () => {
  let service: PerformanceConfigService;

  beforeEach(() => {
    service = new PerformanceConfigService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default settings', () => {
    const settings = service.getSettings();
    expect(settings.qualityLevel).toBe('high');
    expect(settings.enableLOD).toBe(true);
    expect(settings.maxTrees).toBe(5000);
    expect(settings.treeLODDistance).toBe(100);
  });

  it('should update settings', () => {
    service.updateSettings({ maxTrees: 10000, treeLODDistance: 150 });
    
    const settings = service.getSettings();
    expect(settings.maxTrees).toBe(10000);
    expect(settings.treeLODDistance).toBe(150);
  });

  it('should set quality level to low and adjust settings', () => {
    service.setQualityLevel('low');
    
    const settings = service.getSettings();
    expect(settings.qualityLevel).toBe('low');
    expect(settings.maxTrees).toBe(1000);
    expect(settings.maxWaterBodies).toBe(10);
    expect(settings.maxForests).toBe(20);
    expect(settings.treeLODDistance).toBe(50);
  });

  it('should set quality level to ultra and adjust settings', () => {
    service.setQualityLevel('ultra');
    
    const settings = service.getSettings();
    expect(settings.qualityLevel).toBe('ultra');
    expect(settings.maxTrees).toBe(10000);
    expect(settings.maxWaterBodies).toBe(100);
    expect(settings.maxForests).toBe(200);
    expect(settings.treeLODDistance).toBe(150);
  });
});