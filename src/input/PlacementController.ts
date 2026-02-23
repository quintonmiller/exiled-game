import type { Game } from '../Game';
import { BUILDING_DEFS } from '../data/BuildingDefs';
import { BuildingType, TileType, TILE_SIZE, ROAD_DRAG_MAX_PATH, BRIDGE_DRAG_MAX_PATH, FLEXIBLE_MIN_SIZE, FLEXIBLE_MAX_SIZE } from '../constants';
import type { DoorDef, Rotation } from '../types';
import { getRotatedDims, getRotatedDoor, getDoorEntryTile } from '../utils/DoorUtils';

export class PlacementController {
  private game: Game;

  // Drag state
  private dragStart: { tileX: number; tileY: number } | null = null;
  private dragging = false;
  private dragCancelled = false;
  private dragGhosts: Array<{ x: number; y: number; w: number; h: number; valid: boolean; doorDef?: DoorDef; entryTile?: { x: number; y: number } }> = [];

  constructor(game: Game) {
    this.game = game;
  }

  /** Cycle placement rotation 0 -> 1 -> 2 -> 3 -> 0 */
  rotate(): void {
    this.game.state.placingRotation = ((this.game.state.placingRotation + 1) % 4) as Rotation;
  }

  isDragging(): boolean {
    return this.dragging;
  }

  /** Check and consume the drag-cancelled flag (prevents stale mouseup from placing) */
  consumeDragCancelled(): boolean {
    if (this.dragCancelled) {
      this.dragCancelled = false;
      return true;
    }
    return false;
  }

  isDragType(type: BuildingType): boolean {
    if (type === BuildingType.ROAD) return true;
    if (type === BuildingType.STONE_ROAD) return true;
    if (type === BuildingType.BRIDGE) return true;
    const def = BUILDING_DEFS[type];
    return !!def?.flexible;
  }

  startDrag(screenX: number, screenY: number): void {
    const placingType = this.game.state.placingBuilding;
    if (!placingType || !this.isDragType(placingType)) return;

    const tile = this.game.camera.screenToTile(screenX, screenY);
    this.dragStart = { tileX: tile.x, tileY: tile.y };
    this.dragging = true;
    this.dragCancelled = false;
    this.dragGhosts = [];
  }

  endDrag(_screenX: number, _screenY: number): void {
    if (!this.dragging || !this.dragStart) {
      this.cancelDrag();
      return;
    }

    const placingType = this.game.state.placingBuilding;
    if (!placingType) {
      this.cancelDrag();
      return;
    }

    const def = BUILDING_DEFS[placingType];
    if (!def) {
      this.cancelDrag();
      return;
    }

    if (placingType === BuildingType.ROAD) {
      this.endRoadDrag(def);
    } else if (placingType === BuildingType.STONE_ROAD) {
      this.endStoneRoadDrag(def);
    } else if (placingType === BuildingType.BRIDGE) {
      this.endBridgeDrag(def);
    } else if (def.flexible) {
      this.endFlexibleDrag(def);
    }

    this.cancelDrag();
  }

  private endRoadDrag(def: typeof BUILDING_DEFS[string]): void {
    // Filter to only valid ghost tiles that can accept a new road entity
    const validTiles = this.dragGhosts.filter(g => g.valid);
    if (validTiles.length === 0) return;

    const tilesToPlace = validTiles.filter((ghost) => this.canPlaceRoad(ghost.x, ghost.y));
    if (tilesToPlace.length === 0) return;

    // Check total cost upfront
    const totalLogCost = tilesToPlace.length * def.costLog;
    const totalStoneCost = tilesToPlace.length * def.costStone;
    if (this.game.getResource('log') < totalLogCost) return;
    if (this.game.getResource('stone') < totalStoneCost) return;

    // Create a building entity per tile (workers will construct them)
    for (const ghost of tilesToPlace) {
      const tx = ghost.x;
      const ty = ghost.y;
      const id = this.game.world.createEntity();

      this.game.world.addComponent(id, 'position', {
        tileX: tx, tileY: ty,
        pixelX: tx * TILE_SIZE, pixelY: ty * TILE_SIZE,
      });
      this.game.world.addComponent(id, 'building', {
        type: def.type,
        name: def.name,
        category: def.category,
        completed: false,
        constructionProgress: 0,
        constructionWork: def.constructionWork,
        width: 1, height: 1,
        maxWorkers: def.maxWorkers,
        workRadius: def.workRadius,
        assignedWorkers: [],
        costLog: 0, costStone: 0, costIron: 0,
        materialsDelivered: true,
        rotation: 0,
      });
      this.game.world.addComponent(id, 'renderable', {
        sprite: null, layer: 5, animFrame: 0, visible: true,
      });

      // Mark occupied but do NOT block movement (workers still walk here)
      this.game.tileMap.markOccupied(tx, ty, 1, 1, id, false);
    }

    // Deduct resources upfront for all tiles
    if (totalLogCost > 0) this.game.removeResource('log', totalLogCost);
    if (totalStoneCost > 0) this.game.removeResource('stone', totalStoneCost);
    this.game.pathfinder.clearCache();
  }

  private endStoneRoadDrag(def: typeof BUILDING_DEFS[string]): void {
    const validTiles = this.dragGhosts.filter(g => g.valid);
    if (validTiles.length === 0) return;

    const tilesToPlace = validTiles.filter((ghost) => this.canPlaceStoneRoad(ghost.x, ghost.y));
    if (tilesToPlace.length === 0) return;

    // Check total cost upfront (only new tiles cost stone, upgrading from ROAD is same cost)
    const totalStoneCost = tilesToPlace.length * def.costStone;
    if (this.game.getResource('stone') < totalStoneCost) return;

    // Create a building entity per tile (workers will construct them)
    for (const ghost of tilesToPlace) {
      const tx = ghost.x;
      const ty = ghost.y;
      const id = this.game.world.createEntity();

      // If upgrading an existing dirt road, clear it first so tile is not occupied
      const existingTile = this.game.tileMap.get(tx, ty);
      if (existingTile?.type === TileType.ROAD) {
        this.game.tileMap.clearOccupied(tx, ty);
      }

      this.game.world.addComponent(id, 'position', {
        tileX: tx, tileY: ty,
        pixelX: tx * TILE_SIZE, pixelY: ty * TILE_SIZE,
      });
      this.game.world.addComponent(id, 'building', {
        type: def.type,
        name: def.name,
        category: def.category,
        completed: false,
        constructionProgress: 0,
        constructionWork: def.constructionWork,
        width: 1, height: 1,
        maxWorkers: def.maxWorkers,
        workRadius: def.workRadius,
        assignedWorkers: [],
        costLog: 0, costStone: 0, costIron: 0,
        materialsDelivered: true,
        rotation: 0,
      });
      this.game.world.addComponent(id, 'renderable', {
        sprite: null, layer: 5, animFrame: 0, visible: true,
      });

      this.game.tileMap.markOccupied(tx, ty, 1, 1, id, false);
    }

    if (totalStoneCost > 0) this.game.removeResource('stone', totalStoneCost);
    this.game.pathfinder.clearCache();
  }

  private endFlexibleDrag(def: typeof BUILDING_DEFS[string]): void {
    // dragGhosts should contain exactly 1 ghost with the rectangle dimensions
    if (this.dragGhosts.length !== 1 || !this.dragGhosts[0].valid) return;

    const ghost = this.dragGhosts[0];
    const tx = ghost.x;
    const ty = ghost.y;
    const rw = ghost.w;
    const rh = ghost.h;

    // Scale construction work and costs based on area
    const defaultArea = def.width * def.height;
    const draggedArea = rw * rh;
    const scale = draggedArea / defaultArea;

    const scaledCostLog = Math.ceil(def.costLog * scale);
    const scaledCostStone = Math.ceil(def.costStone * scale);
    const scaledCostIron = Math.ceil(def.costIron * scale);
    const scaledWork = Math.ceil(def.constructionWork * scale);

    // Check affordability
    if (this.game.getResource('log') < scaledCostLog) return;
    if (this.game.getResource('stone') < scaledCostStone) return;
    if (this.game.getResource('iron') < scaledCostIron) return;

    // Create building entity
    const id = this.game.world.createEntity();

    this.game.world.addComponent(id, 'position', {
      tileX: tx, tileY: ty,
      pixelX: tx * TILE_SIZE, pixelY: ty * TILE_SIZE,
    });

    this.game.world.addComponent(id, 'building', {
      type: def.type,
      name: def.name,
      category: def.category,
      completed: scaledWork <= 10,
      constructionProgress: scaledWork <= 10 ? 1 : 0,
      constructionWork: scaledWork,
      width: rw,
      height: rh,
      maxWorkers: def.maxWorkers,
      workRadius: def.workRadius,
      assignedWorkers: [],
      costLog: scaledCostLog,
      costStone: scaledCostStone,
      costIron: scaledCostIron,
      materialsDelivered: false,
      isStorage: def.isStorage,
      storageCapacity: def.storageCapacity,
      residents: def.residents,
      rotation: 0,
      doorDef: def.doorDef,
    });

    this.game.world.addComponent(id, 'renderable', {
      sprite: null,
      layer: 5,
      animFrame: 0,
      visible: true,
    });

    // Mark tiles as occupied
    const blocks = def.blocksMovement !== false;
    this.game.tileMap.markOccupied(tx, ty, rw, rh, id, blocks);

    if (blocks) {
      this.game.pathfinder.clearCache();
    }

    // Instant build for cheap buildings
    if (scaledWork <= 10) {
      if (def.isStorage) {
        this.game.world.addComponent(id, 'storage', {
          inventory: new Map<string, number>(),
          capacity: def.storageCapacity || 5000,
        });
      }
      if (scaledCostLog > 0) this.game.removeResource('log', scaledCostLog);
      if (scaledCostStone > 0) this.game.removeResource('stone', scaledCostStone);
      if (scaledCostIron > 0) this.game.removeResource('iron', scaledCostIron);
    }
  }

  private canPlaceBridge(x: number, y: number): boolean {
    const tile = this.game.tileMap.get(x, y);
    if (!tile) return false;
    if (tile.type === TileType.BRIDGE) return false;
    if (tile.occupied) return false;
    return tile.type === TileType.WATER || tile.type === TileType.RIVER;
  }

  private endBridgeDrag(def: typeof BUILDING_DEFS[string]): void {
    const validTiles = this.dragGhosts.filter(g => g.valid);
    if (validTiles.length === 0) return;

    // Exclude completed bridges and in-progress bridge entities
    const tilesToPlace = validTiles.filter(g => {
      const tile = this.game.tileMap.get(g.x, g.y);
      return tile?.type !== TileType.BRIDGE && !tile?.occupied;
    });
    if (tilesToPlace.length === 0) return;

    const totalLogCost = tilesToPlace.length * def.costLog;
    const totalStoneCost = tilesToPlace.length * def.costStone;
    if (this.game.getResource('log') < totalLogCost) return;
    if (this.game.getResource('stone') < totalStoneCost) return;

    // Create a building entity per water tile (workers will construct them from land)
    for (const ghost of tilesToPlace) {
      const tx = ghost.x;
      const ty = ghost.y;
      const id = this.game.world.createEntity();

      this.game.world.addComponent(id, 'position', {
        tileX: tx, tileY: ty,
        pixelX: tx * TILE_SIZE, pixelY: ty * TILE_SIZE,
      });
      this.game.world.addComponent(id, 'building', {
        type: def.type,
        name: def.name,
        category: def.category,
        completed: false,
        constructionProgress: 0,
        constructionWork: def.constructionWork,
        width: 1, height: 1,
        maxWorkers: def.maxWorkers,
        workRadius: def.workRadius,
        assignedWorkers: [],
        costLog: 0, costStone: 0, costIron: 0,
        materialsDelivered: true,
        rotation: 0,
      });
      this.game.world.addComponent(id, 'renderable', {
        sprite: null, layer: 5, animFrame: 0, visible: true,
      });

      // Mark water tile as occupied; bridges don't block movement (water is already unwalkable)
      this.game.tileMap.markOccupied(tx, ty, 1, 1, id, false);
    }

    if (totalLogCost > 0) this.game.removeResource('log', totalLogCost);
    if (totalStoneCost > 0) this.game.removeResource('stone', totalStoneCost);
    this.game.pathfinder.clearCache();
  }

  private computeBridgeDragGhosts(
    mouseX: number, mouseY: number, def: typeof BUILDING_DEFS[string],
  ): Array<{ x: number; y: number; w: number; h: number; valid: boolean }> {
    const isWaterTile = (t: ReturnType<typeof this.game.tileMap.get>) =>
      !!t && (t.type === TileType.WATER || t.type === TileType.RIVER || t.type === TileType.BRIDGE);

    const startTile = this.game.tileMap.get(this.dragStart!.tileX, this.dragStart!.tileY);
    const endTile = this.game.tileMap.get(mouseX, mouseY);
    const startIsLand = !!startTile && !isWaterTile(startTile);
    const endIsLand = !!endTile && !isWaterTile(endTile);

    // Can't show anything useful if drag started in water
    if (!startIsLand) {
      this.dragGhosts = [];
      return [];
    }

    const path = this.computeBridgePath(
      this.dragStart!.tileX, this.dragStart!.tileY,
      mouseX, mouseY,
    );

    // Need at least start + 1 water tile to show anything
    if (path.length < 2) {
      this.dragGhosts = [];
      return [];
    }

    // Water tiles are everything after the start land tile.
    // If end is also land, strip that endpoint too — those are the actual bridge tiles.
    // If end is still water, include it so the preview tracks the cursor.
    const waterTiles = (endIsLand ? path.slice(1, path.length - 1) : path.slice(1))
      .slice(0, BRIDGE_DRAG_MAX_PATH);

    if (waterTiles.length === 0) {
      this.dragGhosts = [];
      return [];
    }

    // L W+ L satisfied only when both endpoints are land
    const patternComplete = startIsLand && endIsLand;

    let newTileCount = 0;
    for (const p of waterTiles) {
      const tile = this.game.tileMap.get(p.x, p.y);
      if (tile && tile.type !== TileType.BRIDGE && !tile.occupied) newTileCount++;
    }
    const canAfford = this.game.getResource('log') >= newTileCount * def.costLog &&
                      this.game.getResource('stone') >= newTileCount * def.costStone;

    const valid = patternComplete && canAfford;

    this.dragGhosts = waterTiles.map(p => ({ x: p.x, y: p.y, w: 1, h: 1, valid }));
    return this.dragGhosts;
  }

  /** A* through water/river tiles (inverse of computeRoadPath) */
  private computeBridgePath(sx: number, sy: number, ex: number, ey: number): Array<{ x: number; y: number }> {
    if (sx === ex && sy === ey) return [{ x: sx, y: sy }];

    const tileMap = this.game.tileMap;
    const maxIter = 2000;

    const width = tileMap.width;
    const toKey = (x: number, y: number) => y * width + x;

    const gScore = new Map<number, number>();
    const parent = new Map<number, number>();
    const closed = new Set<number>();

    const open: Array<{ x: number; y: number; f: number }> = [];
    const heuristic = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);

    const startKey = toKey(sx, sy);
    gScore.set(startKey, 0);
    open.push({ x: sx, y: sy, f: heuristic(sx, sy) });

    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];

    let iterations = 0;

    while (open.length > 0 && iterations < maxIter) {
      iterations++;

      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open[bestIdx];
      open[bestIdx] = open[open.length - 1];
      open.pop();

      const ck = toKey(current.x, current.y);
      if (closed.has(ck)) continue;
      closed.add(ck);

      if (current.x === ex && current.y === ey) {
        const path: Array<{ x: number; y: number }> = [];
        let key = ck;
        while (key !== undefined) {
          const py = Math.floor(key / width);
          const px = key % width;
          path.push({ x: px, y: py });
          const p = parent.get(key);
          if (p === undefined) break;
          key = p;
        }
        path.reverse();
        return path;
      }

      const cg = gScore.get(ck)!;

      for (let d = 0; d < 4; d++) {
        const nx = current.x + DX[d];
        const ny = current.y + DY[d];

        if (!tileMap.inBounds(nx, ny)) continue;

        const nk = toKey(nx, ny);
        if (closed.has(nk)) continue;

        const tile = tileMap.get(nx, ny)!;
        // Allow the goal tile (land endpoint) through; intermediate tiles must be water/river/bridge
        const isGoal = nx === ex && ny === ey;
        if (!isGoal && tile.type !== TileType.WATER && tile.type !== TileType.RIVER && tile.type !== TileType.BRIDGE) continue;

        const ng = cg + 1;
        const prevG = gScore.get(nk);
        if (prevG !== undefined && ng >= prevG) continue;

        gScore.set(nk, ng);
        parent.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + heuristic(nx, ny) });
      }
    }

    return [];
  }

  cancelDrag(): void {
    // Mark as cancelled so the pending mouseup doesn't trigger tryPlace
    if (this.dragging) this.dragCancelled = true;
    this.dragStart = null;
    this.dragging = false;
    this.dragGhosts = [];
  }

  tryPlace(screenX: number, screenY: number): void {
    const placingType = this.game.state.placingBuilding;
    if (!placingType) return;

    // If this is a drag-type building and we're in a drag, don't single-place
    if (this.isDragType(placingType) && this.dragging) return;

    const def = BUILDING_DEFS[placingType];
    if (!def) return;

    // Upgrade-only buildings (upgradeFrom set, no construction work) cannot be placed directly
    if (def.upgradeFrom && def.constructionWork === 0) return;

    const rotation = this.game.state.placingRotation;
    const { w: rw, h: rh } = getRotatedDims(def.width, def.height, rotation);

    const tile = this.game.camera.screenToTile(screenX, screenY);
    const tx = tile.x - Math.floor(rw / 2);
    const ty = tile.y - Math.floor(rh / 2);

    // Check affordability
    if (this.game.getResource('log') < def.costLog) return;
    if (this.game.getResource('stone') < def.costStone) return;
    if (this.game.getResource('iron') < def.costIron) return;

    // Roads are special: just convert the tile type, no building entity
    if (placingType === BuildingType.ROAD) {
      this.placeRoad(tx, ty, def);
      return;
    }

    // Compute rotated door first (needed for placement validation)
    let rotatedDoor: DoorDef | undefined;
    if (def.doorDef) {
      rotatedDoor = getRotatedDoor(def.doorDef, def.width, def.height, rotation);
    }

    if (!this.canPlace(tx, ty, rw, rh, def, rotatedDoor)) return;

    // Create building entity
    const id = this.game.world.createEntity();

    this.game.world.addComponent(id, 'position', {
      tileX: tx, tileY: ty,
      pixelX: tx * TILE_SIZE, pixelY: ty * TILE_SIZE,
    });

    this.game.world.addComponent(id, 'building', {
      type: def.type,
      name: def.name,
      category: def.category,
      completed: def.constructionWork <= 10,
      constructionProgress: def.constructionWork <= 10 ? 1 : 0,
      constructionWork: def.constructionWork,
      width: rw,
      height: rh,
      maxWorkers: def.maxWorkers,
      workRadius: def.workRadius,
      assignedWorkers: [],
      costLog: def.costLog,
      costStone: def.costStone,
      costIron: def.costIron,
      materialsDelivered: false,
      isStorage: def.isStorage,
      storageCapacity: def.storageCapacity,
      residents: def.residents,
      rotation,
      doorDef: rotatedDoor,
    });

    this.game.world.addComponent(id, 'renderable', {
      sprite: null,
      layer: 5,
      animFrame: 0,
      visible: true,
    });

    // Mark tiles as occupied
    const blocks = def.blocksMovement !== false;
    this.game.tileMap.markOccupied(tx, ty, rw, rh, id, blocks);

    // Clear pathfinding cache when a blocking building is placed
    if (blocks) {
      this.game.pathfinder.clearCache();
    }

    // If instant build (stockpile), initialize immediately
    if (def.constructionWork <= 10) {
      if (def.isStorage) {
        this.game.world.addComponent(id, 'storage', {
          inventory: new Map<string, number>(),
          capacity: def.storageCapacity || 5000,
        });
      }

      if (def.costLog > 0) this.game.removeResource('log', def.costLog);
      if (def.costStone > 0) this.game.removeResource('stone', def.costStone);
      if (def.costIron > 0) this.game.removeResource('iron', def.costIron);
    }
  }

  private placeRoad(x: number, y: number, def: typeof BUILDING_DEFS[string]): void {
    if (!this.game.tileMap.placeRoad(x, y)) return;

    // Deduct cost
    if (def.costLog > 0) this.game.removeResource('log', def.costLog);
    if (def.costStone > 0) this.game.removeResource('stone', def.costStone);

    // Clear pathfinding cache since road costs changed
    this.game.pathfinder.clearCache();
  }

  private canPlace(x: number, y: number, w: number, h: number, def: typeof BUILDING_DEFS[string], doorDef?: DoorDef): boolean {
    if (!this.game.tileMap.isAreaBuildable(x, y, w, h)) return false;

    if (def.requiresWater) {
      if (!this.game.tileMap.hasAdjacentWater(x, y, w, h)) return false;
    }

    // Check that the building's own entry tile is accessible (walkable — roads are OK, buildings are not)
    if (doorDef) {
      const entry = getDoorEntryTile(x, y, doorDef);
      if (!this.game.tileMap.isWalkable(entry.x, entry.y)) return false;
    }

    // Check that this building's footprint doesn't cover another building's door entry tile
    if (!this.isAreaFreeOfDoorEntries(x, y, w, h)) return false;

    return true;
  }

  /** Returns false if placing a building at (x,y,w,h) would cover any existing building's door entry tile */
  private isAreaFreeOfDoorEntries(x: number, y: number, w: number, h: number): boolean {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return true;
    const positions = this.game.world.getComponentStore<any>('position');
    if (!positions) return true;

    for (const [buildId, bld] of buildings) {
      if (!bld.doorDef) continue;
      const pos = positions.get(buildId);
      if (!pos) continue;
      const entry = getDoorEntryTile(pos.tileX, pos.tileY, bld.doorDef);
      if (entry.x >= x && entry.x < x + w && entry.y >= y && entry.y < y + h) {
        return false;
      }
    }
    return true;
  }

  /** Returns true if the tile is non-water land with at least one adjacent water/river tile */
  private isLandAdjacentToWater(x: number, y: number): boolean {
    const tile = this.game.tileMap.get(x, y);
    if (!tile) return false;
    if (tile.type === TileType.WATER || tile.type === TileType.RIVER || tile.type === TileType.BRIDGE) return false;
    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];
    for (let d = 0; d < 4; d++) {
      const adj = this.game.tileMap.get(x + DX[d], y + DY[d]);
      if (adj && (adj.type === TileType.WATER || adj.type === TileType.RIVER)) return true;
    }
    return false;
  }

  /** Check if a single tile can have a road placed on it */
  private canPlaceRoad(x: number, y: number): boolean {
    const tile = this.game.tileMap.get(x, y);
    if (!tile) return false;
    if (tile.type === TileType.ROAD || tile.type === TileType.BRIDGE || tile.type === TileType.FOREST) return false;
    return !tile.occupied && this.game.tileMap.isWalkable(x, y);
  }

  /** Check if a single tile can have a stone road placed on it (also valid on existing dirt roads) */
  private canPlaceStoneRoad(x: number, y: number): boolean {
    const tile = this.game.tileMap.get(x, y);
    if (!tile) return false;
    // Already a stone road or a bridge — can't place
    if (tile.type === TileType.STONE_ROAD || tile.type === TileType.BRIDGE || tile.type === TileType.FOREST) return false;
    // Upgrading an existing dirt road — always valid
    if (tile.type === TileType.ROAD) return !tile.occupied;
    // New tile — must be empty and walkable
    return !tile.occupied && this.game.tileMap.isWalkable(x, y);
  }

  /** Lightweight 4-directional A* for road drag path */
  private computeRoadPath(sx: number, sy: number, ex: number, ey: number): Array<{ x: number; y: number }> {
    // Same tile
    if (sx === ex && sy === ey) return [{ x: sx, y: sy }];

    const tileMap = this.game.tileMap;
    const maxIter = 2000;

    // Simple open/closed sets using flat index
    const width = tileMap.width;
    const toKey = (x: number, y: number) => y * width + x;

    const gScore = new Map<number, number>();
    const parent = new Map<number, number>();
    const closed = new Set<number>();

    // Binary heap (min-heap) for open set
    const open: Array<{ x: number; y: number; f: number }> = [];

    const heuristic = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);

    const startKey = toKey(sx, sy);
    gScore.set(startKey, 0);
    open.push({ x: sx, y: sy, f: heuristic(sx, sy) });

    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];

    let iterations = 0;

    while (open.length > 0 && iterations < maxIter) {
      iterations++;

      // Find minimum f in open (simple linear scan — good enough for path length <= 80)
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open[bestIdx];
      open[bestIdx] = open[open.length - 1];
      open.pop();

      const ck = toKey(current.x, current.y);
      if (closed.has(ck)) continue;
      closed.add(ck);

      // Goal reached
      if (current.x === ex && current.y === ey) {
        // Reconstruct path
        const path: Array<{ x: number; y: number }> = [];
        let key = ck;
        while (key !== undefined) {
          const py = Math.floor(key / width);
          const px = key % width;
          path.push({ x: px, y: py });
          const p = parent.get(key);
          if (p === undefined) break;
          key = p;
        }
        path.reverse();
        return path;
      }

      const cg = gScore.get(ck)!;

      for (let d = 0; d < 4; d++) {
        const nx = current.x + DX[d];
        const ny = current.y + DY[d];

        if (!tileMap.inBounds(nx, ny)) continue;

        const nk = toKey(nx, ny);
        if (closed.has(nk)) continue;

        // Check passability: in bounds, road-eligible terrain, not blocked by building
        const tile = tileMap.get(nx, ny)!;
        if (
          tile.type === TileType.WATER ||
          tile.type === TileType.RIVER ||
          tile.type === TileType.FOREST ||
          tile.type === TileType.STONE ||
          tile.type === TileType.IRON
        ) continue;
        if (tile.occupied && tile.type !== TileType.ROAD && tile.type !== TileType.STONE_ROAD) continue;
        if (tile.blocksMovement) continue;

        const ng = cg + 1;
        const prevG = gScore.get(nk);
        if (prevG !== undefined && ng >= prevG) continue;

        gScore.set(nk, ng);
        parent.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + heuristic(nx, ny) });
      }
    }

    // No path found — return empty
    return [];
  }

  getGhostData(): Array<{ x: number; y: number; w: number; h: number; valid: boolean; doorDef?: DoorDef; entryTile?: { x: number; y: number } }> {
    const placingType = this.game.state.placingBuilding;
    if (!placingType) return [];

    const def = BUILDING_DEFS[placingType];
    if (!def) return [];

    const input = this.game.input;
    const tile = this.game.camera.screenToTile(input.mouseX, input.mouseY);

    // Dragging mode — compute drag ghosts
    if (this.dragging && this.dragStart) {
      if (placingType === BuildingType.ROAD) {
        return this.computeRoadDragGhosts(tile.x, tile.y, def);
      } else if (placingType === BuildingType.STONE_ROAD) {
        return this.computeStoneRoadDragGhosts(tile.x, tile.y, def);
      } else if (placingType === BuildingType.BRIDGE) {
        return this.computeBridgeDragGhosts(tile.x, tile.y, def);
      } else if (def.flexible) {
        return this.computeFlexibleDragGhosts(tile.x, tile.y, def);
      }
    }

    // For flexible buildings (not dragging), show a 1x1 cursor tile
    if (def.flexible) {
      const t = this.game.tileMap.get(tile.x, tile.y);
      const valid = !!t && this.game.tileMap.isBuildable(tile.x, tile.y);
      return [{ x: tile.x, y: tile.y, w: 1, h: 1, valid }];
    }

    // Normal single-tile hover preview
    const rotation = this.game.state.placingRotation;
    const { w: rw, h: rh } = getRotatedDims(def.width, def.height, rotation);

    const tx = tile.x - Math.floor(rw / 2);
    const ty = tile.y - Math.floor(rh / 2);

    // Compute doorDef first — needed for placement validation and entry tile rendering
    let doorDef: DoorDef | undefined;
    if (def.doorDef) {
      doorDef = getRotatedDoor(def.doorDef, def.width, def.height, rotation);
    }

    let valid: boolean;
    if (placingType === BuildingType.ROAD) {
      const t = this.game.tileMap.get(tx, ty);
      valid = !!t && this.canPlaceRoad(tx, ty) &&
        this.game.getResource('log') >= def.costLog &&
        this.game.getResource('stone') >= def.costStone;
    } else if (placingType === BuildingType.STONE_ROAD) {
      valid = this.canPlaceStoneRoad(tx, ty) &&
        this.game.getResource('stone') >= def.costStone;
    } else if (placingType === BuildingType.BRIDGE) {
      valid = this.isLandAdjacentToWater(tile.x, tile.y);
    } else {
      valid = this.canPlace(tx, ty, rw, rh, def, doorDef) &&
        this.game.getResource('log') >= def.costLog &&
        this.game.getResource('stone') >= def.costStone &&
        this.game.getResource('iron') >= def.costIron;
    }

    let entryTile: { x: number; y: number } | undefined;
    if (doorDef) {
      entryTile = getDoorEntryTile(tx, ty, doorDef);
    }

    return [{ x: tx, y: ty, w: rw, h: rh, valid, doorDef, entryTile }];
  }

  private computeRoadDragGhosts(
    mouseX: number, mouseY: number, def: typeof BUILDING_DEFS[string],
  ): Array<{ x: number; y: number; w: number; h: number; valid: boolean }> {
    const path = this.computeRoadPath(
      this.dragStart!.tileX, this.dragStart!.tileY,
      mouseX, mouseY,
    );

    // Clamp to max path length
    const clamped = path.slice(0, ROAD_DRAG_MAX_PATH);

    // Count how many tiles can actually receive new road placement
    let newTileCount = 0;
    for (const p of clamped) {
      if (this.canPlaceRoad(p.x, p.y)) newTileCount++;
    }

    const totalLogCost = newTileCount * def.costLog;
    const totalStoneCost = newTileCount * def.costStone;
    const canAfford = this.game.getResource('log') >= totalLogCost &&
                      this.game.getResource('stone') >= totalStoneCost;

    this.dragGhosts = clamped.map(p => {
      const tile = this.game.tileMap.get(p.x, p.y);
      const isAlreadyRoad = tile?.type === TileType.ROAD;
      // Valid if this tile already has a road, or can accept one now.
      const valid = (isAlreadyRoad || this.canPlaceRoad(p.x, p.y)) && canAfford;
      return { x: p.x, y: p.y, w: 1, h: 1, valid };
    });

    return this.dragGhosts;
  }

  private computeStoneRoadDragGhosts(
    mouseX: number, mouseY: number, def: typeof BUILDING_DEFS[string],
  ): Array<{ x: number; y: number; w: number; h: number; valid: boolean }> {
    const path = this.computeRoadPath(
      this.dragStart!.tileX, this.dragStart!.tileY,
      mouseX, mouseY,
    );

    const clamped = path.slice(0, ROAD_DRAG_MAX_PATH);

    // Count new tiles (not already STONE_ROAD, not occupied by something else)
    let newTileCount = 0;
    for (const p of clamped) {
      if (this.canPlaceStoneRoad(p.x, p.y)) newTileCount++;
    }

    const totalStoneCost = newTileCount * def.costStone;
    const canAfford = this.game.getResource('stone') >= totalStoneCost;

    this.dragGhosts = clamped.map(p => {
      const tile = this.game.tileMap.get(p.x, p.y);
      const isAlreadyStoneRoad = tile?.type === TileType.STONE_ROAD;
      const valid = (isAlreadyStoneRoad || this.canPlaceStoneRoad(p.x, p.y)) && canAfford;
      return { x: p.x, y: p.y, w: 1, h: 1, valid };
    });

    return this.dragGhosts;
  }

  private computeFlexibleDragGhosts(
    mouseX: number, mouseY: number, def: typeof BUILDING_DEFS[string],
  ): Array<{ x: number; y: number; w: number; h: number; valid: boolean }> {
    const sx = this.dragStart!.tileX;
    const sy = this.dragStart!.tileY;

    // Compute rectangle from drag start to mouse position
    const minX = Math.min(sx, mouseX);
    const minY = Math.min(sy, mouseY);
    const maxX = Math.max(sx, mouseX);
    const maxY = Math.max(sy, mouseY);

    // Raw dimensions from the drag (no minimum clamp — show as invalid if too small)
    const maxW = def.maxWidth ?? FLEXIBLE_MAX_SIZE;
    const maxH = def.maxHeight ?? FLEXIBLE_MAX_SIZE;
    const rawW = Math.min(maxW, maxX - minX + 1);
    const rawH = Math.min(maxH, maxY - minY + 1);

    // Anchor: expand from the drag start corner towards the mouse direction
    const tx = mouseX >= sx ? sx : sx - rawW + 1;
    const ty = mouseY >= sy ? sy : sy - rawH + 1;

    // Check minimum size requirement
    const minW = def.minWidth ?? FLEXIBLE_MIN_SIZE;
    const minH = def.minHeight ?? FLEXIBLE_MIN_SIZE;
    const meetsMinSize = rawW >= minW && rawH >= minH;

    // Check if area is buildable
    const buildable = this.game.tileMap.isAreaBuildable(tx, ty, rawW, rawH);

    // Scale cost
    const defaultArea = def.width * def.height;
    const draggedArea = rawW * rawH;
    const scale = draggedArea / defaultArea;
    const scaledCostLog = Math.ceil(def.costLog * scale);
    const scaledCostStone = Math.ceil(def.costStone * scale);
    const scaledCostIron = Math.ceil(def.costIron * scale);

    const canAfford = this.game.getResource('log') >= scaledCostLog &&
                      this.game.getResource('stone') >= scaledCostStone &&
                      this.game.getResource('iron') >= scaledCostIron;

    const valid = meetsMinSize && buildable && canAfford;

    this.dragGhosts = [{ x: tx, y: ty, w: rawW, h: rawH, valid }];
    return this.dragGhosts;
  }
}
