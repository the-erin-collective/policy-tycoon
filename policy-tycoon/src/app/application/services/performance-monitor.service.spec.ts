import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitorService } from './performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    service = new PerformanceMonitorService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial metrics', () => {
    const metrics = service.getMetrics();
    expect(metrics.fps).toBe(0);
    expect(metrics.frameTime).toBe(0);
    expect(metrics.meshCount).toBe(0);
    expect(metrics.memoryUsage).toBe(0);
  });

  it('should update mesh count', () => {
    service.updateMeshCount(100);
    
    const metrics = service.getMetrics();
    expect(metrics.meshCount).toBe(100);
  });

  it('should update memory usage', () => {
    service.updateMemoryUsage(50);
    
    const metrics = service.getMetrics();
    expect(metrics.memoryUsage).toBe(50);
  });

  it('should provide performance ratings', () => {
    // Mock metrics for testing
    (service as any).metrics.fps = 60;
    expect(service.getPerformanceRating()).toBe('excellent');
    
    (service as any).metrics.fps = 50;
    expect(service.getPerformanceRating()).toBe('good');
    
    (service as any).metrics.fps = 35;
    expect(service.getPerformanceRating()).toBe('acceptable');
    
    (service as any).metrics.fps = 20;
    expect(service.getPerformanceRating()).toBe('poor');
  });
});