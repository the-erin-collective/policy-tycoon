import { TerrainGenerationService } from '../terrain-generation.service';

export class MockTerrainGenerationService implements Partial<TerrainGenerationService> {
  // Core properties
  tileTypes: any[] = [];
  CHUNK_SIZE = 16;
  baseBoxMesh: any = { dispose: jasmine.createSpy('baseBoxMesh.dispose') };
  baseWedgeMesh: any = { dispose: jasmine.createSpy('baseWedgeMesh.dispose') };
  basePlugMesh: any = { dispose: jasmine.createSpy('basePlugMesh.dispose') };
  baseFullRampMesh: any = { dispose: jasmine.createSpy('baseFullRampMesh.dispose') };
  baseManMadeBlockMesh: any = { dispose: jasmine.createSpy('baseManMadeBlockMesh.dispose') };
  scene: any = { addMesh: jasmine.createSpy('scene.addMesh'), removeMesh: jasmine.createSpy('scene.removeMesh') };
  engine: any = { getRenderingCanvas: jasmine.createSpy('engine.getRenderingCanvas') };
  material: any = { clone: jasmine.createSpy('material.clone') };
  waterMaterial: any = { clone: jasmine.createSpy('waterMaterial.clone') };
  config: any = {
    gridSize: 100,
    chunkSize: 16,
    tileSize: 1,
    maxHeight: 10,
    waterLevel: 0,
    seed: 12345
  };
  chunks: Map<string, any> = new Map();
  heightMap: number[][] = [];
  waterMap: number[][] = [];
  terrainGrid: any[][] = [];
  waterGrid: any[][] = [];
  heightMapCache: Map<string, number> = new Map();
  noise: any = { get: jasmine.createSpy('noise.get') };
  random: any = { number: jasmine.createSpy('random.number') };
  
  // Maps and collections
  boxMasters = new Map();
  wedgeMasters = new Map();
  plugMasters = new Map();
  baseMaterials = new Map();
  chunkMap = new Map();
  
  // Scene and rendering
  waterMesh: any = null;
  
  // Grids (already declared above with correct types)
  
  // Logger
  logger = {
    info: jasmine.createSpy('logger.info'),
    warn: jasmine.createSpy('logger.warn'),
    error: jasmine.createSpy('logger.error'),
    debug: jasmine.createSpy('logger.debug')
  };
  
  // Event emitters
  onTerrainChanged = {
    subscribe: jasmine.createSpy('onTerrainChanged.subscribe').and.returnValue({ unsubscribe: jasmine.createSpy('onTerrainChanged.unsubscribe') })
  };
  
  onChunkUpdated = {
    subscribe: jasmine.createSpy('onChunkUpdated.subscribe').and.returnValue({ unsubscribe: jasmine.createSpy('onChunkUpdated.unsubscribe') })
  };
  
  // Core methods
  generateTerrainGrid = jasmine.createSpy('generateTerrainGrid').and.callFake(() => ({
    grid: [],
    waterGrid: [],
    heightMap: []
  }));
  
  renderTerrain = jasmine.createSpy('renderTerrain');
  renderTerrainWithInstancing = jasmine.createSpy('renderTerrainWithInstancing');
  renderTerrainWithInstancingFromChunks = jasmine.createSpy('renderTerrainWithInstancingFromChunks');
  renderWater = jasmine.createSpy('renderWater');
  updateTerrainTile = jasmine.createSpy('updateTerrainTile');
  initializeBaseMeshes = jasmine.createSpy('initializeBaseMeshes');
  generateTerrainChunks = jasmine.createSpy('generateTerrainChunks');
  updateChunk = jasmine.createSpy('updateChunk');
  renderTerrainChunkWithInstancing = jasmine.createSpy('renderTerrainChunkWithInstancing');
  generateTerrainChunk = jasmine.createSpy('generateTerrainChunk').and.callFake(() => ({
    mesh: { dispose: jasmine.createSpy('chunk.mesh.dispose') },
    x: 0,
    z: 0
  }));
  createPlug = jasmine.createSpy('createPlug').and.returnValue({ dispose: jasmine.createSpy('plug.dispose') });
  getHeightTileType = jasmine.createSpy('getHeightTileType').and.returnValue('ground');
  createWedge = jasmine.createSpy('createWedge').and.returnValue({ dispose: jasmine.createSpy('wedge.dispose') });
  createFullRamp = jasmine.createSpy('createFullRamp').and.returnValue({ dispose: jasmine.createSpy('fullRamp.dispose') });
  createManMadeBlock = jasmine.createSpy('createManMadeBlock').and.returnValue({ dispose: jasmine.createSpy('manMadeBlock.dispose') });
  updateTerrainMaterial = jasmine.createSpy('updateTerrainMaterial');
  getChunkAt = jasmine.createSpy('getChunkAt').and.returnValue(null);
  getChunkForPosition = jasmine.createSpy('getChunkForPosition').and.returnValue(null);
  
  // Utility methods
  getHeightAt = jasmine.createSpy('getHeightAt').and.returnValue(0);
  getWaterLevel = jasmine.createSpy('getWaterLevel').and.returnValue(0);
  isUnderwater = jasmine.createSpy('isUnderwater').and.returnValue(false);
  getTileAt = jasmine.createSpy('getTileAt');
  getNeighbors = jasmine.createSpy('getNeighbors').and.returnValue([]);
  getDistance = jasmine.createSpy('getDistance').and.callFake((x1: number, z1: number, x2: number, z2: number) => 
    Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2))
  );
  getRandomPoint = jasmine.createSpy('getRandomPoint').and.returnValue({ x: 0, z: 0 });
  findPath = jasmine.createSpy('findPath').and.returnValue([]);
  getWorldHeight = jasmine.createSpy('getWorldHeight').and.returnValue(0);
  getSlopeAt = jasmine.createSpy('getSlopeAt').and.returnValue(0);
  getSteepnessAt = jasmine.createSpy('getSteepnessAt').and.returnValue(0);
  getNormalAt = jasmine.createSpy('getNormalAt').and.returnValue({ x: 0, y: 1, z: 0 });
  getBiomeAt = jasmine.createSpy('getBiomeAt').and.returnValue('plains');
  
  // Cleanup
  dispose = jasmine.createSpy('dispose');
}
