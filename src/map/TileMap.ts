import { MAP_WIDTH, MAP_HEIGHT, TileType, ROAD_PATH_COST, FOREST_PATH_COST, DEFAULT_PATH_COST, ROAD_SPEED_MULT, FOREST_SPEED_MULT, DEFAULT_SPEED_MULT, TREE_CONSUME_AMOUNT } from '../constants';
import { TileData } from '../types';

export class TileMap {
  readonly width = MAP_WIDTH;
  readonly height = MAP_HEIGHT;
  readonly tiles: TileData[];

  constructor() {
    this.tiles = new Array(MAP_WIDTH * MAP_HEIGHT);
    for (let i = 0; i < this.tiles.length; i++) {
      this.tiles[i] = {
        type: TileType.GRASS,
        trees: 0,
        fertility: 0,
        elevation: 0,
        occupied: false,
        buildingId: null,
        stoneAmount: 0,
        ironAmount: 0,
      };
    }
  }

  idx(x: number, y: number): number {
    return y * this.width + x;
  }

  get(x: number, y: number): TileData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[this.idx(x, y)];
  }

  set(x: number, y: number, data: Partial<TileData>): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    Object.assign(this.tiles[this.idx(x, y)], data);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const tile = this.tiles[this.idx(x, y)];
    return tile.type !== TileType.WATER && tile.type !== TileType.RIVER;
  }

  isBuildable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const tile = this.tiles[this.idx(x, y)];
    return (
      tile.type !== TileType.WATER &&
      tile.type !== TileType.RIVER &&
      !tile.occupied
    );
  }

  isAreaBuildable(startX: number, startY: number, w: number, h: number): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (!this.isBuildable(startX + dx, startY + dy)) return false;
      }
    }
    return true;
  }

  hasAdjacentWater(startX: number, startY: number, w: number, h: number): boolean {
    for (let dx = -1; dx <= w; dx++) {
      for (let dy = -1; dy <= h; dy++) {
        if (dx >= 0 && dx < w && dy >= 0 && dy < h) continue;
        const tile = this.get(startX + dx, startY + dy);
        if (tile && (tile.type === TileType.WATER || tile.type === TileType.RIVER)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Count forest tiles within radius */
  countForestInRadius(cx: number, cy: number, radius: number): number {
    let count = 0;
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const tile = this.get(cx + dx, cy + dy);
        if (tile && tile.type === TileType.FOREST) count++;
      }
    }
    return count;
  }

  /** Consume trees from a random forest tile in radius. Returns true if trees were consumed. */
  consumeTreesInRadius(cx: number, cy: number, radius: number): boolean {
    const r2 = radius * radius;
    const candidates: { x: number; y: number }[] = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        const tile = this.get(tx, ty);
        if (tile && tile.type === TileType.FOREST && tile.trees > 0) {
          candidates.push({ x: tx, y: ty });
        }
      }
    }

    if (candidates.length === 0) return false;

    // Pick a random forest tile (prefer lower density — harvest thin areas first)
    candidates.sort((a, b) => {
      const ta = this.get(a.x, a.y)!;
      const tb = this.get(b.x, b.y)!;
      return ta.trees - tb.trees;
    });
    const target = candidates[0];
    const tile = this.get(target.x, target.y)!;

    tile.trees -= TREE_CONSUME_AMOUNT;
    if (tile.trees <= 0) {
      tile.trees = 0;
      tile.type = TileType.GRASS; // Forest cleared
    }
    return true;
  }

  /** Plant a tree on a grass tile in radius. Returns true if planted. */
  plantTreeInRadius(cx: number, cy: number, radius: number): boolean {
    const r2 = radius * radius;
    const candidates: { x: number; y: number }[] = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        const tile = this.get(tx, ty);
        if (tile && tile.type === TileType.GRASS && !tile.occupied) {
          candidates.push({ x: tx, y: ty });
        }
      }
    }

    if (candidates.length === 0) return false;

    // Pick random grass tile
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const tile = this.get(target.x, target.y)!;
    tile.type = TileType.FOREST;
    tile.trees = 1; // Sapling
    return true;
  }

  /** Grow existing trees one density level in radius */
  growTreesInRadius(cx: number, cy: number, radius: number): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const tile = this.get(cx + dx, cy + dy);
        if (tile && tile.type === TileType.FOREST && tile.trees < 5) {
          tile.trees = Math.min(5, tile.trees + 1);
          return; // Only grow one tree per call
        }
      }
    }
  }

  /** Consume stone from a deposit tile. Returns amount actually consumed. */
  consumeStone(x: number, y: number, amount: number): number {
    const tile = this.get(x, y);
    if (!tile || tile.type !== TileType.STONE) return 0;
    const consumed = Math.min(tile.stoneAmount, amount);
    tile.stoneAmount -= consumed;
    if (tile.stoneAmount <= 0) {
      tile.type = TileType.GRASS; // Deposit exhausted
      tile.stoneAmount = 0;
    }
    return consumed;
  }

  /** Consume iron from a deposit tile. Returns amount actually consumed. */
  consumeIron(x: number, y: number, amount: number): number {
    const tile = this.get(x, y);
    if (!tile || tile.type !== TileType.IRON) return 0;
    const consumed = Math.min(tile.ironAmount, amount);
    tile.ironAmount -= consumed;
    if (tile.ironAmount <= 0) {
      tile.type = TileType.GRASS;
      tile.ironAmount = 0;
    }
    return consumed;
  }

  markOccupied(startX: number, startY: number, w: number, h: number, entityId: number): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(startX + dx, startY + dy, { occupied: true, buildingId: entityId });
      }
    }
  }

  getPathCost(x: number, y: number): number {
    if (!this.inBounds(x, y)) return Infinity;
    const tile = this.tiles[this.idx(x, y)];
    if (tile.type === TileType.ROAD) return ROAD_PATH_COST;
    if (tile.type === TileType.FOREST) return FOREST_PATH_COST;
    return DEFAULT_PATH_COST;
  }

  getSpeedMultiplier(x: number, y: number): number {
    if (!this.inBounds(x, y)) return DEFAULT_SPEED_MULT;
    const tile = this.tiles[this.idx(x, y)];
    if (tile.type === TileType.ROAD) return ROAD_SPEED_MULT;
    if (tile.type === TileType.FOREST) return FOREST_SPEED_MULT;
    return DEFAULT_SPEED_MULT;
  }

  placeRoad(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const tile = this.tiles[this.idx(x, y)];
    if (tile.type === TileType.WATER || tile.type === TileType.RIVER) return false;
    tile.type = TileType.ROAD;
    tile.trees = 0;
    return true;
  }
}
