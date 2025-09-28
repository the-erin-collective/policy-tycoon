import { Injectable } from '@angular/core';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  meshCount: number;
  memoryUsage: number;
  lastUpdate: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    meshCount: 0,
    memoryUsage: 0,
    lastUpdate: 0
  };
  
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsUpdateInterval = 1000; // Update FPS every second

  startMonitoring(): void {
    // Start performance monitoring loop
    this.monitorPerformance();
  }

  private monitorPerformance(): void {
    const currentTime = performance.now();
    this.frameCount++;
    
    // Update FPS metrics at intervals
    if (currentTime - this.lastTime >= this.fpsUpdateInterval) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.metrics.frameTime = Math.round((currentTime - this.lastTime) / this.frameCount);
      this.frameCount = 0;
      this.lastTime = currentTime;
      this.metrics.lastUpdate = Date.now();
    }
    
    // Continue monitoring
    requestAnimationFrame(() => this.monitorPerformance());
  }

  updateMeshCount(count: number): void {
    this.metrics.meshCount = count;
  }

  updateMemoryUsage(usage: number): void {
    this.metrics.memoryUsage = usage;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get performance rating based on FPS
  getPerformanceRating(): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (this.metrics.fps >= 55) return 'excellent';
    if (this.metrics.fps >= 45) return 'good';
    if (this.metrics.fps >= 30) return 'acceptable';
    return 'poor';
  }
}