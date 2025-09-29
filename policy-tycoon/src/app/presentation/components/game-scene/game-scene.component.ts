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
import { CitySize } from '../../../data/models/city-generation';

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
    this.babylonEngineService.createScene(this.renderCanvas.nativeElement).then((scene) => {
        this.terrainGenerationService.initialize(scene);
        // Generate a city at the center of the terrain with medium size
        this.cityGenerator.generateCity(0, 0, CitySize.Medium, new Set<string>());
    });
  }

  ngOnDestroy(): void {
    this.babylonEngineService.getScene()?.dispose();
  }
}
