import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeManagerService } from '../../../application/services/time-manager.service';
import { TimeSpeed } from '../../../application/state/game-state';

@Component({
  selector: 'app-time-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="time-controls">
      <div class="control-group">
        <button 
          class="control-btn"
          [class.active]="!timeManager.isRunning()"
          (click)="timeManager.stop()">
          Stop
        </button>
        
        <button 
          class="control-btn"
          [class.active]="timeManager.isPaused()"
          (click)="timeManager.togglePause()">
          {{ timeManager.isPaused() ? 'Resume' : 'Pause' }}
        </button>
      </div>
      
      <div class="speed-controls">
        <button
          *ngFor="let speed of availableSpeeds"
          class="speed-btn"
          [class.active]="timeManager.timeSpeed() === speed.value"
          [disabled]="!timeManager.isRunning() || timeManager.isPaused()"
          (click)="setSpeed(speed.value)">
          {{ speed.label }}
        </button>
      </div>
      
      <div class="game-info">
        <span>Game Time: {{ formatGameTime(timeManager.gameTime()) }}</span>
        <span>Status: {{ getGameStatus() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .time-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .control-group {
      display: flex;
      gap: 8px;
    }
    
    .speed-controls {
      display: flex;
      gap: 4px;
    }
    
    .control-btn, .speed-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .control-btn:hover, .speed-btn:hover {
      background: #e9e9e9;
    }
    
    .control-btn.active, .speed-btn.active {
      background: #007acc;
      color: white;
      border-color: #007acc;
    }
    
    .speed-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .game-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 14px;
      color: #666;
    }
  `]
})
export class TimeControlsComponent {
  availableSpeeds: { label: string; value: TimeSpeed }[] = [];

  constructor(public timeManager: TimeManagerService) {
    this.availableSpeeds = this.timeManager.getAvailableSpeeds().filter(s => s.value !== TimeSpeed.PAUSED);
  }

  setSpeed(speed: TimeSpeed) {
    this.timeManager.setSpeed(speed);
  }

  formatGameTime(gameTime: number): string {
    const seconds = Math.floor(gameTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  getGameStatus(): string {
    if (!this.timeManager.isRunning()) {
      return 'Stopped';
    }
    if (this.timeManager.isPaused()) {
      return 'Paused';
    }
    return `Running (×${this.timeManager.timeSpeed()})`;
  }
}