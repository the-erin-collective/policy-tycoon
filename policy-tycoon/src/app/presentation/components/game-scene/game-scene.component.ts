import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BabylonEngineService } from '../../services/babylon-engine.service';
import { ClassicCityGeneratorService } from '../../../application/services/classic-city-generator.service';
import { TerrainGenerationService } from '../../../application/services/terrain-generation.service';
import { TerrainGenerationConfig } from '../../../data/models/terrain-models';

@Component({
  selector: 'app-game-scene',
  standalone: true,
  template: '<canvas #renderCanvas style="width: 100%; height: 100%;"></canvas>',
})
export class GameSceneComponent implements OnInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  private renderCanvas!: ElementRef<HTMLCanvasElement>;

  private babylonEngineService = inject(BabylonEngineService);
  private cityGenerator = inject(ClassicCityGeneratorService);
  private terrainGenerationService = inject(TerrainGenerationService);

  ngOnInit(): void {
    this.babylonEngineService.createScene(this.renderCanvas.nativeElement).then(async (scene) => {
        this.terrainGenerationService.initialize(scene);
        
        // Generate terrain first
        const config: TerrainGenerationConfig = {
          waterLevel: 0,
          steepness: 1,
          continuity: 3,
          renderDistance: 10
        };
        
        await this.terrainGenerationService.generateWorld(config);
        
        // Generate cities using the site finder to find valid locations
        this.cityGenerator.generateCities(1);
    });
  }

  ngOnDestroy(): void {
    this.babylonEngineService.getScene()?.dispose();
  }
}