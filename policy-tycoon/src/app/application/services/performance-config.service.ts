import { Injectable } from '@angular/core';

export interface PerformanceSettings {
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
  enableLOD: boolean;
  maxTrees: number;
  maxWaterBodies: number;
  maxForests: number;
  treeLODDistance: number;
  forestLODDistance: number;
  waterLODDistance: number;
  needIconLODDistance: number;
  detailLODDistance: number;
  enableOcclusionCulling: boolean;
  enableFrustumCulling: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceConfigService {
  private settings: PerformanceSettings = {
    qualityLevel: 'high',
    enableLOD: true,
    maxTrees: 5000,
    maxWaterBodies: 50,
    maxForests: 100,
    treeLODDistance: 100,
    forestLODDistance: 150,
    waterLODDistance: 200,
    needIconLODDistance: 50,
    detailLODDistance: 30,
    enableOcclusionCulling: true,
    enableFrustumCulling: true
  };

  getSettings(): PerformanceSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<PerformanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  setQualityLevel(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.settings.qualityLevel = level;
    
    // Adjust settings based on quality level
    switch (level) {
      case 'low':
        this.settings.maxTrees = 1000;
        this.settings.maxWaterBodies = 10;
        this.settings.maxForests = 20;
        this.settings.treeLODDistance = 50;
        this.settings.forestLODDistance = 75;
        this.settings.waterLODDistance = 100;
        break;
      case 'medium':
        this.settings.maxTrees = 2500;
        this.settings.maxWaterBodies = 25;
        this.settings.maxForests = 50;
        this.settings.treeLODDistance = 75;
        this.settings.forestLODDistance = 100;
        this.settings.waterLODDistance = 150;
        break;
      case 'high':
        this.settings.maxTrees = 5000;
        this.settings.maxWaterBodies = 50;
        this.settings.maxForests = 100;
        this.settings.treeLODDistance = 100;
        this.settings.forestLODDistance = 150;
        this.settings.waterLODDistance = 200;
        break;
      case 'ultra':
        this.settings.maxTrees = 10000;
        this.settings.maxWaterBodies = 100;
        this.settings.maxForests = 200;
        this.settings.treeLODDistance = 150;
        this.settings.forestLODDistance = 200;
        this.settings.waterLODDistance = 300;
        break;
    }
  }
}