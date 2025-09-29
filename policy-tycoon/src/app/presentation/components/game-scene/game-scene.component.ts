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
import { MapRendererService } from '../../services/map-renderer.service';
import { City, CityTier } from '../../../data/models/core-entities';
import { Vector3 } from '@babylonjs/core';

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
  private mapRenderer = inject(MapRendererService);

  ngOnInit(): void {
    this.babylonEngineService.createScene(this.renderCanvas.nativeElement).then(async (scene) => {
        this.terrainGenerationService.initialize(scene);
        this.mapRenderer.initialize(scene);
        
        // Generate terrain first
        const config: TerrainGenerationConfig = {
          waterLevel: 0,
          steepness: 1,
          continuity: 3,
          renderDistance: 10
        };
        
        await this.terrainGenerationService.generateWorld(config);
        
        // Generate cities using the site finder to find valid locations
        const cities = await this.cityGenerator.generateCities(1);
        
        // Render each generated city
        cities.forEach((generatedCity, index) => {
          // Create a City entity from the GeneratedCity
          const city: City = {
            id: generatedCity.id,
            name: generatedCity.name,
            position: new Vector3(generatedCity.centerX, this.terrainGenerationService.getHeightAtCoordinates(generatedCity.centerX, generatedCity.centerZ), generatedCity.centerZ),
            population: generatedCity.population,
            tier: this.getCityTierFromPopulation(generatedCity.population), // Set tier based on population
            currentNeeds: [],
            unmetNeeds: [],
            needSatisfactionHistory: [],
            ideology: {
              progressive: 50,
              conservative: 50,
              driftRate: 0,
              lastUpdated: new Date()
            },
            approvalRating: 50,
            costOfLiving: 100,
            averageWage: 50000,
            unemployment: 5,
            connectedTransport: [],
            availableServices: []
          };
          
          // Render the city
          this.mapRenderer.renderCity(city);
        });
    });
  }

  ngOnDestroy(): void {
    this.babylonEngineService.getScene()?.dispose();
  }

  private getCityTierFromPopulation(population: number): CityTier {
    if (population < 500) return CityTier.Hamlet;
    if (population < 1000) return CityTier.SmallTown;
    if (population < 5000) return CityTier.GrowingTown;
    if (population < 20000) return CityTier.UrbanCentre;
    if (population < 100000) return CityTier.ExpandingCity;
    if (population < 500000) return CityTier.Metropolis;
    return CityTier.AdvancedCity;
  }
}