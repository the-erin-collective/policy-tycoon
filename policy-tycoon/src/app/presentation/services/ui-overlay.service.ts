import { Injectable } from '@angular/core';
import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control, Button, StackPanel } from '@babylonjs/gui';
import { TimeManagerService } from '../../application/services/time-manager.service';
import { TimeSpeed } from '../../application/state/game-state';

export interface OverlayConfig {
  fontSize: number;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderColor: string;
}

export interface GameInfoDisplay {
  population: number;
  approval: number;
  treasury: number;
  gameSpeed: string;
  isPaused: boolean;
}

export interface CityTooltipInfo {
  name: string;
  population: number;
  tier: string;
  needs: string[];
  approval: number;
}

@Injectable({
  providedIn: 'root'
})
export class UIOverlayService {
  private scene: Scene | null = null;
  private advancedTexture: AdvancedDynamicTexture | null = null;
  private hudPanel: StackPanel | null = null;
  private tooltipPanel: Rectangle | null = null;
  private timeControlsPanel: StackPanel | null = null;
  private currentTimeControlsPanel: StackPanel | null = null;
  private ministryPanel: StackPanel | null = null;
  private debugPanel: StackPanel | null = null;
  private isInitialized = false;
  private updateInterval: number | null = null;

  private config: OverlayConfig = {
    fontSize: 14,
    fontFamily: 'Arial',
    primaryColor: '#FFFFFF',
    secondaryColor: '#CCCCCC',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#444444'
  };

  constructor(private timeManager: TimeManagerService) {
    // Start the game when the service is initialized
    this.timeManager.start();
  }

  initialize(scene: Scene): void {
    this.scene = scene;
    
    // Create the advanced dynamic texture for UI overlay
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
    
    this.createHUD();
    this.createTooltipSystem();
    this.createTimeControls();
    this.createMinistryPanel();
    this.createDebugPanel();
    
    // Start periodic updates for time display
    this.startPeriodicUpdates();
    
    this.isInitialized = true;
  }

  private createHUD(): void {
    if (!this.advancedTexture) return;

    // Create main HUD panel positioned in top-left corner
    this.hudPanel = new StackPanel('hudPanel');
    this.hudPanel.isVertical = true;
    this.hudPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.hudPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.hudPanel.paddingTop = '15px';
    this.hudPanel.paddingLeft = '15px';
    this.hudPanel.spacing = 8;

    // Create HUD background with increased height to accommodate time controls
    const hudBackground = new Rectangle('hudBackground');
    hudBackground.background = this.config.backgroundColor;
    hudBackground.color = this.config.borderColor;
    hudBackground.thickness = 2;
    hudBackground.cornerRadius = 8;
    hudBackground.width = '280px'; // Width to accommodate all text and controls
    hudBackground.height = '240px'; // Increased height for game info + time + time controls + proper spacing
    hudBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    hudBackground.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    hudBackground.paddingTop = '15px';
    hudBackground.paddingLeft = '15px';

    this.advancedTexture.addControl(hudBackground);
    this.advancedTexture.addControl(this.hudPanel);

    // Add initial HUD elements
    this.updateGameInfo({
      population: 0,
      approval: 70,
      treasury: 1000000,
      gameSpeed: '×4',
      isPaused: false
    });
  }

  private createTimeControls(): void {
    // Time controls are now integrated into the HUD panel
    // This method is kept for compatibility but no longer creates separate controls
  }

  private createMinistryPanel(): void {
    if (!this.advancedTexture) return;

    // Create ministry panel as a single Rectangle container with background
    const ministryContainer = new Rectangle('ministryContainer');
    ministryContainer.background = this.config.backgroundColor;
    ministryContainer.color = this.config.borderColor;
    ministryContainer.thickness = 2;
    ministryContainer.cornerRadius = 8;
    ministryContainer.width = '200px';
    ministryContainer.height = '280px';
    ministryContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    ministryContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ministryContainer.paddingRight = '25px'; // Ensure proper spacing from right edge

    // Create ministry panel content as a StackPanel inside the container
    this.ministryPanel = new StackPanel('ministryPanel');
    this.ministryPanel.isVertical = true;
    this.ministryPanel.spacing = 12;
    this.ministryPanel.paddingTop = '8px';
    this.ministryPanel.paddingLeft = '8px';
    this.ministryPanel.paddingRight = '8px';
    this.ministryPanel.paddingBottom = '8px';
    this.ministryPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    // Add panel title
    const titleText = new TextBlock('ministryTitle', 'Ministries');
    titleText.color = this.config.primaryColor;
    titleText.fontSize = this.config.fontSize + 2;
    titleText.fontFamily = this.config.fontFamily;
    titleText.fontWeight = 'bold';
    titleText.height = '20px';
    titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.ministryPanel.addControl(titleText);

    // Add separator line
    const separator = new Rectangle('ministrySeparator');
    separator.height = '1px';
    separator.width = '130px';
    separator.background = this.config.borderColor;
    separator.thickness = 0;
    separator.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.ministryPanel.addControl(separator);

    // Define ministries with their actions
    const ministries = [
      { name: 'Transport', action: () => this.showNotification('Transport Ministry opened', 'info') },
      { name: 'Industry', action: () => this.showNotification('Industry Ministry opened', 'info') },
      { name: 'Finance', action: () => this.showNotification('Finance Ministry opened', 'info') },
      { name: 'Infrastructure', action: () => this.showNotification('Infrastructure Ministry opened', 'info') },
      { name: 'Environment', action: () => this.showNotification('Environment Ministry opened', 'info') }
    ];

    // Create ministry buttons
    ministries.forEach(ministry => {
      const button = Button.CreateSimpleButton(`${ministry.name}Button`, ministry.name);
      button.width = '130px';
      button.height = '35px';
      button.color = this.config.primaryColor;
      button.background = this.config.backgroundColor;
      button.cornerRadius = 4;
      button.thickness = 1;
      button.fontSize = this.config.fontSize;
      button.fontFamily = this.config.fontFamily;
      button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

      // Add hover effects
      button.onPointerEnterObservable.add(() => {
        button.background = '#666666';
      });

      button.onPointerOutObservable.add(() => {
        button.background = this.config.backgroundColor;
      });

      button.onPointerClickObservable.add(ministry.action);

      if (this.ministryPanel) {
        this.ministryPanel.addControl(button);
      }
    });

    // Add the panel to the container, then add container to the texture
    ministryContainer.addControl(this.ministryPanel);
    this.advancedTexture.addControl(ministryContainer);
  }

  private createDebugPanel(): void {
    if (!this.advancedTexture) return;

    // Create debug panel container
    const debugContainer = new Rectangle('debugContainer');
    debugContainer.background = this.config.backgroundColor;
    debugContainer.color = this.config.borderColor;
    debugContainer.thickness = 2;
    debugContainer.cornerRadius = 8;
    debugContainer.width = '180px';
    debugContainer.height = '120px';
    debugContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    debugContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    debugContainer.paddingLeft = '15px';
    debugContainer.paddingBottom = '15px';

    // Create debug panel content
    this.debugPanel = new StackPanel('debugPanel');
    this.debugPanel.isVertical = true;
    this.debugPanel.spacing = 8;
    this.debugPanel.paddingTop = '8px';
    this.debugPanel.paddingLeft = '8px';
    this.debugPanel.paddingRight = '8px';
    this.debugPanel.paddingBottom = '8px';
    this.debugPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    // Add panel title
    const titleText = new TextBlock('debugTitle', 'Debug Tools');
    titleText.color = this.config.primaryColor;
    titleText.fontSize = this.config.fontSize + 1;
    titleText.fontFamily = this.config.fontFamily;
    titleText.fontWeight = 'bold';
    titleText.height = '18px';
    titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.debugPanel.addControl(titleText);

    // Add separator line
    const separator = new Rectangle('debugSeparator');
    separator.height = '1px';
    separator.width = '120px';
    separator.background = this.config.borderColor;
    separator.thickness = 0;
    separator.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.debugPanel.addControl(separator);

    // Add grid toggle button
    const gridToggleButton = Button.CreateSimpleButton('gridToggleButton', 'Grid: ON');
    gridToggleButton.width = '120px';
    gridToggleButton.height = '30px';
    gridToggleButton.color = this.config.primaryColor;
    gridToggleButton.background = this.config.backgroundColor;
    gridToggleButton.cornerRadius = 4;
    gridToggleButton.thickness = 1;
    gridToggleButton.fontSize = this.config.fontSize - 1;
    gridToggleButton.fontFamily = this.config.fontFamily;
    gridToggleButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    // Add hover effects
    gridToggleButton.onPointerEnterObservable.add(() => {
      gridToggleButton.background = '#666666';
    });

    gridToggleButton.onPointerOutObservable.add(() => {
      gridToggleButton.background = this.config.backgroundColor;
    });

    // Store reference to grid toggle callback for external use
    this.gridToggleCallback = null;
    gridToggleButton.onPointerClickObservable.add(() => {
      if (this.gridToggleCallback) {
        const isVisible = this.gridToggleCallback();
        gridToggleButton.textBlock!.text = `Grid: ${isVisible ? 'ON' : 'OFF'}`;
        this.showNotification(`Grid ${isVisible ? 'enabled' : 'disabled'}`, 'info', 1500);
      }
    });

    this.debugPanel.addControl(gridToggleButton);

    // Add the panel to the container, then add container to the texture
    debugContainer.addControl(this.debugPanel);
    this.advancedTexture.addControl(debugContainer);
  }

  private gridToggleCallback: (() => boolean) | null = null;

  private addTimeControlButtons(): StackPanel {
    // Create time controls panel for integration into HUD
    const timeControlsPanel = new StackPanel('timeControlsPanel');
    timeControlsPanel.isVertical = false;
    timeControlsPanel.spacing = 8;
    timeControlsPanel.height = '40px';
    timeControlsPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const speeds = [
      { label: '⏸️', speed: TimeSpeed.PAUSED, tooltip: 'Pause' },
      { label: '▶️', speed: TimeSpeed.NORMAL, tooltip: 'Normal Speed' },
      { label: '⏩', speed: TimeSpeed.FAST, tooltip: 'Fast' },
      { label: '⏭️', speed: TimeSpeed.FASTER, tooltip: 'Faster' },
      { label: '⚡', speed: TimeSpeed.FASTEST, tooltip: 'Fastest' }
    ];

    speeds.forEach(speedConfig => {
      const button = Button.CreateSimpleButton(`speed_${speedConfig.speed}`, speedConfig.label);
      button.width = '35px';
      button.height = '35px';
      button.color = '#FFFFFF';
      button.background = speedConfig.speed === TimeSpeed.FASTER ? '#555555' : 'rgba(0, 0, 0, 0.6)'; // Highlight ×4 as default
      button.cornerRadius = 4;
      button.thickness = 1;
      button.fontSize = 16;
      button.fontFamily = 'Arial';

      // Add hover effects
      button.onPointerEnterObservable.add(() => {
        button.background = '#666666';
      });

      button.onPointerOutObservable.add(() => {
        const currentSpeed = this.timeManager.isPaused() ? TimeSpeed.PAUSED : this.timeManager.timeSpeed();
        const isActive = speedConfig.speed === currentSpeed;
        button.background = isActive ? '#555555' : 'rgba(0, 0, 0, 0.6)';
      });

      button.onPointerClickObservable.add(() => {
        this.onTimeSpeedChanged(speedConfig.speed);
        this.updateTimeControlHighlight();
      });

      timeControlsPanel.addControl(button);
    });

    return timeControlsPanel;
  }

  private onTimeSpeedChanged(speed: TimeSpeed): void {
    if (speed === TimeSpeed.PAUSED) {
      this.timeManager.pause();
      this.showNotification('Game Paused', 'info', 1500);
    } else {
      if (this.timeManager.isPaused()) {
        this.timeManager.resume();
      }
      this.timeManager.setSpeed(speed);
      this.showNotification(`Time speed: ×${speed}`, 'info', 1500);
    }
  }

  private updateTimeControlHighlight(): void {
    if (!this.currentTimeControlsPanel) return;

    // Get current speed from time manager
    const currentSpeed = this.timeManager.isPaused() ? TimeSpeed.PAUSED : this.timeManager.timeSpeed();

    // Update button backgrounds to highlight the active speed
    this.currentTimeControlsPanel.children.forEach((control, index) => {
      if (control instanceof Button) {
        const speeds = [TimeSpeed.PAUSED, TimeSpeed.NORMAL, TimeSpeed.FAST, TimeSpeed.FASTER, TimeSpeed.FASTEST];
        const isActive = speeds[index] === currentSpeed;
        control.background = isActive ? '#555555' : 'rgba(0, 0, 0, 0.6)';
        control.color = isActive ? '#FFFF00' : '#FFFFFF'; // Yellow text for active
      }
    });
  }

  updateGameInfo(info: GameInfoDisplay): void {
    if (!this.hudPanel || !this.isInitialized) return;

    // Clear existing HUD content
    this.hudPanel.clearControls();

    // Create a container for all info in vertical layout for better organization
    const infoContainer = new StackPanel('infoContainer');
    infoContainer.isVertical = true;
    infoContainer.spacing = 6;
    infoContainer.paddingLeft = '12px';
    infoContainer.paddingTop = '12px';
    infoContainer.paddingRight = '12px';
    infoContainer.paddingBottom = '12px';
    infoContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Create consolidated info lines with proper formatting
    const populationInfo = this.createInfoLine('Population:', info.population.toLocaleString());
    infoContainer.addControl(populationInfo);

    const approvalInfo = this.createInfoLine('Approval:', `${info.approval}%`);
    infoContainer.addControl(approvalInfo);

    // Treasury info
    const treasuryInfo = this.createInfoLine('Treasury:', `$${(info.treasury / 1000000).toFixed(1)}M`);
    infoContainer.addControl(treasuryInfo);

    // Format date using actual game time progression
    const formattedDate = this.formatGameDate(this.timeManager.gameTime());
    const dateInfo = this.createInfoLine('Date:', formattedDate);
    infoContainer.addControl(dateInfo);

    // Add time of day using actual game time from time manager
    const gameTime = this.formatGameTime(this.timeManager.gameTime());
    const timeInfo = this.createInfoLine('Time:', gameTime);
    infoContainer.addControl(timeInfo);

    this.hudPanel.addControl(infoContainer);

    // Add separator line
    const separator = new Rectangle('separator');
    separator.height = '1px';
    separator.width = '250px';
    separator.background = this.config.borderColor;
    separator.thickness = 0;
    separator.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    separator.paddingLeft = '12px';
    separator.paddingRight = '12px';
    separator.paddingTop = '4px';
    separator.paddingBottom = '4px';
    this.hudPanel.addControl(separator);

    // Add time controls to the HUD panel
    const timeControlsContainer = new StackPanel('timeControlsContainer');
    timeControlsContainer.isVertical = true;
    timeControlsContainer.spacing = 4;
    timeControlsContainer.paddingLeft = '12px';
    timeControlsContainer.paddingRight = '12px';
    timeControlsContainer.paddingBottom = '12px';
    timeControlsContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Add time controls label
    const timeControlsLabel = new TextBlock('timeControlsLabel', 'Time Controls:');
    timeControlsLabel.color = this.config.secondaryColor;
    timeControlsLabel.fontSize = this.config.fontSize;
    timeControlsLabel.fontFamily = this.config.fontFamily;
    timeControlsLabel.height = '18px';
    timeControlsLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    timeControlsContainer.addControl(timeControlsLabel);

    // Add time control buttons
    const timeControlButtons = this.addTimeControlButtons();
    this.currentTimeControlsPanel = timeControlButtons; // Store reference for highlighting
    timeControlsContainer.addControl(timeControlButtons);

    this.hudPanel.addControl(timeControlsContainer);
  }

  private createInfoPanel(label: string, value: string): StackPanel {
    const panel = new StackPanel(`${label}Panel`);
    panel.isVertical = true;
    panel.width = '90px';
    panel.spacing = 2;

    // Label
    const labelText = new TextBlock(`${label}Label`, label);
    labelText.color = this.config.secondaryColor;
    labelText.fontSize = this.config.fontSize - 2;
    labelText.fontFamily = this.config.fontFamily;
    labelText.height = '16px';
    labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    // Value
    const valueText = new TextBlock(`${label}Value`, value);
    valueText.color = this.config.primaryColor;
    valueText.fontSize = this.config.fontSize + 2;
    valueText.fontFamily = this.config.fontFamily;
    valueText.fontWeight = 'bold';
    valueText.height = '20px';
    valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    panel.addControl(labelText);
    panel.addControl(valueText);

    return panel;
  }

  private createInfoLine(label: string, value: string): StackPanel {
    const linePanel = new StackPanel(`${label}Line`);
    linePanel.isVertical = false;
    linePanel.height = '18px';
    linePanel.spacing = 8;
    linePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Label text
    const labelText = new TextBlock(`${label}Label`, label);
    labelText.color = this.config.secondaryColor;
    labelText.fontSize = this.config.fontSize;
    labelText.fontFamily = this.config.fontFamily;
    labelText.width = '80px';
    labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Value text
    const valueText = new TextBlock(`${label}Value`, value);
    valueText.color = this.config.primaryColor;
    valueText.fontSize = this.config.fontSize;
    valueText.fontFamily = this.config.fontFamily;
    valueText.fontWeight = 'bold';
    valueText.width = '160px';
    valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    valueText.textWrapping = true; // Enable text wrapping to prevent truncation

    linePanel.addControl(labelText);
    linePanel.addControl(valueText);

    return linePanel;
  }



  private formatGameTime(gameTimeMs: number): string {
    // Convert game time milliseconds to actual time progression
    // Game starts at January 1st, 1950, 00:01
    const gameStartDate = new Date(1950, 0, 1, 0, 1, 0); // January 1st, 1950, 00:01:00
    
    // Add the elapsed game time to the start date
    const currentGameDate = new Date(gameStartDate.getTime() + gameTimeMs);
    
    // Format as HH:MM AM/PM
    const hours = currentGameDate.getHours();
    const minutes = currentGameDate.getMinutes();
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  private formatGameDate(gameTimeMs: number): string {
    // Convert game time milliseconds to actual date progression
    // Game starts at January 1st, 1950
    const gameStartDate = new Date(1950, 0, 1, 0, 1, 0); // January 1st, 1950, 00:01:00
    
    // Add the elapsed game time to the start date
    const currentGameDate = new Date(gameStartDate.getTime() + gameTimeMs);
    
    // Format date
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[currentGameDate.getMonth()]} ${currentGameDate.getDate()}, ${currentGameDate.getFullYear()}`;
  }

  private startPeriodicUpdates(): void {
    // Update the display every second to keep time current
    this.updateInterval = window.setInterval(() => {
      if (this.isInitialized && this.hudPanel) {
        // Update time control highlights based on current state
        this.updateTimeControlHighlight();
        
        // Only update if the time has changed significantly (every game minute)
        const currentGameTime = this.timeManager.gameTime();
        const currentMinute = Math.floor(currentGameTime / (1000 * 60));
        if (!this.lastUpdateMinute || this.lastUpdateMinute !== currentMinute) {
          this.lastUpdateMinute = currentMinute;
          // Update both date and time displays
          this.refreshTimeDisplay();
        }
      }
    }, 1000);
  }

  private lastUpdateMinute: number | undefined;

  private refreshTimeDisplay(): void {
    if (!this.hudPanel) return;
    
    const currentGameTime = this.timeManager.gameTime();
    
    // Find and update both date and time display elements
    const infoContainer = this.hudPanel.children[0] as StackPanel;
    if (infoContainer && infoContainer.children.length > 4) {
      // Update date display (4th element, index 3)
      const dateLinePanel = infoContainer.children[3] as StackPanel;
      if (dateLinePanel && dateLinePanel.children.length > 1) {
        const dateValueText = dateLinePanel.children[1] as TextBlock;
        if (dateValueText) {
          dateValueText.text = this.formatGameDate(currentGameTime);
        }
      }
      
      // Update time display (5th element, index 4)
      const timeLinePanel = infoContainer.children[4] as StackPanel;
      if (timeLinePanel && timeLinePanel.children.length > 1) {
        const timeValueText = timeLinePanel.children[1] as TextBlock;
        if (timeValueText) {
          timeValueText.text = this.formatGameTime(currentGameTime);
        }
      }
    }
  }

  private createTooltipSystem(): void {
    if (!this.advancedTexture) return;

    // Create tooltip panel (initially hidden)
    this.tooltipPanel = new Rectangle('tooltipPanel');
    this.tooltipPanel.background = this.config.backgroundColor;
    this.tooltipPanel.color = this.config.borderColor;
    this.tooltipPanel.thickness = 1;
    this.tooltipPanel.cornerRadius = 4;
    this.tooltipPanel.width = '200px';
    this.tooltipPanel.height = '120px';
    this.tooltipPanel.isVisible = false;
    this.tooltipPanel.zIndex = 1000;

    this.advancedTexture.addControl(this.tooltipPanel);
  }

  showCityTooltip(info: CityTooltipInfo, screenX: number, screenY: number): void {
    if (!this.tooltipPanel || !this.advancedTexture) return;

    // Clear existing tooltip content
    this.tooltipPanel.clearControls();

    // Create tooltip content
    const tooltipStack = new StackPanel('tooltipStack');
    tooltipStack.isVertical = true;
    tooltipStack.spacing = 4;
    tooltipStack.paddingTop = '8px';
    tooltipStack.paddingLeft = '8px';
    tooltipStack.paddingRight = '8px';
    tooltipStack.paddingBottom = '8px';

    // City name
    const nameText = new TextBlock('cityName', info.name);
    nameText.color = this.config.primaryColor;
    nameText.fontSize = this.config.fontSize + 2;
    nameText.fontWeight = 'bold';
    nameText.height = '20px';
    nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // City tier and population
    const tierPopText = new TextBlock('tierPop', `${info.tier} • ${info.population.toLocaleString()}`);
    tierPopText.color = this.config.secondaryColor;
    tierPopText.fontSize = this.config.fontSize;
    tierPopText.height = '16px';
    tierPopText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Approval
    const approvalText = new TextBlock('approval', `Approval: ${info.approval}%`);
    approvalText.color = info.approval >= 50 ? '#4CAF50' : '#F44336';
    approvalText.fontSize = this.config.fontSize;
    approvalText.height = '16px';
    approvalText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Needs
    const needsText = new TextBlock('needs', `Needs: ${info.needs.join(', ') || 'All satisfied'}`);
    needsText.color = this.config.secondaryColor;
    needsText.fontSize = this.config.fontSize - 1;
    needsText.height = '32px';
    needsText.textWrapping = true;
    needsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    tooltipStack.addControl(nameText);
    tooltipStack.addControl(tierPopText);
    tooltipStack.addControl(approvalText);
    tooltipStack.addControl(needsText);

    this.tooltipPanel.addControl(tooltipStack);

    // Position tooltip
    this.positionTooltip(screenX, screenY);
    this.tooltipPanel.isVisible = true;
  }

  showIndustryTooltip(name: string, type: string, status: string, screenX: number, screenY: number): void {
    if (!this.tooltipPanel || !this.advancedTexture) return;

    // Clear existing tooltip content
    this.tooltipPanel.clearControls();

    // Create tooltip content
    const tooltipStack = new StackPanel('tooltipStack');
    tooltipStack.isVertical = true;
    tooltipStack.spacing = 4;
    tooltipStack.paddingTop = '8px';
    tooltipStack.paddingLeft = '8px';
    tooltipStack.paddingRight = '8px';
    tooltipStack.paddingBottom = '8px';

    // Industry name
    const nameText = new TextBlock('industryName', name);
    nameText.color = this.config.primaryColor;
    nameText.fontSize = this.config.fontSize + 2;
    nameText.fontWeight = 'bold';
    nameText.height = '20px';
    nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Industry type
    const typeText = new TextBlock('industryType', type);
    typeText.color = this.config.secondaryColor;
    typeText.fontSize = this.config.fontSize;
    typeText.height = '16px';
    typeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // Status
    const statusText = new TextBlock('industryStatus', `Status: ${status}`);
    statusText.color = status === 'Operating' ? '#4CAF50' : '#FF9800';
    statusText.fontSize = this.config.fontSize;
    statusText.height = '16px';
    statusText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    tooltipStack.addControl(nameText);
    tooltipStack.addControl(typeText);
    tooltipStack.addControl(statusText);

    this.tooltipPanel.addControl(tooltipStack);

    // Position tooltip
    this.positionTooltip(screenX, screenY);
    this.tooltipPanel.isVisible = true;
  }

  hideTooltip(): void {
    if (this.tooltipPanel) {
      this.tooltipPanel.isVisible = false;
    }
  }

  private positionTooltip(screenX: number, screenY: number): void {
    if (!this.tooltipPanel || !this.advancedTexture) return;

    // Convert screen coordinates to UI coordinates
    const canvas = this.scene?.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = ((screenX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const y = -((screenY - canvasRect.top) / canvasRect.height) * 2 + 1;

    // Position tooltip with offset to avoid cursor
    this.tooltipPanel.left = `${(x * 50) + 10}%`;
    this.tooltipPanel.top = `${(-y * 50) + 5}%`;

    // Ensure tooltip stays within screen bounds
    const tooltipWidth = 200;
    const tooltipHeight = 120;
    
    if (screenX + tooltipWidth > canvasRect.width) {
      this.tooltipPanel.left = `${(x * 50) - 25}%`;
    }
    
    if (screenY + tooltipHeight > canvasRect.height) {
      this.tooltipPanel.top = `${(-y * 50) - 15}%`;
    }
  }

  // Notification system
  showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info', duration: number = 3000): void {
    if (!this.advancedTexture) return;

    const notification = new Rectangle('notification');
    notification.width = '300px';
    notification.height = '60px';
    notification.cornerRadius = 8;
    notification.thickness = 2;
    notification.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    notification.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    notification.paddingTop = '80px';
    notification.paddingRight = '20px';

    // Set colors based on type
    switch (type) {
      case 'info':
        notification.background = 'rgba(33, 150, 243, 0.9)';
        notification.color = '#2196F3';
        break;
      case 'warning':
        notification.background = 'rgba(255, 152, 0, 0.9)';
        notification.color = '#FF9800';
        break;
      case 'error':
        notification.background = 'rgba(244, 67, 54, 0.9)';
        notification.color = '#F44336';
        break;
    }

    const messageText = new TextBlock('notificationText', message);
    messageText.color = '#FFFFFF';
    messageText.fontSize = this.config.fontSize;
    messageText.fontFamily = this.config.fontFamily;
    messageText.textWrapping = true;
    messageText.paddingLeft = '10px';
    messageText.paddingRight = '10px';

    notification.addControl(messageText);
    this.advancedTexture.addControl(notification);

    // Auto-remove notification after duration
    setTimeout(() => {
      if (this.advancedTexture) {
        this.advancedTexture.removeControl(notification);
      }
    }, duration);
  }

  // Grid control integration
  setGridToggleCallback(callback: () => boolean): void {
    this.gridToggleCallback = callback;
  }

  // Ministry UI integration points - legacy method kept for compatibility
  createMinistryButton(name: string, onClick: () => void): Button {
    const button = Button.CreateSimpleButton(`${name}Button`, name);
    button.width = '120px';
    button.height = '40px';
    button.color = this.config.primaryColor;
    button.background = this.config.backgroundColor;
    button.cornerRadius = 4;
    button.thickness = 1;
    button.fontSize = this.config.fontSize;
    button.fontFamily = this.config.fontFamily;

    button.onPointerClickObservable.add(onClick);

    return button;
  }

  // Performance and accessibility
  setAccessibilityMode(enabled: boolean): void {
    if (enabled) {
      // High contrast mode
      this.config.primaryColor = '#FFFFFF';
      this.config.secondaryColor = '#FFFF00';
      this.config.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      this.config.borderColor = '#FFFFFF';
    } else {
      // Normal mode
      this.config.primaryColor = '#FFFFFF';
      this.config.secondaryColor = '#CCCCCC';
      this.config.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.config.borderColor = '#444444';
    }
  }

  setFontSize(size: number): void {
    this.config.fontSize = Math.max(10, Math.min(24, size));
  }

  dispose(): void {
    // Clean up the update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.advancedTexture) {
      this.advancedTexture.dispose();
      this.advancedTexture = null;
    }

    this.hudPanel = null;
    this.tooltipPanel = null;
    this.timeControlsPanel = null;
    this.currentTimeControlsPanel = null;
    this.ministryPanel = null;
    this.debugPanel = null;
    this.gridToggleCallback = null;
    this.scene = null;
    this.isInitialized = false;
  }
}