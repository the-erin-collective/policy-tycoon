import { Injectable } from '@angular/core';
import { Vector3, Color3, Scene, Mesh, MeshBuilder, StandardMaterial, VertexData, InstancedMesh } from '@babylonjs/core';
import { SeededRandom } from '../../data/models/city-generation';
import { GenerationLoggerService } from './generation-logger.service';

export interface TerrainCell {
  x: number;
  z: number;
  possibleHeights: number[];
  collapsed: boolean;
  height: number | null;
  tileType: TerrainTileType | null;
  hasFullRamp?: boolean;
  hasManMadeBlock?: boolean;
  originalSlope?: {
    direction: 'north' | 'south' | 'east' | 'west';
    heightDifference: number;
  };
}

export interface TerrainTileType {
  color: Color3;
  name: string;
}

export interface TerrainConfig {
  gridSize: number;
  maxHeight: number;
  steepness: number;
  continuity: number;
  waterLevel: number;
  verticalScale: number;
}

export interface TerrainChunk {
  x: number;
  z: number;
  grid: TerrainCell[][];
  isGenerated: boolean;
}

@Injectable({ providedIn: 'root' })
export class TerrainGenerationService {
  private tileTypes: TerrainTileType[] = [
    { color: new Color3(0.2, 0.4, 0.8), name: 'water' },
    { color: new Color3(0.9, 0.8, 0.6), name: 'sand' },
    { color: new Color3(0.3, 0.7, 0.3), name: 'grass' },
    { color: new Color3(0.5, 0.6, 0.3), name: 'hill' },
    { color: new Color3(0.6, 0.6, 0.6), name: 'mountain' },
    { color: new Color3(0.9, 0.9, 0.9), name: 'peak' }
  ];

  private readonly CHUNK_SIZE = 8;

  private baseBoxMesh: Mesh | null = null;
  private baseWedgeMesh: Mesh | null = null;
  private basePlugMesh: Mesh | null = null;
  private baseFullRampMesh: Mesh | null = null;
  private baseManMadeBlockMesh: Mesh | null = null;

  private baseMaterials: Map<string, StandardMaterial> = new Map();

  private boxMasters: Map<string, Mesh> = new Map();
  private wedgeMasters: Map<string, Mesh> = new Map();
  private plugMasters: Map<string, Mesh> = new Map();

  constructor(private logger: GenerationLoggerService) {}

  initializeBaseMeshes(scene: Scene): void {
    scene.blockMaterialDirtyMechanism = true;

    if (this.baseBoxMesh && this.baseWedgeMesh && this.basePlugMesh && this.baseFullRampMesh && this.baseManMadeBlockMesh) {
      return;
    }

    // Base meshes
    this.baseBoxMesh = MeshBuilder.CreateBox('baseTerrainBox', { width: 1, depth: 1, height: 1 }, scene);
    this.baseBoxMesh.isVisible = false;
    this.baseBoxMesh.doNotSyncBoundingInfo = true;

    this.baseWedgeMesh = this.createWedge('baseTerrainWedge', { frontWidth: 1, backWidth: 0.6, frontHeight: 0.5, backHeight: 0, depth: 0.25 }, scene);
    this.baseWedgeMesh.isVisible = false;
    this.baseWedgeMesh.doNotSyncBoundingInfo = true;

    this.basePlugMesh = this.createPlug('baseTerrainPlug', { size: 0.25, height: 0.5 }, scene);
    this.basePlugMesh.isVisible = false;
    this.basePlugMesh.doNotSyncBoundingInfo = true;

    this.baseFullRampMesh = this.createFullRamp('baseFullRamp', { width: 1, depth: 1, height: 1 }, scene);
    this.baseFullRampMesh.isVisible = false;
    this.baseFullRampMesh.doNotSyncBoundingInfo = true;

    this.baseManMadeBlockMesh = MeshBuilder.CreateBox('baseManMadeBlock', { width: 1, depth: 1, height: 1 }, scene);
    this.baseManMadeBlockMesh.isVisible = false;
    this.baseManMadeBlockMesh.doNotSyncBoundingInfo = true;

    // Materials and per-type masters
    this.tileTypes.forEach(tileType => {
      if (!this.baseMaterials.has(tileType.name)) {
        const mat = new StandardMaterial(`mat_${tileType.name}`, scene);
        mat.diffuseColor = tileType.color;
        mat.specularColor = new Color3(0, 0, 0);
        mat.freeze();
        this.baseMaterials.set(tileType.name, mat);
      }
      const material = this.baseMaterials.get(tileType.name)!;

      if (this.baseBoxMesh && !this.boxMasters.has(tileType.name)) {
        const master = this.baseBoxMesh.clone(`boxMaster_${tileType.name}`) as Mesh;
        master.material = material;
        master.isVisible = false;
        master.doNotSyncBoundingInfo = true;
        this.boxMasters.set(tileType.name, master);
      }
      if (this.baseWedgeMesh && !this.wedgeMasters.has(tileType.name)) {
        const master = this.baseWedgeMesh.clone(`wedgeMaster_${tileType.name}`) as Mesh;
        master.material = material;
        master.isVisible = false;
        master.doNotSyncBoundingInfo = true;
        this.wedgeMasters.set(tileType.name, master);
      }
      if (this.basePlugMesh && !this.plugMasters.has(tileType.name)) {
        const master = this.basePlugMesh.clone(`plugMaster_${tileType.name}`) as Mesh;
        master.material = material;
        master.isVisible = false;
        master.doNotSyncBoundingInfo = true;
        this.plugMasters.set(tileType.name, master);
      }
    });

    this.logger.info('Terrain base meshes initialized for instancing');
  }

  generateTerrainGrid(config: TerrainConfig, rng: SeededRandom): TerrainCell[][] {
    const grid: TerrainCell[][] = Array.from({ length: config.gridSize }, (_, z) =>
      Array.from({ length: config.gridSize }, (_, x) => ({
        x,
        z,
        possibleHeights: Array.from({ length: config.maxHeight + 1 }, (_, i) => i),
        collapsed: false,
        height: null,
        tileType: null,
      }))
    );

    const centerX = Math.floor(config.gridSize / 2);
    const centerZ = Math.floor(config.gridSize / 2);

    const queue: { x: number; z: number }[] = [];
    const processed = new Set<string>();

    const center = grid[centerZ][centerX];
    let selectedHeight = config.waterLevel + 2;
    if (!center.possibleHeights.includes(selectedHeight)) {
      selectedHeight = center.possibleHeights.length > 0 ? center.possibleHeights[Math.floor(rng.nextFloat() * center.possibleHeights.length)] : 0;
    }
    center.collapsed = true;
    center.height = selectedHeight;
    center.possibleHeights = [selectedHeight];
    processed.add(`${centerX},${centerZ}`);

    const dirs = [ {dx:0,dz:-1}, {dx:0,dz:1}, {dx:-1,dz:0}, {dx:1,dz:0} ];
    dirs.forEach(d => {
      const nx = centerX + d.dx, nz = centerZ + d.dz;
      if (nx>=0 && nz>=0 && nx<config.gridSize && nz<config.gridSize) { queue.push({x:nx,z:nz}); processed.add(`${nx},${nz}`);} 
    });

    while (queue.length>0) {
      let minEntropy = Infinity, idx = -1;
      for (let i=0;i<queue.length;i++){
        const {x,z} = queue[i];
        const cell = grid[z][x];
        if (!cell.collapsed) {
          const e = cell.possibleHeights.length;
          if (e>0 && e<minEntropy){ minEntropy=e; idx=i; }
        }
      }
      if (idx === -1) break;
      const next = queue.splice(idx,1)[0];
      const cell = grid[next.z][next.x];
      selectedHeight = cell.possibleHeights.length>0 ? cell.possibleHeights[Math.floor(rng.nextFloat()*cell.possibleHeights.length)] : 0;
      cell.collapsed = true;
      cell.height = selectedHeight;
      cell.possibleHeights = [selectedHeight];

      dirs.forEach(d => {
        const nx = next.x + d.dx, nz = next.z + d.dz;
        const key = `${nx},${nz}`;
        if (nx>=0 && nz>=0 && nx<config.gridSize && nz<config.gridSize && !processed.has(key)){
          const ncell = grid[nz][nx];
          if (!ncell.collapsed) {
            ncell.possibleHeights = ncell.possibleHeights.filter(h => Math.abs(h - selectedHeight) <= config.steepness);
            queue.push({x:nx,z:nz});
            processed.add(key);
          }
        }
      });
    }

    for (let z=0; z<config.gridSize; z++) {
      for (let x=0; x<config.gridSize; x++) {
        if (grid[z][x].height !== null) {
          grid[z][x].tileType = this.getHeightTileType(grid[z][x].height!, config.waterLevel);
        }
      }
    }

    return grid;
  }

  generateTerrainChunks(config: TerrainConfig, rng: SeededRandom): TerrainChunk[][] {
    const chunksX = Math.ceil(config.gridSize / this.CHUNK_SIZE);
    const chunksZ = Math.ceil(config.gridSize / this.CHUNK_SIZE);
    const chunks: TerrainChunk[][] = Array.from({ length: chunksZ }, (_, z) =>
      Array.from({ length: chunksX }, (_, x) => ({ x, z, grid: [], isGenerated: false }))
    );

    for (let cz=0; cz<chunksZ; cz++) {
      for (let cx=0; cx<chunksX; cx++) {
        chunks[cz][cx] = this.generateTerrainChunk(config, rng, cx, cz);
      }
    }
    return chunks;
  }

  private generateTerrainChunk(config: TerrainConfig, rng: SeededRandom, chunkX: number, chunkZ: number): TerrainChunk {
    const startX = chunkX * this.CHUNK_SIZE;
    const startZ = chunkZ * this.CHUNK_SIZE;
    const endX = Math.min(startX + this.CHUNK_SIZE, config.gridSize);
    const endZ = Math.min(startZ + this.CHUNK_SIZE, config.gridSize);

    const grid: TerrainCell[][] = Array.from({ length: endZ - startZ }, (_, z) =>
      Array.from({ length: endX - startX }, (_, x) => ({
        x: startX + x,
        z: startZ + z,
        possibleHeights: Array.from({ length: config.maxHeight + 1 }, (_, i) => i),
        collapsed: false,
        height: null,
        tileType: null,
      }))
    );

    const centerX = Math.floor((endX - startX) / 2);
    const centerZ = Math.floor((endZ - startZ) / 2);
    const queue: { x: number; z: number }[] = [];
    const processed = new Set<string>();

    const center = grid[centerZ][centerX];
    let selectedHeight = config.waterLevel + 2;
    if (!center.possibleHeights.includes(selectedHeight)) {
      selectedHeight = center.possibleHeights.length > 0 ? center.possibleHeights[Math.floor(rng.nextFloat() * center.possibleHeights.length)] : 0;
    }
    center.collapsed = true;
    center.height = selectedHeight;
    center.possibleHeights = [selectedHeight];
    processed.add(`${centerX},${centerZ}`);

    const dirs = [ {dx:0,dz:-1}, {dx:0,dz:1}, {dx:-1,dz:0}, {dx:1,dz:0} ];
    dirs.forEach(d => { const nx = centerX + d.dx, nz = centerZ + d.dz; if (nx>=0 && nz>=0 && nx<(endX-startX) && nz<(endZ-startZ)){ queue.push({x:nx,z:nz}); processed.add(`${nx},${nz}`);} });

    while (queue.length>0) {
      let minEntropy = Infinity, idx=-1; for (let i=0;i<queue.length;i++){ const {x,z}=queue[i]; const cell=grid[z][x]; if(!cell.collapsed){ const e=cell.possibleHeights.length; if(e>0&&e<minEntropy){minEntropy=e;idx=i;} } }
      if (idx===-1) break;
      const next = queue.splice(idx,1)[0];
      const cell = grid[next.z][next.x];
      selectedHeight = cell.possibleHeights.length>0 ? cell.possibleHeights[Math.floor(rng.nextFloat()*cell.possibleHeights.length)] : 0;
      cell.collapsed = true; cell.height = selectedHeight; cell.possibleHeights = [selectedHeight];
      dirs.forEach(d=>{ const nx=next.x+d.dx, nz=next.z+d.dz; const key=`${nx},${nz}`; if(nx>=0&&nz>=0&&nx<(endX-startX)&&nz<(endZ-startZ)&&!processed.has(key)){ const ncell=grid[nz][nx]; if(!ncell.collapsed){ ncell.possibleHeights = ncell.possibleHeights.filter(h=>Math.abs(h-selectedHeight)<=config.steepness); queue.push({x:nx,z:nz}); processed.add(key);} } });
    }

    for (let z=0; z<grid.length; z++) {
      for (let x=0; x<grid[z].length; x++) {
        if (grid[z][x].height !== null) {
          grid[z][x].tileType = this.getHeightTileType(grid[z][x].height!, config.waterLevel);
        }
      }
    }

    return { x: chunkX, z: chunkZ, grid, isGenerated: true };
  }

  private getHeightTileType(height: number, waterLevel: number): TerrainTileType {
    if (height <= waterLevel) return this.tileTypes[0];
    if (height <= waterLevel + 1) return this.tileTypes[1];
    if (height <= waterLevel + 3) return this.tileTypes[2];
    if (height <= waterLevel + 7) return this.tileTypes[3];
    if (height <= waterLevel + 13) return this.tileTypes[4];
    return this.tileTypes[5];
  }

  private createWedge(name: string, options: { frontWidth?: number; backWidth?: number; frontHeight?: number; backHeight?: number; depth?: number }, scene: Scene): Mesh {
    const { frontWidth = 1, backWidth = 1, frontHeight = 1, backHeight = 0, depth = 1 } = options;
    const positions = [
      -frontWidth / 2, 0, -depth / 2,
       frontWidth / 2, 0, -depth / 2,
       frontWidth / 2, frontHeight, -depth / 2,
      -frontWidth / 2, frontHeight, -depth / 2,
      -backWidth / 2, 0, depth / 2,
       backWidth / 2, 0, depth / 2,
       backWidth / 2, backHeight, depth / 2,
      -backWidth / 2, backHeight, depth / 2,
    ];
    const indices = [ 0,1,2, 0,2,3, 4,6,5, 4,7,6, 0,3,7, 0,7,4, 1,5,6, 1,6,2, 3,2,6, 3,6,7, 0,4,5, 0,5,1 ];
    const uvs = new Array((positions.length/3)*2).fill(0);
    const vd = new VertexData(); vd.positions = positions; vd.indices = indices; vd.uvs = uvs; const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals); vd.normals = normals; const mesh = new Mesh(name, scene); vd.applyToMesh(mesh, true); return mesh;
  }

  private createFullRamp(name: string, options: { width?: number; depth?: number; height?: number }, scene: Scene): Mesh {
    const { width = 1, depth = 1, height = 1 } = options;
    const positions = [ -width/2,0,-depth/2,  width/2,0,-depth/2,  width/2,0,depth/2,  -width/2,0,depth/2,  -width/2,height,-depth/2,  width/2,height,-depth/2 ];
    const indices = [ 0,1,4, 1,5,4, 0,4,3, 1,2,5, 3,4,5, 3,5,2, 0,3,1, 1,3,2 ];
    const uvs: number[] = new Array((positions.length/3)*2).fill(0);
    const vd = new VertexData(); vd.positions = positions; vd.indices = indices; vd.uvs = uvs; const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals); vd.normals = normals; const mesh = new Mesh(name, scene); vd.applyToMesh(mesh, true); return mesh;
  }

  private createPlug(name: string, options: { size?: number; height?: number }, scene: Scene): Mesh {
    const { size = 0.25, height = 0.5 } = options;
    const positions = [ -size,0,-size,  size,0,-size,  size,0,size,  -size,0,size,  0,height,0 ];
    const indices = [ 0,1,4, 1,2,4, 2,3,4, 3,0,4, 3,2,1, 3,1,0 ];
    const uvs: number[] = new Array((positions.length/3)*2).fill(0);
    const vd = new VertexData(); vd.positions = positions; vd.indices = indices; vd.uvs = uvs; const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals); vd.normals = normals; const mesh = new Mesh(name, scene); vd.applyToMesh(mesh, true); return mesh;
  }

  // Non-instanced render (kept simple and local-scope safe)
  renderTerrain(grid: TerrainCell[][], config: TerrainConfig, scene: Scene): Mesh {
    const terrainMeshes: Mesh[] = [];
    const halfGrid = config.gridSize / 2;

    for (let z=0; z<config.gridSize; z++) {
      for (let x=0; x<config.gridSize; x++) {
        const cell = grid[z][x];
        if (cell.height !== null && cell.height > 0 && cell.tileType) {
          const h = cell.height * config.verticalScale;
          const box = MeshBuilder.CreateBox(`tile_${x}_${z}`, { width:1, depth:1, height:h }, scene);
          box.position.set(x - halfGrid + 0.5, h/2, z - halfGrid + 0.5);
          const mat = new StandardMaterial(`mat_box_${x}_${z}`, scene);
          mat.diffuseColor = cell.tileType.color; mat.specularColor = new Color3(0,0,0); mat.freeze();
          box.material = mat; terrainMeshes.push(box);
        }
      }
    }

    // Simple plugs for walls
    const WEDGE_DEPTH = 0.25; const WEDGE_HEIGHT = 1.0 * config.verticalScale;
    for (let z=0; z<config.gridSize-1; z++) {
      for (let x=0; x<config.gridSize-1; x++) {
        const h_bl = grid[z][x].height; const h_br = grid[z][x+1].height; const h_tl = grid[z+1][x].height; const h_tr = grid[z+1][x+1].height; if (h_bl===null||h_br===null||h_tl===null||h_tr===null) continue;
        if (h_bl > h_br && h_tl > h_tr && h_bl === h_tl && h_br === h_tr) {
          const plug = this.createPlug(`plug_${x}_${z}`, { size: WEDGE_DEPTH, height: WEDGE_HEIGHT }, scene);
          plug.position.set(x + 1 - halfGrid, h_br * config.verticalScale, z + 1 - halfGrid);
          const m = new StandardMaterial(`mat_plug_${x}_${z}`, scene); m.diffuseColor = grid[z][x].tileType?.color || this.tileTypes[2].color; m.specularColor = new Color3(0,0,0); m.freeze(); plug.material = m; terrainMeshes.push(plug);
        }
        if (h_br > h_bl && h_tr > h_tl && h_br === h_tr && h_bl === h_tl) {
          const plug = this.createPlug(`plug_${x}_${z}_left`, { size: WEDGE_DEPTH, height: WEDGE_HEIGHT }, scene);
          plug.position.set(x + 1 - halfGrid, h_bl * config.verticalScale, z + 1 - halfGrid);
          const m = new StandardMaterial(`mat_plug_${x}_${z}_left`, scene); m.diffuseColor = grid[z][x+1].tileType?.color || this.tileTypes[2].color; m.specularColor = new Color3(0,0,0); m.freeze(); plug.material = m; terrainMeshes.push(plug);
        }
        if (h_bl > h_tl && h_br > h_tr && h_bl === h_br && h_tl === h_tr) {
          const plug = this.createPlug(`plug_${x}_${z}_top`, { size: WEDGE_DEPTH, height: WEDGE_HEIGHT }, scene);
          plug.position.set(x + 1 - halfGrid, h_tl * config.verticalScale, z + 1 - halfGrid);
          const m = new StandardMaterial(`mat_plug_${x}_${z}_top`, scene); m.diffuseColor = grid[z][x].tileType?.color || this.tileTypes[2].color; m.specularColor = new Color3(0,0,0); m.freeze(); plug.material = m; terrainMeshes.push(plug);
        }
      }
    }

    const parent = new Mesh('terrainParent', scene);
    terrainMeshes.forEach(m => m.setParent(parent));
    return parent;
  }

  renderWater(config: TerrainConfig, scene: Scene): Mesh {
    const waterPlane = MeshBuilder.CreateGround('waterPlane', { width: config.gridSize, height: config.gridSize }, scene);
    waterPlane.position.y = config.waterLevel * config.verticalScale + 0.05;
    const waterMaterial = new StandardMaterial('waterMaterial', scene);
    waterMaterial.diffuseColor = new Color3(0.2, 0.4, 0.8);
    waterMaterial.alpha = 0.75;
    waterMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    waterMaterial.freeze();
    waterPlane.material = waterMaterial;
    waterPlane.freezeWorldMatrix();
    this.logger.info('Successfully rendered water plane');
    return waterPlane;
  }

  renderTerrainWithInstancing(grid: TerrainCell[][], config: TerrainConfig, scene: Scene): InstancedMesh[] {
    this.initializeBaseMeshes(scene);
    const instances: InstancedMesh[] = [];
    const halfGrid = config.gridSize / 2;

    // Blocks
    for (let z = 0; z < config.gridSize; z++) {
      for (let x = 0; x < config.gridSize; x++) {
        const cell = grid[z][x];
        if (cell.height !== null && cell.height > 0 && cell.tileType) {
          const scaledHeight = cell.height * config.verticalScale;
          const master = this.boxMasters.get(cell.tileType.name);
          if (master) {
            const instance = master.createInstance(`tile_${x}_${z}`);
            instance.scaling.y = scaledHeight;
            instance.position.set(x - halfGrid + 0.5, scaledHeight / 2, z - halfGrid + 0.5);
            instances.push(instance);
          }
        }
      }
    }

    // Wedges
    const WEDGE_DEPTH = 0.25; const WEDGE_HEIGHT = 1.0 * config.verticalScale;
    for (let z = 0; z < config.gridSize; z++) {
      for (let x = 0; x < config.gridSize; x++) {
        const current = grid[z][x]; if (current.height === null) continue;
        const neighbors = [ { dx: 1, dz: 0, rot: Math.PI / 2 }, { dx: -1, dz: 0, rot: -Math.PI / 2 }, { dx: 0, dz: 1, rot: 0 }, { dx: 0, dz: -1, rot: Math.PI } ];
        neighbors.forEach(n => {
          const nx = x + n.dx, nz = z + n.dz; if (nx<0||nz<0||nx>=config.gridSize||nz>=config.gridSize) return; const neighbor = grid[nz][nx]; if (neighbor.height===null) return;
          if (current.height! > neighbor.height) {
            const sel = this.getHeightTileType(neighbor.height, config.waterLevel);
            const wedgeMaster = this.wedgeMasters.get(sel.name);
            if (wedgeMaster) { const inst = wedgeMaster.createInstance(`wedge_${x}_${z}_${nx}_${nz}`); inst.rotation.y = n.rot; inst.position.set((x - halfGrid + 0.5) + n.dx * (0.5 + WEDGE_DEPTH / 2), neighbor.height * config.verticalScale, (z - halfGrid + 0.5) + n.dz * (0.5 + WEDGE_DEPTH / 2)); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
        });
      }
    }

    // Plugs
    for (let z=0; z<config.gridSize-1; z++) {
      for (let x=0; x<config.gridSize-1; x++) {
        const h_bl = grid[z][x].height; const h_br = grid[z][x+1].height; const h_tl = grid[z+1][x].height; const h_tr = grid[z+1][x+1].height; if (h_bl===null||h_br===null||h_tl===null||h_tr===null) continue;
        if (h_bl > h_br && h_tl > h_tr && h_bl === h_tl && h_br === h_tr) { const type=this.getHeightTileType(h_br, config.waterLevel); const plugMaster=this.plugMasters.get(type.name); if (plugMaster) { const inst=plugMaster.createInstance(`plug_${x}_${z}`); inst.position.set(x + 1 - halfGrid, h_br * config.verticalScale, z + 1 - halfGrid); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
        if (h_br > h_bl && h_tr > h_tl && h_br === h_tr && h_bl === h_tl) { const type=this.getHeightTileType(h_bl, config.waterLevel); const plugMaster=this.plugMasters.get(type.name); if (plugMaster) { const inst=plugMaster.createInstance(`plug_${x}_${z}_left`); inst.position.set(x + 1 - halfGrid, h_bl * config.verticalScale, z + 1 - halfGrid); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
        if (h_bl > h_tl && h_br > h_tr && h_bl === h_br && h_tl === h_tr) { const type=this.getHeightTileType(h_tl, config.waterLevel); const plugMaster=this.plugMasters.get(type.name); if (plugMaster) { const inst=plugMaster.createInstance(`plug_${x}_${z}_top`); inst.position.set(x + 1 - halfGrid, h_tl * config.verticalScale, z + 1 - halfGrid); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
      }
    }

    this.logger.info(`Created ${instances.length} terrain instances`);
    return instances;
  }

  updateTerrainTile(
    x: number,
    z: number,
    newHeight: number,
    newTileType: TerrainTileType,
    scene: Scene,
    config: TerrainConfig,
    instanceMap: Map<string, InstancedMesh>
  ): InstancedMesh[] {
    this.initializeBaseMeshes(scene);
    const halfGrid = config.gridSize / 2;
    const name = `tile_${x}_${z}`;
    const existing = instanceMap.get(name);
    if (existing) { existing.dispose(); instanceMap.delete(name); }
    const master = this.boxMasters.get(newTileType.name);
    const out: InstancedMesh[] = [];
    if (master) {
      const inst = master.createInstance(name);
      const h = newHeight * config.verticalScale; inst.scaling.y = h; inst.position.set(x - halfGrid + 0.5, h/2, z - halfGrid + 0.5);
      instanceMap.set(name, inst); out.push(inst);
    }
    return out;
  }

  renderTerrainWithInstancingFromChunks(chunks: TerrainChunk[][], config: TerrainConfig, scene: Scene): InstancedMesh[] {
    this.initializeBaseMeshes(scene);
    const result: InstancedMesh[] = [];
    for (let cz=0; cz<chunks.length; cz++) {
      for (let cx=0; cx<chunks[cz].length; cx++) {
        const chunk = chunks[cz][cx]; if (!chunk.isGenerated) continue;
        const list = this.renderTerrainChunkWithInstancing(chunk, config, scene); result.push(...list);
      }
    }
    return result;
  }

  private renderTerrainChunkWithInstancing(chunk: TerrainChunk, config: TerrainConfig, scene: Scene): InstancedMesh[] {
    const instances: InstancedMesh[] = [];
    const halfGrid = config.gridSize / 2; const offX = chunk.x * this.CHUNK_SIZE; const offZ = chunk.z * this.CHUNK_SIZE;

    // Blocks
    for (let z=0; z<chunk.grid.length; z++) {
      for (let x=0; x<chunk.grid[z].length; x++) {
        const cell = chunk.grid[z][x]; if (cell.height!==null && cell.height>0 && cell.tileType) {
          const h = cell.height * config.verticalScale; const master = this.boxMasters.get(cell.tileType.name);
          if (master) { const inst = master.createInstance(`tile_${offX + x}_${offZ + z}`); inst.scaling.y = h; inst.position.set(offX + x - halfGrid + 0.5, h/2, offZ + z - halfGrid + 0.5); instances.push(inst);} }
      }
    }

    // Wedges
    const WEDGE_DEPTH = 0.25; const WEDGE_HEIGHT = 1.0 * config.verticalScale;
    for (let z=0; z<chunk.grid.length; z++) {
      for (let x=0; x<chunk.grid[z].length; x++) {
        const current = chunk.grid[z][x]; if (current.height===null) continue;
        const neighbors = [ { dx: 1, dz: 0, rot: Math.PI / 2 }, { dx: -1, dz: 0, rot: -Math.PI / 2 }, { dx: 0, dz: 1, rot: 0 }, { dx: 0, dz: -1, rot: Math.PI } ];
        neighbors.forEach(n=>{
          const nx = x + n.dx, nz = z + n.dz; if (nx<0||nz<0||nx>=chunk.grid[0].length||nz>=chunk.grid.length) return; const neighbor = chunk.grid[nz][nx]; if (neighbor.height===null) return;
          if (current.height! > neighbor.height) { const sel = this.getHeightTileType(neighbor.height, config.waterLevel); const wedgeMaster = this.wedgeMasters.get(sel.name); if (wedgeMaster) { const inst = wedgeMaster.createInstance(`wedge_${offX + x}_${offZ + z}_${offX + nx}_${offZ + nz}`); inst.rotation.y = n.rot; inst.position.set((offX + x - halfGrid + 0.5) + n.dx*(0.5 + WEDGE_DEPTH/2), neighbor.height * config.verticalScale, (offZ + z - halfGrid + 0.5) + n.dz*(0.5 + WEDGE_DEPTH/2)); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
        });
      }
    }

    // Plugs
    for (let z=0; z<chunk.grid.length-1; z++) {
      for (let x=0; x<chunk.grid[z].length-1; x++) {
        const h_bl = chunk.grid[z][x].height; const h_br = chunk.grid[z][x+1].height; const h_tl = chunk.grid[z+1][x].height; const h_tr = chunk.grid[z+1][x+1].height; if (h_bl===null||h_br===null||h_tl===null||h_tr===null) continue;
        if (h_bl > h_br && h_tl > h_tr && h_bl === h_tl && h_br === h_tr) { const type=this.getHeightTileType(h_br, config.waterLevel); const plugMaster=this.plugMasters.get(type.name); if (plugMaster) { const inst=plugMaster.createInstance(`plug_${offX + x}_${offZ + z}`); inst.position.set(offX + x + 1 - halfGrid, h_br * config.verticalScale, offZ + z + 1 - halfGrid); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
        if (h_br > h_bl && h_tr > h_tl && h_br === h_tr && h_bl === h_tl) { const type=this.getHeightTileType(h_bl, config.waterLevel); const plugMaster=this.plugMasters.get(type.name); if (plugMaster) { const inst=plugMaster.createInstance(`plug_${offX + x}_${offZ + z}_left`); inst.position.set(offX + x + 1 - halfGrid, h_bl * config.verticalScale, offZ + z + 1 - halfGrid); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
        if (h_bl > h_tl && h_br > h_tr && h_bl === h_br && h_tl === h_tr) { const type=this.getHeightTileType(h_tl, config.waterLevel); const plugMaster=this.plugMasters.get(type.name); if (plugMaster) { const inst=plugMaster.createInstance(`plug_${offX + x}_${offZ + z}_top`); inst.position.set(offX + x + 1 - halfGrid, h_tl * config.verticalScale, offZ + z + 1 - halfGrid); inst.scaling.set(1, WEDGE_HEIGHT, 1); instances.push(inst);} }
      }
    }

    return instances;
  }
}
