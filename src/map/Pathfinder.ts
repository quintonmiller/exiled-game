import { TileMap } from './TileMap';
import { PATH_CACHE_SIZE } from '../constants';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

/** Min-heap for A* open set */
class BinaryHeap {
  private data: PathNode[] = [];

  get size(): number {
    return this.data.length;
  }

  push(node: PathNode): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): PathNode | undefined {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f < this.data[parent].f) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private sinkDown(i: number): void {
    const len = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < len && this.data[left].f < this.data[smallest].f) smallest = left;
      if (right < len && this.data[right].f < this.data[smallest].f) smallest = right;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}

export interface PathResult {
  path: Array<{ x: number; y: number }>;
  found: boolean;
}

export class Pathfinder {
  private cache = new Map<string, PathResult>();
  private cacheOrder: string[] = [];

  constructor(private tileMap: TileMap) {}

  private cacheKey(sx: number, sy: number, ex: number, ey: number): string {
    return `${sx},${sy}-${ex},${ey}`;
  }

  findPath(startX: number, startY: number, endX: number, endY: number): PathResult {
    // Same tile
    if (startX === endX && startY === endY) {
      return { path: [{ x: endX, y: endY }], found: true };
    }

    // Check cache
    const key = this.cacheKey(startX, startY, endX, endY);
    const cached = this.cache.get(key);
    if (cached) return cached;

    // If target is not walkable, find nearest walkable neighbor
    if (!this.tileMap.isWalkable(endX, endY)) {
      const nearest = this.findNearestWalkable(endX, endY);
      if (!nearest) return { path: [], found: false };
      endX = nearest.x;
      endY = nearest.y;
    }

    const result = this.astar(startX, startY, endX, endY);

    // Cache result
    this.cache.set(key, result);
    this.cacheOrder.push(key);
    while (this.cacheOrder.length > PATH_CACHE_SIZE) {
      const oldKey = this.cacheOrder.shift()!;
      this.cache.delete(oldKey);
    }

    return result;
  }

  private astar(sx: number, sy: number, ex: number, ey: number): PathResult {
    const open = new BinaryHeap();
    const closed = new Set<number>();
    const mapW = this.tileMap.width;

    const startNode: PathNode = {
      x: sx, y: sy, g: 0,
      h: Math.abs(ex - sx) + Math.abs(ey - sy),
      f: 0, parent: null,
    };
    startNode.f = startNode.h;
    open.push(startNode);

    const gScores = new Map<number, number>();
    gScores.set(sy * mapW + sx, 0);

    const dirs = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
      { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
    ];

    let iterations = 0;
    const maxIterations = 5000;

    while (open.size > 0 && iterations < maxIterations) {
      iterations++;
      const current = open.pop()!;
      const key = current.y * mapW + current.x;

      if (current.x === ex && current.y === ey) {
        return { path: this.reconstructPath(current), found: true };
      }

      if (closed.has(key)) continue;
      closed.add(key);

      for (const dir of dirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (!this.tileMap.isWalkable(nx, ny)) continue;

        const nKey = ny * mapW + nx;
        if (closed.has(nKey)) continue;

        // Diagonal movement check - both adjacent tiles must be walkable
        if (dir.dx !== 0 && dir.dy !== 0) {
          if (!this.tileMap.isWalkable(current.x + dir.dx, current.y) ||
              !this.tileMap.isWalkable(current.x, current.y + dir.dy)) {
            continue;
          }
        }

        const tileCost = this.tileMap.getPathCost(nx, ny);
        const baseCost = (dir.dx !== 0 && dir.dy !== 0) ? 1.414 : 1;
        const moveCost = baseCost * tileCost;
        const g = current.g + moveCost;

        const prevG = gScores.get(nKey);
        if (prevG !== undefined && g >= prevG) continue;

        gScores.set(nKey, g);
        const h = Math.abs(ex - nx) + Math.abs(ey - ny);
        open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
      }
    }

    return { path: [], found: false };
  }

  private reconstructPath(node: PathNode): Array<{ x: number; y: number }> {
    const path: Array<{ x: number; y: number }> = [];
    let current: PathNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }

  private findNearestWalkable(x: number, y: number): { x: number; y: number } | null {
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          if (this.tileMap.isWalkable(x + dx, y + dy)) {
            return { x: x + dx, y: y + dy };
          }
        }
      }
    }
    return null;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheOrder = [];
  }
}
