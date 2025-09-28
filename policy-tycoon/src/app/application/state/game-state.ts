import { computed, signal } from '@angular/core';

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  timeSpeed: TimeSpeed;
  gameTime: number;
  lastUpdateTime: number;
}

export enum TimeSpeed {
  PAUSED = 0,
  NORMAL = 1,
  FAST = 2,
  FASTER = 4,
  FASTEST = 8,
  ULTRA = 16,
  MAXIMUM = 32
}

export const initialGameState: GameState = {
  isRunning: false,
  isPaused: true,
  timeSpeed: TimeSpeed.NORMAL,
  gameTime: 0,
  lastUpdateTime: Date.now()
};

// Core game state signals
export const gameState = signal<GameState>(initialGameState);

// Computed signals for derived state
export const isGameRunning = computed(() => gameState().isRunning);
export const isGamePaused = computed(() => gameState().isPaused);
export const currentTimeSpeed = computed(() => gameState().timeSpeed);
export const currentGameTime = computed(() => gameState().gameTime);

// State update functions
export function updateGameState(updates: Partial<GameState>) {
  gameState.update(state => ({ ...state, ...updates }));
}

export function pauseGame() {
  updateGameState({ isPaused: true });
}

export function resumeGame() {
  updateGameState({ isPaused: false, lastUpdateTime: Date.now() });
}

export function setTimeSpeed(speed: TimeSpeed) {
  updateGameState({ timeSpeed: speed });
}

export function startGame() {
  updateGameState({ 
    isRunning: true, 
    isPaused: false, 
    lastUpdateTime: Date.now() 
  });
}

export function stopGame() {
  updateGameState({ 
    isRunning: false, 
    isPaused: true 
  });
}