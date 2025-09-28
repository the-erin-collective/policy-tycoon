import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameSceneComponent } from './presentation/components/game-scene/game-scene.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameSceneComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Policy Tycoon';
}
