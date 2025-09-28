import { Injectable, signal, computed, effect } from '@angular/core';
import { 
  gameState, 
  TimeSpeed, 
  pauseGame, 
  resumeGame, 
  setTimeSpeed, 
  startGame, 
  stopGame, 
  updateGameState,
  isGameRunning,
  isGamePaused,
  currentTimeSpeed
} from '../state/game-state';

@Injectable({
  providedIn: 'root'
})
export class TimeManagerService {
  private animationFrameId: number | null = null;
  
  // Expose computed signals
  readonly isRunning = isGameRunning;
  readonly isPaused = isGamePaused;
  readonly timeSpeed = currentTimeSpeed;
  readonly gameTime = computed(() => gameState().gameTime);

  constructor() {
    // Start the game loop when the service is created
    this.startGameLoop();
    // Auto-start the game
    this.start();
  }

  private startGameLoop() {
    const gameLoop = () => {
      const state = gameState();
      
      if (state.isRunning && !state.isPaused) {
        const now = Date.now();
        const deltaTime = now - state.lastUpdateTime;
        const scaledDelta = deltaTime * state.timeSpeed;
        
        updateGameState({
          gameTime: state.gameTime + scaledDelta,
          lastUpdateTime: now
        });
      }
      
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
  }

  start() {
    startGame();
  }

  stop() {
    stopGame();
  }

  pause() {
    pauseGame();
  }

  resume() {
    resumeGame();
  }

  setSpeed(speed: TimeSpeed) {
    setTimeSpeed(speed);
    
    // Update last update time to prevent time jumps
    updateGameState({ lastUpdateTime: Date.now() });
  }

  togglePause() {
    const state = gameState();
    if (state.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  getAvailableSpeeds(): { label: string; value: TimeSpeed }[] {
    return [
      { label: 'Paused', value: TimeSpeed.PAUSED },
      { label: '×1', value: TimeSpeed.NORMAL },
      { label: '×2', value: TimeSpeed.FAST },
      { label: '×4', value: TimeSpeed.FASTER },
      { label: '×8', value: TimeSpeed.FASTEST },
      { label: '×16', value: TimeSpeed.ULTRA },
      { label: '×32', value: TimeSpeed.MAXIMUM }
    ];
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}