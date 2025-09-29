import { Injectable, WritableSignal, signal, Inject, Optional } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { TileType, type TerrainGenerationConfig, type World, type WFGridCell } from '../../data/models';

@Injectable({
  providedIn: 'root',
})
export class TerrainGenerationService {
  private scene!: BABYLON.Scene;
  private world: World = {};
  private tileMaterials: { [key: string]: BABYLON.StandardMaterial } = {};
  private isGenerating = false;
  private logger: any = null;

  constructor(@Optional() @Inject('Logger') logger?: any) {
    this.logger = logger || null;
  }

  // Constants
  private readonly CHUNK_SIZE = 8;
  private readonly MAX_HEIGHT = 20;
  private readonly TILE_TYPES = [
    { name: "water", color: new BABYLON.Color3(0.2, 0.4, 0.8) },
    { name: "sand", color: new BABYLON.Color3(0.9, 0.8, 0.6) },
    { name: "grass", color: new BABYLON.Color3(0.3, 0.7, 0.3) },
    { name: "hill", color: new BABYLON.Color3(0.5, 0.6, 0.3) },
    { name: "mountain", color: new BABYLON.Color3(0.6, 0.6, 0.6) },
    { name: "peak", color: new BABYLON.Color3(0.9, 0.9, 0.9) }
  ];

  // Game state signals
  public generationProgress: WritableSignal<number> = signal(0);
  public isGeneratingSignal: WritableSignal<boolean> = signal(false);


  public initialize(scene: BABYLON.Scene): void {
    this.scene = scene;
    this.createSharedMaterials();
  }

  private createSharedMaterials(): void {
    this.TILE_TYPES.forEach(type => {
        const mat = new BABYLON.StandardMaterial(`mat_${type.name}`, this.scene);
        mat.diffuseColor = type.color;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.freeze();
        this.tileMaterials[type.name] = mat;
    });

    const trunkMat = new BABYLON.StandardMaterial("mTrunkShared", this.scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.15);
    trunkMat.freeze();
    this.tileMaterials["trunk"] = trunkMat;

    const leafMat = new BABYLON.StandardMaterial("mLeafShared", this.scene);
    leafMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.2);
    leafMat.freeze();
    this.tileMaterials["leaf"] = leafMat;
  }

  // Method to generate terrain grid (for compatibility with existing code)
  public generateTerrainGrid(config: any, rng: any): any {
    // This is a simplified implementation to match the mock
    return {
      grid: [],
      waterGrid: [],
      heightMap: []
    };
  }

  // Method to generate terrain chunks (for compatibility with existing code)
  public generateTerrainChunks(config: any, rng: any): any[] {
    // This is a simplified implementation to match the mock
    return [];
  }

  // Method to render terrain with instancing from chunks (for compatibility with existing code)
  public renderTerrainWithInstancingFromChunks(chunks: any[], config: any, scene: any): any[] {
    // This is a simplified implementation to match the mock
    return [];
  }

  // Method to render water (for compatibility with existing code)
  public renderWater(config: any, scene: any): any {
    // This is a simplified implementation to match the mock
    return null;
  }

  public async generateWorld(config: TerrainGenerationConfig): Promise<void> {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.isGeneratingSignal.set(true);

    console.log("Generating world...");
    Object.values(this.world).forEach(chunk => {
        if (chunk.terrain) chunk.terrain.dispose();
        if (chunk.mergedTrunks) chunk.mergedTrunks.dispose();
        if (chunk.mergedLeaves) chunk.mergedLeaves.dispose();
    });
    this.world = {};

    const waterMesh = this.scene.getMeshByName("water");
    if(waterMesh) waterMesh.dispose();
    
    const renderDistance = config.renderDistance || 2;
    const worldDimensionInChunks = renderDistance * 2 - 1;
    const worldPixelSize = this.CHUNK_SIZE * worldDimensionInChunks;

    const waterPlane = BABYLON.MeshBuilder.CreateGround("water", { width: worldPixelSize + 4, height: worldPixelSize + 4 }, this.scene);
    const verticalScale = 0.5;
    waterPlane.position.x = this.CHUNK_SIZE / 2;
    waterPlane.position.z = this.CHUNK_SIZE / 2;
    waterPlane.position.y = config.waterLevel * verticalScale + 0.05;
    const waterMat = new BABYLON.StandardMaterial("waterMat", this.scene);
    waterMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
    waterMat.alpha = 0.75;
    waterMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    waterMat.freeze(); 
    waterPlane.material = waterMat;

    const chunkCoords = [];
    let x = 0, z = 0, dx = 0, dz = 1; 
    let sideLength = 1, steps = 0, turnCount = 0;
    const totalChunks = Math.pow(renderDistance * 2 - 1, 2);
    chunkCoords.push({ cx: x, cz: z });
    for (let i = 1; i < totalChunks; i++) {
         if (steps >= sideLength) {
            steps = 0;
            [dx, dz] = [-dz, dx];
            turnCount++;
            if (turnCount === 2) {
                turnCount = 0;
                sideLength++;
            }
        }
        x += dx;
        z += dz;
        chunkCoords.push({ cx: x, cz: z });
        steps++;
    }

    let chunksGenerated = 0;
    for (const coord of chunkCoords) {
        const wfcGrid = this.generateWFCForChunk(coord.cx, coord.cz, config);
        this.world[`${coord.cx},${coord.cz}`] = { grid: wfcGrid };
    }

    for (const coord of chunkCoords) {
        this.buildChunkMeshes(coord.cx, coord.cz);
        chunksGenerated++;
        this.generationProgress.set(chunksGenerated / totalChunks);
        await new Promise(res => setTimeout(res, 10)); 
    }
    
    this.isGenerating = false;
    this.isGeneratingSignal.set(false);
  }

  private buildChunkMeshes(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`;
    const chunk = this.world[chunkKey];
    if (!chunk || !chunk.grid) return;

    const wfcGrid = chunk.grid;
    const verticalScale = 0.5;

    const terrainMeshes = [];
    const worldOffsetX = chunkX * this.CHUNK_SIZE;
    const worldOffsetZ = chunkZ * this.CHUNK_SIZE;

    for (let z = 0; z < this.CHUNK_SIZE; z++) for (let x = 0; x < this.CHUNK_SIZE; x++) {
        const height = wfcGrid[z][x].height;
        if (height !== null && height > 0) {
            const scaledHeight = height * verticalScale;
            const box = BABYLON.MeshBuilder.CreateBox(``, { width: 1.0, height: scaledHeight, depth: 1.0 }, this.scene);
            box.position.set(worldOffsetX + x + 0.5, scaledHeight/2, worldOffsetZ + z + 0.5);
            if (wfcGrid[z][x].tileType) {
                box.material = this.tileMaterials[wfcGrid[z][x].tileType!.name];
            }
            terrainMeshes.push(box);
        }
    }
    
    for (let z = 0; z < this.CHUNK_SIZE; z++) for (let x = 0; x < this.CHUNK_SIZE; x++) {
        const currentHeight = wfcGrid[z][x].height;
        const neighbors = [{ dx: 1, dz: 0, rot: Math.PI / 2 }, { dx: -1, dz: 0, rot: -Math.PI / 2 }, { dx: 0, dz: 1, rot: 0 }, { dx: 0, dz: -1, rot: Math.PI }];
        neighbors.forEach(n => {
            const nx = x + n.dx, nz = z + n.dz;
            let neighborHeight: number | null = -1;
            if (nx >= 0 && nx < this.CHUNK_SIZE && nz >= 0 && nz < this.CHUNK_SIZE) {
                const nh = wfcGrid[nz][nx].height;
                if (nh !== null) neighborHeight = nh;
            } else { 
                let ncX = chunkX, ncZ = chunkZ;
                if (nx < 0) ncX--; else if (nx >= this.CHUNK_SIZE) ncX++;
                if (nz < 0) ncZ--; else if (nz >= this.CHUNK_SIZE) ncZ++;
                const neighborChunkKey = `${ncX},${ncZ}`;
                if (this.world[neighborChunkKey] && this.world[neighborChunkKey].grid) {
                    const nh = this.world[neighborChunkKey].grid![(nz + this.CHUNK_SIZE) % this.CHUNK_SIZE][(nx + this.CHUNK_SIZE) % this.CHUNK_SIZE].height;
                    if (nh !== null) neighborHeight = nh;
                }
            }
            if (neighborHeight !== -1 && currentHeight !== null && currentHeight > neighborHeight) {
                const wedge = this.createWedge(``, {frontHeight: 1.0 * verticalScale, frontWidth: 1, backWidth: 0.6, depth: 0.25});
                wedge.rotation.y = n.rot;
                wedge.position.set( worldOffsetX + x + 0.5 + n.dx * 0.625, neighborHeight * verticalScale, worldOffsetZ + z + 0.5 + n.dz * 0.625);
                if (wfcGrid[z][x].tileType) {
                    wedge.material = this.tileMaterials[wfcGrid[z][x].tileType!.name];
                }
                terrainMeshes.push(wedge);
            }
        });
    }
    
     for (let z = 0; z < this.CHUNK_SIZE - 1; z++) for (let x = 0; x < this.CHUNK_SIZE - 1; x++) {
        const h_bl = wfcGrid[z][x].height, h_br = wfcGrid[z][x+1].height, h_tl = wfcGrid[z+1][x].height, h_tr = wfcGrid[z+1][x+1].height;
        const placePlug = (px: number, pz: number, ph: number | null, colorName: string) => {
            if (ph === null) return;
            const plug = this.createPlug(``, {size: 0.25, height: 1.0 * verticalScale});
            plug.position.set(worldOffsetX + px + 1, ph * verticalScale, worldOffsetZ + pz + 1);
            plug.material = this.tileMaterials[colorName];
            terrainMeshes.push(plug);
        };
        if (h_bl !== null && h_br !== null && h_tl !== null && h_tr !== null) {
            if (h_bl > h_br && h_tl > h_tr && h_bl === h_tl && h_br === h_tr && wfcGrid[z][x].tileType) placePlug(x, z, h_br, wfcGrid[z][x].tileType!.name);
            if (h_br > h_bl && h_tr > h_tl && h_br === h_tr && h_bl === h_tl && wfcGrid[z][x+1].tileType) placePlug(x, z, h_bl, wfcGrid[z][x+1].tileType!.name);
            if (h_tl > h_bl && h_tr > h_br && h_tl === h_tr && h_bl === h_br && wfcGrid[z+1][x].tileType) placePlug(x, z, h_bl, wfcGrid[z+1][x].tileType!.name);
            if (h_bl > h_tl && h_br > h_tr && h_bl === h_br && h_tl === h_tr && wfcGrid[z][x].tileType) placePlug(x, z, h_tl, wfcGrid[z][x].tileType!.name);
        }
    }

    let terrain: BABYLON.Mesh | null = null;
    if (terrainMeshes.length > 0) {
        terrain = BABYLON.Mesh.MergeMeshes(terrainMeshes, true, true, undefined, false, true);
        if (terrain) {
            terrain.name = `terrain_${chunkKey}`;
            terrain.convertToFlatShadedMesh();
            terrain.freezeWorldMatrix();
        }
    }
    chunk.terrain = terrain as BABYLON.Mesh | undefined;
    this.generateTreesForChunk(chunkKey, verticalScale);
  }
  
  private generateWFCForChunk(chunkX: number, chunkZ: number, config: TerrainGenerationConfig): any[][] {
      const { steepness, waterLevel, continuity } = config;
      const grid = Array.from({ length: this.CHUNK_SIZE }, () => Array.from({ length: this.CHUNK_SIZE }, () => ({ possibleHeights: Array.from({ length: this.MAX_HEIGHT + 1 }, (_, i) => i), collapsed: false, height: null })));

      const neighbors = [
          { key: `${chunkX - 1},${chunkZ}`, type: 'left' }, { key: `${chunkX + 1},${chunkZ}`, type: 'right' },
          { key: `${chunkX},${chunkZ - 1}`, type: 'bottom' }, { key: `${chunkX},${chunkZ + 1}`, type: 'top' }
      ];

      neighbors.forEach(n => {
          const neighborChunk = this.world[n.key];
          if (!neighborChunk) return; 
          if (neighborChunk.grid) {
              for(let i = 0; i < this.CHUNK_SIZE; i++) {
                  let neighborHeight: number | undefined = undefined;
                  switch (n.type) {
                      case 'left': 
                          if (neighborChunk.grid[i][this.CHUNK_SIZE - 1].height !== null) {
                              neighborHeight = neighborChunk.grid[i][this.CHUNK_SIZE - 1].height as number;
                              if (neighborHeight !== undefined) {
                                  grid[i][0].possibleHeights = grid[i][0].possibleHeights.filter(h => Math.abs(h - neighborHeight!) <= steepness); 
                              }
                          }
                          break;
                      case 'right': 
                          if (neighborChunk.grid[i][0].height !== null) {
                              neighborHeight = neighborChunk.grid[i][0].height as number;
                              if (neighborHeight !== undefined) {
                                  grid[i][this.CHUNK_SIZE - 1].possibleHeights = grid[i][this.CHUNK_SIZE - 1].possibleHeights.filter(h => Math.abs(h - neighborHeight!) <= steepness); 
                              }
                          }
                          break;
                      case 'bottom': 
                          if (neighborChunk.grid[this.CHUNK_SIZE - 1][i].height !== null) {
                              neighborHeight = neighborChunk.grid[this.CHUNK_SIZE - 1][i].height as number;
                              if (neighborHeight !== undefined) {
                                  grid[0][i].possibleHeights = grid[0][i].possibleHeights.filter(h => Math.abs(h - neighborHeight!) <= steepness); 
                              }
                          }
                          break;
                      case 'top': 
                          if (neighborChunk.grid[0][i].height !== null) {
                              neighborHeight = neighborChunk.grid[0][i].height as number;
                              if (neighborHeight !== undefined) {
                                  grid[this.CHUNK_SIZE - 1][i].possibleHeights = grid[this.CHUNK_SIZE - 1][i].possibleHeights.filter(h => Math.abs(h - neighborHeight!) <= steepness); 
                              }
                          }
                          break;
                  }
              }
          }
      });
      
      for (let i = 0; i < this.CHUNK_SIZE * this.CHUNK_SIZE; i++) {
          let minEntropy = Infinity;
          let candidates: {x: number, z: number}[] = [];
          let bestCandidates: {x: number, z: number}[] = [];

          if (i === 0 && chunkX === 0 && chunkZ === 0) {
              bestCandidates.push({ x: Math.floor(this.CHUNK_SIZE / 2), z: Math.floor(this.CHUNK_SIZE / 2) });
          } else {
               for (let z = 0; z < this.CHUNK_SIZE; z++) for (let x = 0; x < this.CHUNK_SIZE; x++) {
                  if (!grid[z][x].collapsed) {
                      const entropy = grid[z][x].possibleHeights.length;
                      if (entropy > 0 && entropy < minEntropy) {
                          minEntropy = entropy;
                          candidates = [{ x, z }];
                      } else if (entropy > 0 && entropy === minEntropy) {
                          candidates.push({ x, z });
                      }
                  }
              }

              bestCandidates = candidates.filter(c => {
                  const neighborDirs = [{dx:0,dz:1},{dx:0,dz:-1},{dx:1,dz:0},{dx:-1,dz:0}];
                  for(const dir of neighborDirs){
                      const nx = c.x + dir.dx, nz = c.z + dir.dz;
                      if (nx >= 0 && nx < this.CHUNK_SIZE && nz >= 0 && nz < this.CHUNK_SIZE) {
                          if (grid[nz][nx].collapsed) return true;
                      } else {
                          let ncX = chunkX, ncZ = chunkZ;
                          if (nx < 0) ncX--; else if (nx >= this.CHUNK_SIZE) ncX++;
                          if (nz < 0) ncZ--; else if (nz >= this.CHUNK_SIZE) ncZ++;
                          if (this.world[`${ncX},${ncZ}`]) return true;
                      }
                  }
                  return false;
              });

              if (bestCandidates.length === 0) bestCandidates = candidates;
          }
          
          if (bestCandidates.length === 0) break;

          const nextCellCoord = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
          const cell = grid[nextCellCoord.z][nextCellCoord.x];
          
          let selectedHeight: number | undefined = undefined;
          if (i === 0 && chunkX === 0 && chunkZ === 0) {
              selectedHeight = waterLevel + 2;
          } else if (cell.possibleHeights.length > 0) {
              const weightedHeights: {height: number, weight: number}[] = [];
              const collapsedNeighbors: WFGridCell[] = [];
              const neighbor_dirs = [{ dx: 0, dz: -1 }, { dx: 0, dz: 1 }, { dx: -1, dz: 0 }, { dx: 1, dz: 0 }];
              
              neighbor_dirs.forEach(n => {
                  const nx = nextCellCoord.x + n.dx, nz = nextCellCoord.z + n.dz;
                  if (nx >= 0 && nx < this.CHUNK_SIZE && nz >= 0 && nz < this.CHUNK_SIZE && grid[nz][nx].collapsed) {
                      collapsedNeighbors.push(grid[nz][nx]);
                  } else {
                      let ncX = chunkX, ncZ = chunkZ;
                      if (nx < 0) ncX--; else if (nx >= this.CHUNK_SIZE) ncX++;
                      if (nz < 0) ncZ--; else if (nz >= this.CHUNK_SIZE) ncZ++;
                      const neighborChunk = this.world[`${ncX},${ncZ}`];
                      if (neighborChunk && neighborChunk.grid) {
                          collapsedNeighbors.push(neighborChunk.grid[(nz + this.CHUNK_SIZE) % this.CHUNK_SIZE][(nx + this.CHUNK_SIZE) % this.CHUNK_SIZE]);
                      }
                  }
              });
              
              cell.possibleHeights.forEach(h => {
                  let weight = 1.0;
                  if (collapsedNeighbors.length > 0) {
                      collapsedNeighbors.forEach(neighbor => {
                          if (neighbor && neighbor.height !== null) {
                              const diff = Math.abs(h - neighbor.height);
                              weight += Math.pow(Math.max(0, continuity - diff + 1), 2);
                          }
                      });
                  }
                  weightedHeights.push({ height: h, weight: weight });
              });

              const totalWeight = weightedHeights.reduce((sum, h) => sum + h.weight, 0);
              if (totalWeight > 0) {
                  let rand = Math.random() * totalWeight;
                  for (const h of weightedHeights) {
                      rand -= h.weight;
                      if (rand <= 0) { selectedHeight = h.height; break; }
                  }
                  if (selectedHeight === undefined) selectedHeight = weightedHeights[weightedHeights.length - 1].height;
              } else {
                  selectedHeight = cell.possibleHeights[Math.floor(Math.random() * cell.possibleHeights.length)];
              }
          } else {
               console.error(`Contradiction at ${nextCellCoord.x},${nextCellCoord.z}. Recovering.`);
              const recoveryNeighbors: number[] = [];
              const neighbor_dirs_rec = [{dx: 0, dz: -1}, {dx: 0, dz: 1}, {dx: -1, dz: 0}, {dx: 1, dz: 0}];
              neighbor_dirs_rec.forEach(n => {
                  const nx = nextCellCoord.x + n.dx, nz = nextCellCoord.z + n.dz;
                  if (nx >= 0 && nx < this.CHUNK_SIZE && nz >= 0 && nz < this.CHUNK_SIZE && grid[nz][nx].collapsed && grid[nz][nx].height !== null) {
                     recoveryNeighbors.push(grid[nz][nx].height as number);
                  }
              });
              if (recoveryNeighbors.length > 0) {
                  selectedHeight = Math.round(recoveryNeighbors.reduce((a, b) => a + b, 0) / recoveryNeighbors.length);
              } else {
                  selectedHeight = waterLevel + 1;
              }
          }

          if (selectedHeight !== undefined) {
            cell.collapsed = true; 
            cell.height = selectedHeight as any;
            cell.possibleHeights = [selectedHeight];
            const propagation_neighbors = [{ dx: 0, dz: -1 }, { dx: 0, dz: 1 }, { dx: -1, dz: 0 }, { dx: 1, dz: 0 }];
            propagation_neighbors.forEach(n => {
                const nx = nextCellCoord.x + n.dx, nz = nextCellCoord.z + n.dz;
                if (nx >= 0 && nx < this.CHUNK_SIZE && nz >= 0 && nz < this.CHUNK_SIZE && !grid[nz][nx].collapsed) {
                    grid[nz][nx].possibleHeights = grid[nz][nx].possibleHeights.filter(h => Math.abs(h - selectedHeight!) <= steepness);
                }
            });
          }
      }

      grid.forEach((row) => row.forEach((cell) => {
           if (cell.height === null) cell.height = 0 as any;
           // Add tileType property to the cell
           if (cell.height !== null) {
             (cell as WFGridCell).tileType = this.getHeightTileType(cell.height, waterLevel);
           }
      }));
      return grid;
  }

  private generateTreesForChunk(chunkKey: string, verticalScale: number): void {
    const chunk = this.world[chunkKey];
    if (!chunk || !chunk.grid) return;
    const wfcGrid = chunk.grid;
    const trunkMeshes: BABYLON.Mesh[] = [], leafMeshes: BABYLON.Mesh[] = [];

    wfcGrid.flat().forEach((cell, index) => {
        // Add chunk coordinates to cell for tree placement
        const flatIndex = index % (this.CHUNK_SIZE * this.CHUNK_SIZE);
        const z = Math.floor(flatIndex / this.CHUNK_SIZE);
        const x = flatIndex % this.CHUNK_SIZE;
        (cell as any).chunkX = parseInt(chunkKey.split(',')[0]);
        (cell as any).chunkZ = parseInt(chunkKey.split(',')[1]);
        (cell as any).x = x;
        (cell as any).z = z;
        
        if (cell.tileType) {
            const type = cell.tileType.name;
            let numTreesToCreate = 0;
            if (type === 'grass' || type === 'hill') {
                if (Math.random() < 1 / 8) { 
                    numTreesToCreate = 1 + Math.floor(Math.random() * 3);
                }
            } else if (type === 'mountain') {
                if (Math.random() < 1 / 12) {
                    numTreesToCreate = 1 + Math.floor(Math.random() * 2);
                }
            }
            if (numTreesToCreate > 0) {
               this.placeTreesOnTile(cell, numTreesToCreate, trunkMeshes, leafMeshes);
            }
        }
    });

     if (trunkMeshes.length > 0) {
        const mergedTrunks = BABYLON.Mesh.MergeMeshes(trunkMeshes, true, true, undefined, false, true);
        if (mergedTrunks) {
            mergedTrunks.material = this.tileMaterials["trunk"];
            mergedTrunks.name = `trunks_${chunkKey}`;
            mergedTrunks.freezeWorldMatrix();
            chunk.mergedTrunks = mergedTrunks;
        }
    }
    if (leafMeshes.length > 0) {
        const mergedLeaves = BABYLON.Mesh.MergeMeshes(leafMeshes, true, true, undefined, false, true);
        if (mergedLeaves) {
            mergedLeaves.material = this.tileMaterials["leaf"];
            mergedLeaves.name = `leaves_${chunkKey}`;
            mergedLeaves.freezeWorldMatrix();
            chunk.mergedLeaves = mergedLeaves;
        }
    }
  }

  private placeTreesOnTile(cell: any, treeCount: number, tMeshes: BABYLON.Mesh[], lMeshes: BABYLON.Mesh[]): void {
      const chunkX = cell.chunkX;
      const chunkZ = cell.chunkZ;
      const chunk = this.world[`${chunkX},${chunkZ}`];
      const terrainMesh = chunk.terrain;
      if (!terrainMesh || !chunk.grid) return;
      const wfcGrid = chunk.grid;
      const verticalScale = 0.5;

      for (let t = 0; t < treeCount; t++) {
          let minX = -0.45, maxX = 0.45, minZ = -0.45, maxZ = 0.45;
          const safetyMargin = 0.3; 
          const currentHeight = cell.height;
          if (cell.x + 1 < this.CHUNK_SIZE && wfcGrid[cell.z][cell.x + 1].height !== null && wfcGrid[cell.z][cell.x + 1].height! < currentHeight!) { maxX -= safetyMargin; }
          if (cell.x - 1 >= 0 && wfcGrid[cell.z][cell.x - 1].height !== null && wfcGrid[cell.z][cell.x - 1].height! < currentHeight!) { minX += safetyMargin; }
          if (cell.z + 1 < this.CHUNK_SIZE && wfcGrid[cell.z + 1][cell.x].height !== null && wfcGrid[cell.z + 1][cell.x].height! < currentHeight!) { maxZ -= safetyMargin; }
          if (cell.z - 1 >= 0 && wfcGrid[cell.z - 1][cell.x].height !== null && wfcGrid[cell.z - 1][cell.x].height! < currentHeight!) { minZ += safetyMargin; }
          if (minX > maxX) minX = maxX = (minX + maxX) / 2;
          if (minZ > maxZ) minZ = maxZ = (minZ + maxZ) / 2;
          const randomOffsetX = minX + Math.random() * (maxX - minX);
          const randomOffsetZ = minZ + Math.random() * (maxZ - minZ);
          const worldX = chunkX * this.CHUNK_SIZE + cell.x + 0.5 + randomOffsetX;
          const worldZ = chunkZ * this.CHUNK_SIZE + cell.z + 0.5 + randomOffsetZ;
          let groundY = cell.height! * verticalScale;
          const ray = new BABYLON.Ray(new BABYLON.Vector3(worldX, this.MAX_HEIGHT * verticalScale + 5, worldZ), new BABYLON.Vector3(0, -1, 0));
          const pickInfo = this.scene.pickWithRay(ray, (mesh) => mesh === terrainMesh);
          if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) { groundY = pickInfo.pickedPoint.y; }
          this.createTree(worldX, groundY, worldZ, tMeshes, lMeshes);
      }
  }

  private createTree(x: number, y: number, z: number, tMeshes: BABYLON.Mesh[], lMeshes: BABYLON.Mesh[]): void {
      const scale = 4;
      const yOffset = -0.1;
      const trunkHeight = 1.2 / scale;
      const trunkDiameter = 0.35 / scale;
      const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", { diameter: trunkDiameter, height: trunkHeight, tessellation: 5 }, this.scene);
      trunk.position.set(x, y + yOffset + trunkHeight / 2, z);
      tMeshes.push(trunk);
      const baseY = y + yOffset + trunkHeight;
      const d1 = 1.4 / scale, h1 = d1 / 2;
      const crown1 = BABYLON.MeshBuilder.CreateCylinder("crown1", { diameterTop: 0, diameterBottom: d1, height: h1, tessellation: 6 }, this.scene);
      crown1.position.set(x, baseY + h1 / 2, z);
      lMeshes.push(crown1);
      const spacing1_2 = (1.2 / scale) * 0.4;
      const spacing2_3 = (1.1 / scale) * 0.4;
      const d2 = 1.1 / scale, h2 = d2 / 2;
      const crown2 = BABYLON.MeshBuilder.CreateCylinder("crown2", { diameterTop: 0, diameterBottom: d2, height: h2, tessellation: 6 }, this.scene);
      crown2.position.set(x, baseY + spacing1_2 + (h2 / 2), z);
      lMeshes.push(crown2);
      const d3 = 0.8 / scale, h3 = d3 / 2;
      const crown3 = BABYLON.MeshBuilder.CreateCylinder("crown3", { diameterTop: 0, diameterBottom: d3, height: h3, tessellation: 6 }, this.scene);
      crown3.position.set(x, baseY + spacing1_2 + spacing2_3 + (h3 / 2), z);
      lMeshes.push(crown3);
  }

  private createWedge(name: string, options: any): BABYLON.Mesh {
    const { frontWidth = 1, backWidth = 1, frontHeight = 1, backHeight = 0, depth = 1 } = options;
    const positions = [ -frontWidth / 2, 0, -depth / 2, frontWidth / 2, 0, -depth / 2, frontWidth / 2, frontHeight, -depth / 2, -frontWidth / 2, frontHeight, -depth / 2, -backWidth / 2, 0, depth / 2, backWidth / 2, 0, depth / 2, backWidth / 2, backHeight, depth / 2, -backWidth / 2, backHeight, depth / 2 ];
    const indices = [ 0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 0, 4, 5, 0, 5, 1 ];
    const uvs = [ 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1 ];
    const vd = new BABYLON.VertexData();
    vd.positions = positions; vd.indices = indices; vd.uvs = uvs;
    const normals: any[] = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    vd.normals = normals;
    const mesh = new BABYLON.Mesh(name, this.scene);
    vd.applyToMesh(mesh, true);
    return mesh;
  }

  private createPlug(name: string, options: any): BABYLON.Mesh {
      const { size = 0.25, height = 0.5 } = options;
      const positions = [ -size, 0, -size, size, 0, -size, size, 0, size, -size, 0, size, 0, height, 0 ];
      const indices = [ 0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4, 3, 2, 1, 3, 1, 0 ];
      const uvs = [ 0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5 ];
      const vd = new BABYLON.VertexData();
      vd.positions = positions; vd.indices = indices; vd.uvs = uvs;
      const normals: any[] = [];
      BABYLON.VertexData.ComputeNormals(positions, indices, normals);
      vd.normals = normals;
      const mesh = new BABYLON.Mesh(name, this.scene);
      vd.applyToMesh(mesh, true);
      return mesh;
  }

  private getHeightTileType(height: number, waterLevel: number): TileType {
      if (height <= waterLevel) return this.TILE_TYPES[0];
      if (height <= waterLevel + 1) return this.TILE_TYPES[1];
      if (height <= waterLevel + 3) return this.TILE_TYPES[2];
      if (height <= waterLevel + 7) return this.TILE_TYPES[3];
      if (height <= waterLevel + 13) return this.TILE_TYPES[4];
      return this.TILE_TYPES[5];
  }

}
