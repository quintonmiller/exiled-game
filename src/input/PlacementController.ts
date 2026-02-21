import type { Game } from '../Game';
import { BUILDING_DEFS } from '../data/BuildingDefs';
import { BuildingType, TILE_SIZE, ROAD_DRAG_MAX_PATH, FLEXIBLE_MIN_SIZE, FLEXIBLE_MAX_SIZE } from '../constants';
import type { DoorDef, Rotation } from '../types';
import { getRotatedDims, getRotatedDoor } from '../utils/DoorUtils';

export class PlacementController {
  private game: Game;

  // Drag state
  private dragStart: { tileX: number; tileY: number } | null = null;
  private dragging = false;
  private dragCancelled = false;
  private dragGhosts: Array<{ x: number; y: number; w: number; h: number; valid: boolean; doorDef?: DoorDef }> = [];

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
    } else if (def.flexible) {
      this.endFlexibleDrag(def);
    }

    this.cancelDrag();
  }

  private endRoadDrag(def: typeof BUILDING_DEFS[string]): void {
    // Filter to only valid ghost tiles
    const validTiles = this.dragGhosts.filter(g => g.valid);
    if (validTiles.length === 0) return;

    // Check total cost
    const totalLogCost = validTiles.length * def.costLog;
    const totalStoneCost = validTiles.length * def.costStone;
    if (this.game.getResource('log') < totalLogCost) return;
    if (this.game.getResource('stone') < totalStoneCost) return;

    let placed = 0;
    for (const ghost of validTiles) {
      if (this.game.tileMap.placeRoad(ghost.x, ghost.y)) {
        placed++;
      }
    }

    // Deduct cost for tiles actually placed
    if (placed > 0) {
      if (def.costLog > 0) this.game.removeResource('log', placed * def.costLog);
      if (def.costStone > 0) this.game.removeResource('stone', placed * def.costStone);
      this.game.pathfinder.clearCache();
    }
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

    if (!this.canPlace(tx, ty, rw, rh, def)) return;

    // Compute rotated door
    let rotatedDoor: DoorDef | undefined;
    if (def.doorDef) {
      rotatedDoor = getRotatedDoor(def.doorDef, def.width, def.height, rotation);
    }

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

  private canPlace(x: number, y: number, w: number, h: number, def: typeof BUILDING_DEFS[string]): boolean {
    if (!this.game.tileMap.isAreaBuildable(x, y, w, h)) return false;

    if (def.requiresWater) {
      if (!this.game.tileMap.hasAdjacentWater(x, y, w, h)) return false;
    }

    return true;
  }

  /** Check if a single tile can have a road placed on it */
  private canPlaceRoad(x: number, y: number): boolean {
    const tile = this.game.tileMap.get(x, y);
    if (!tile) return false;
    // Can't place road on water/river
    if (tile.type === 7 /* ROAD */) return false; // already a road
    return this.game.tileMap.isWalkable(x, y);
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

        // Check passability: in bounds, not water/river, not blocked by building
        const tile = tileMap.get(nx, ny)!;
        if (tile.type === 2 /* WATER */ || tile.type === 5 /* RIVER */) continue;
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

  getGhostData(): Array<{ x: number; y: number; w: number; h: number; valid: boolean; doorDef?: DoorDef }> {
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

    let valid: boolean;
    if (placingType === BuildingType.ROAD) {
      const t = this.game.tileMap.get(tx, ty);
      valid = !!t && this.game.tileMap.isWalkable(tx, ty) &&
        this.game.getResource('log') >= def.costLog;
    } else {
      valid = this.canPlace(tx, ty, rw, rh, def) &&
        this.game.getResource('log') >= def.costLog &&
        this.game.getResource('stone') >= def.costStone &&
        this.game.getResource('iron') >= def.costIron;
    }

    let doorDef: DoorDef | undefined;
    if (def.doorDef) {
      doorDef = getRotatedDoor(def.doorDef, def.width, def.height, rotation);
    }

    return [{ x: tx, y: ty, w: rw, h: rh, valid, doorDef }];
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

    // Count how many tiles need to be placed (not already road)
    let newTileCount = 0;
    for (const p of clamped) {
      const tile = this.game.tileMap.get(p.x, p.y);
      if (tile && tile.type !== 7 /* ROAD */) newTileCount++;
    }

    const totalLogCost = newTileCount * def.costLog;
    const totalStoneCost = newTileCount * def.costStone;
    const canAfford = this.game.getResource('log') >= totalLogCost &&
                      this.game.getResource('stone') >= totalStoneCost;

    this.dragGhosts = clamped.map(p => {
      const tile = this.game.tileMap.get(p.x, p.y);
      const isAlreadyRoad = tile?.type === 7; /* ROAD */
      const isWalkable = !!tile && this.game.tileMap.isWalkable(p.x, p.y);
      // Valid if: walkable (or already road) and we can afford the total
      const valid = (isWalkable || isAlreadyRoad) && canAfford;
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
