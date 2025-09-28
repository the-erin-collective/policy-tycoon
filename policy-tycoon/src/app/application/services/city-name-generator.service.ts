import { Injectable } from '@angular/core';
import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, DynamicTexture } from '@babylonjs/core';
import { 
  CityNameGenerator, 
  CityNameDatabase, 
  CityNameLabel, 
  SeededRandom 
} from '../../data/models/city-generation';

/**
 * Service for generating unique city names and managing 3D text labels
 * Implements the CityNameGenerator interface for OpenTTD-style city generation
 */
@Injectable({
  providedIn: 'root'
})
export class CityNameGeneratorService implements CityNameGenerator, CityNameDatabase {
  private scene: Scene | null = null;
  private usedNames = new Set<string>();
  private nameLabels = new Map<string, CityNameLabel>();
  private labelCounter = 0;

  // Predefined list of city names inspired by OpenTTD and classic city names
  private readonly cityNames: string[] = [
    'Springfield', 'Riverside', 'Hilltown', 'Greenfield', 'Oakville',
    'Millbrook', 'Fairview', 'Westfield', 'Eastport', 'Northgate',
    'Southbridge', 'Lakeside', 'Woodland', 'Meadowbrook', 'Stonehaven',
    'Clearwater', 'Brookhaven', 'Maplewood', 'Pinehurst', 'Elmwood',
    'Ashford', 'Blackwater', 'Redwood', 'Goldfield', 'Silverdale',
    'Ironbridge', 'Copperhill', 'Steelport', 'Coaltown', 'Millfield',
    'Farmington', 'Grangeview', 'Cornfield', 'Wheatland', 'Barleytown',
    'Fishport', 'Saltwater', 'Deepwater', 'Tideland', 'Bayview',
    'Mountainview', 'Valleytown', 'Hillcrest', 'Ridgefield', 'Cliffside',
    'Forestdale', 'Timberland', 'Cedarville', 'Birchwood', 'Willowbrook',
    'Roseville', 'Thornfield', 'Ivytown', 'Ferndale', 'Heatherfield',
    'Sandford', 'Clayville', 'Rockport', 'Quarrytown', 'Gravel Hill',
    'Newtown', 'Oldbridge', 'Middleton', 'Crossroads', 'Junction City',
    'Riverside Junction', 'Mill Creek', 'Bear Creek', 'Deer Valley', 'Fox Hill',
    'Eagle Point', 'Hawk Ridge', 'Wolf Creek', 'Beaver Dam', 'Otter Falls',
    'Pleasant Valley', 'Happy Valley', 'Sunny Dale', 'Bright Waters', 'Fair Haven',
    'New Hope', 'Good Fortune', 'Prosperity', 'Victory', 'Liberty',
    'Independence', 'Freedom', 'Justice', 'Harmony', 'Unity',
    'Peaceful', 'Tranquil', 'Serene', 'Calm Waters', 'Still Lake',
    'Crystal Falls', 'Diamond Creek', 'Pearl Harbor', 'Ruby Ridge', 'Emerald City',
    'Sapphire Bay', 'Golden Gate', 'Silver Springs', 'Copper Canyon', 'Iron Mountain',
    'Steel Valley', 'Coal Creek', 'Oil Springs', 'Gas Town', 'Power City',
    'Electric Falls', 'Steam Valley', 'Gear Town', 'Clockwork', 'Mechanicsburg',
    'Industrial Park', 'Factory Town', 'Mill Valley', 'Workshop', 'Foundry',
    'Smithfield', 'Hammertown', 'Anvil Creek', 'Forge Valley', 'Bellows',
    'Kiln Creek', 'Furnace Hill', 'Smelter', 'Refinery', 'Distillery'
  ];

  /**
   * Initialize the service with a BabylonJS scene for 3D text rendering
   */
  initialize(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * Generate a unique city name that hasn't been used before
   * @param existingNames Set of names already in use across all cities
   * @param rng Seeded random number generator for deterministic selection
   * @returns A unique city name
   */
  generateUniqueName(existingNames: Set<string>, rng: SeededRandom): string {
    // Combine existing names with our internal tracking
    const allUsedNames = new Set([...existingNames, ...this.usedNames]);
    
    // Find available names
    const availableNames = this.cityNames.filter(name => !allUsedNames.has(name));
    
    if (availableNames.length === 0) {
      // If all predefined names are used, generate numbered variants
      let counter = 1;
      let baseName: string;
      let newName: string;
      
      do {
        baseName = rng.selectFromArray(this.cityNames);
        newName = `${baseName} ${counter}`;
        counter++;
      } while (allUsedNames.has(newName) && counter < 1000); // Safety limit
      
      this.markNameAsUsed(newName);
      return newName;
    }
    
    // Select random name from available options
    const selectedName = rng.selectFromArray(availableNames);
    this.markNameAsUsed(selectedName);
    return selectedName;
  }

  /**
   * Create a 3D text label for a city name positioned above the city center
   * @param cityName The name to display
   * @param centerX X coordinate of the city center
   * @param centerZ Z coordinate of the city center
   * @returns CityNameLabel object containing the 3D text mesh and metadata
   */
  createNameLabel(cityName: string, centerX: number, centerZ: number): CityNameLabel {
    if (!this.scene) {
      // If no scene is available, return a minimal label without 3D text
      return {
        id: `city_label_${++this.labelCounter}`,
        cityName,
        centerX,
        centerZ,
        visible: true
      };
    }

    const labelId = `city_label_${++this.labelCounter}`;
    
    try {
      // Create dynamic texture for the text
      const textureSize = 512;
      const dynamicTexture = new DynamicTexture(`cityNameTexture_${labelId}`, textureSize, this.scene);
      
      // Configure text appearance
      const fontSize = 48;
      const fontFamily = 'Arial';
      const textColor = '#FFFFFF';
      const backgroundColor = 'rgba(0, 0, 0, 0.7)';
      
      // Draw text on texture with background
      dynamicTexture.drawText(
        cityName,
        null, // x position (null = center)
        null, // y position (null = center)
        `bold ${fontSize}px ${fontFamily}`,
        textColor,
        backgroundColor,
        true, // invertY
        true  // update
      );

      // Create plane geometry for the text
      const textPlane = MeshBuilder.CreatePlane(`cityNamePlane_${labelId}`, {
        width: 8,
        height: 2
      }, this.scene);

      // Create material and apply texture
      const textMaterial = new StandardMaterial(`cityNameMaterial_${labelId}`, this.scene);
      textMaterial.diffuseTexture = dynamicTexture;
      textMaterial.emissiveColor = new Color3(0.3, 0.3, 0.3); // Slight glow
      textMaterial.disableLighting = true; // Make text always visible
      textMaterial.backFaceCulling = false; // Visible from both sides
      
      textPlane.material = textMaterial;

      // Position the label above the city center
      const labelHeight = 15; // Height above ground
      textPlane.position = new Vector3(centerX, labelHeight, centerZ);
      
      // Make the text always face the camera (billboard effect)
      textPlane.billboardMode = 7; // BILLBOARDMODE_ALL

      // Create label object
      const label: CityNameLabel = {
        id: labelId,
        cityName,
        centerX,
        centerZ,
        textMesh: textPlane,
        visible: true
      };

      // Store label for management
      this.nameLabels.set(labelId, label);

      return label;
    } catch (error) {
      console.warn('Failed to create 3D city name label, returning minimal label:', error);
      
      // Return a minimal label without 3D text if creation fails
      return {
        id: labelId,
        cityName,
        centerX,
        centerZ,
        visible: true
      };
    }
  }

  /**
   * Update the position of an existing city name label
   * @param label The label to update
   * @param centerX New X coordinate
   * @param centerZ New Z coordinate
   */
  updateNameLabelPosition(label: CityNameLabel, centerX: number, centerZ: number): void {
    if (!label.textMesh) {
      console.warn(`Cannot update position for label ${label.id}: no text mesh`);
      return;
    }

    const labelHeight = 15;
    label.textMesh.position = new Vector3(centerX, labelHeight, centerZ);
    label.centerX = centerX;
    label.centerZ = centerZ;
  }

  /**
   * Remove a city name label from the scene
   * @param label The label to remove
   */
  removeNameLabel(label: CityNameLabel): void {
    if (label.textMesh) {
      // Dispose of the mesh and its materials/textures
      if (label.textMesh.material) {
        const material = label.textMesh.material as StandardMaterial;
        if (material.diffuseTexture) {
          material.diffuseTexture.dispose();
        }
        material.dispose();
      }
      label.textMesh.dispose();
      label.textMesh = undefined;
    }

    // Remove from tracking
    this.nameLabels.delete(label.id);
    
    // Release the name for reuse
    this.releaseNameForReuse(label.cityName);
  }

  /**
   * Get all available city names
   * @returns Array of all predefined city names
   */
  getAvailableNames(): string[] {
    return [...this.cityNames];
  }

  /**
   * Mark a name as used to prevent duplicates
   * @param name The name to mark as used
   */
  markNameAsUsed(name: string): void {
    this.usedNames.add(name);
  }

  /**
   * Release a name for reuse (when a city is deleted)
   * @param name The name to release
   */
  releaseNameForReuse(name: string): void {
    this.usedNames.delete(name);
  }

  /**
   * Returns a map of all active city name labels
   * @returns Map of city ID to label information
   */
  getActiveLabels(): Map<string, CityNameLabel> {
    return new Map(this.nameLabels);
  }

  /**
   * Toggle visibility of all city name labels
   * @param visible Whether labels should be visible
   */
  setLabelsVisible(visible: boolean): void {
    this.nameLabels.forEach(label => {
      if (label.textMesh) {
        label.textMesh.setEnabled(visible);
        label.visible = visible;
      }
    });
  }

  /**
   * Get a specific label by its ID
   * @param labelId The ID of the label to retrieve
   * @returns The label if found, undefined otherwise
   */
  getLabelById(labelId: string): CityNameLabel | undefined {
    return this.nameLabels.get(labelId);
  }

  /**
   * Clear all name labels and reset used names
   * Useful for resetting the game state
   */
  clearAllLabels(): void {
    this.nameLabels.forEach(label => this.removeNameLabel(label));
    this.nameLabels.clear();
    this.usedNames.clear();
    this.labelCounter = 0;
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose(): void {
    this.clearAllLabels();
    this.scene = null;
  }
}