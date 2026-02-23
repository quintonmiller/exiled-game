import { Random } from '../core/Random';
import { TileMap } from './TileMap';
import {
  TileType, FOREST_DENSITY, STONE_DEPOSIT_CHANCE, IRON_DEPOSIT_CHANCE,
  RIVER_MIN_WIDTH, RIVER_MAX_WIDTH, STONE_DEPOSIT_AMOUNT, IRON_DEPOSIT_AMOUNT,
  ELEVATION_NOISE_SCALE, MOISTURE_NOISE_SCALE, FOREST_NOISE_SCALE,
  WATER_ELEVATION_THRESHOLD, FOREST_ELEVATION_MIN, FERTILE_MOISTURE_THRESHOLD,
  STONE_ELEVATION_THRESHOLD, START_AREA_RADIUS, START_LOCATION_SEARCH_RADIUS,
  BERRY_FOREST_CHANCE, BERRY_FERTILE_CHANCE, MUSHROOM_FOREST_CHANCE,
  HERB_CHANCE, HERB_MIN_MOISTURE, FISH_WATER_CHANCE,
  WILDLIFE_FOREST_CHANCE, WILDLIFE_GRASS_CHANCE, MAX_TREE_DENSITY,
} from '../constants';

type EdgeName = 'top' | 'right' | 'bottom' | 'left';
interface MapPoint { x: number; y: number; }
interface SearchNode { x: number; y: number; g: number; f: number; }

/** Simple 2D noise using value noise with interpolation */
class SimplexNoise2D {
  private perm: number[];

  constructor(private rng: Random) {
    this.perm = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    rng.shuffle(p);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : -x;
    const v = h === 0 || h === 3 ? y : -y;
    return u + v;
  }

  noise(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v,
    );
  }

  /** Multi-octave fractal noise */
  fbm(x: number, y: number, octaves: number = 4, lacunarity: number = 2, gain: number = 0.5): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      sum += this.noise(x * freq, y * freq) * amp;
      maxAmp += amp;
      amp *= gain;
      freq *= lacunarity;
    }

    return (sum / maxAmp + 1) * 0.5; // normalize to 0-1
  }
}

export class MapGenerator {
  generate(tileMap: TileMap, seed: number): void {
    const rng = new Random(seed);
    const elevationNoise = new SimplexNoise2D(rng);
    const moistureNoise = new SimplexNoise2D(rng);
    const forestNoise = new SimplexNoise2D(rng);

    const w = tileMap.width;
    const h = tileMap.height;

    // Generate elevation and moisture
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const elev = elevationNoise.fbm(x / ELEVATION_NOISE_SCALE, y / ELEVATION_NOISE_SCALE, 5);
        const moisture = moistureNoise.fbm(x / MOISTURE_NOISE_SCALE, y / MOISTURE_NOISE_SCALE, 3);
        const forestVal = forestNoise.fbm(x / FOREST_NOISE_SCALE, y / FOREST_NOISE_SCALE, 3);

        tileMap.set(x, y, { elevation: elev, fertility: moisture });

        // Low elevation = water
        if (elev < WATER_ELEVATION_THRESHOLD) {
          tileMap.set(x, y, { type: TileType.WATER });
        }
        // Forest based on combined noise
        else if (forestVal > (1 - FOREST_DENSITY) && elev > FOREST_ELEVATION_MIN) {
          const trees = Math.floor(forestVal * MAX_TREE_DENSITY) + 1;
          tileMap.set(x, y, { type: TileType.FOREST, trees: Math.min(trees, MAX_TREE_DENSITY) });
        }
        // Fertile grassland
        else if (moisture > FERTILE_MOISTURE_THRESHOLD && elev > FOREST_ELEVATION_MIN) {
          tileMap.set(x, y, { type: TileType.FERTILE, fertility: moisture });
        }
        // Regular grass
        else if (elev >= WATER_ELEVATION_THRESHOLD) {
          tileMap.set(x, y, { type: TileType.GRASS });
        }
      }
    }

    // Carve river
    this.carveRiver(tileMap, rng);

    // Place stone deposits
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = tileMap.get(x, y)!;
        if (tile.type === TileType.GRASS && tile.elevation > STONE_ELEVATION_THRESHOLD) {
          if (rng.chance(STONE_DEPOSIT_CHANCE)) {
            tileMap.set(x, y, { type: TileType.STONE, stoneAmount: STONE_DEPOSIT_AMOUNT });
          } else if (rng.chance(IRON_DEPOSIT_CHANCE)) {
            tileMap.set(x, y, { type: TileType.IRON, ironAmount: IRON_DEPOSIT_AMOUNT });
          }
        }
      }
    }

    // Scatter harvestable resources on tiles
    this.scatterResources(tileMap, rng);

    // Clear starting area
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    for (let dy = -START_AREA_RADIUS; dy <= START_AREA_RADIUS; dy++) {
      for (let dx = -START_AREA_RADIUS; dx <= START_AREA_RADIUS; dx++) {
        const tile = tileMap.get(cx + dx, cy + dy);
        if (tile && tile.type !== TileType.WATER && tile.type !== TileType.RIVER) {
          tileMap.set(cx + dx, cy + dy, {
            type: TileType.GRASS, trees: 0, fertility: 0.5,
            berries: 0, mushrooms: 0, herbs: 0, fish: 0, wildlife: 0,
          });
        }
      }
    }

    // Add an off-map trade corridor so players can connect roads organically.
    this.carveTradeRoad(tileMap, rng);
  }

  private scatterResources(tileMap: TileMap, rng: Random): void {
    const w = tileMap.width;
    const h = tileMap.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = tileMap.get(x, y)!;

        // Berries: sparse early spring — lifecycle will grow them through spring/summer
        if (tile.type === TileType.FOREST && rng.chance(BERRY_FOREST_CHANCE)) {
          tile.berries = rng.int(1, 3);
        } else if (tile.type === TileType.FERTILE && rng.chance(BERRY_FERTILE_CHANCE)) {
          tile.berries = rng.int(1, 2);
        }

        // Mushrooms: start sparse; lifecycle decays them in spring (bloomStart=5.5)
        // and naturally rebuilds them in autumn — this gives correct early-game state
        if (tile.type === TileType.FOREST && rng.chance(MUSHROOM_FOREST_CHANCE)) {
          tile.mushrooms = rng.int(1, 2);
        }

        // Herbs: start sparse; lifecycle decays them in early spring and regrows mid-spring
        if ((tile.type === TileType.FOREST || tile.type === TileType.GRASS || tile.type === TileType.FERTILE)
            && tile.fertility > HERB_MIN_MOISTURE && rng.chance(HERB_CHANCE)) {
          tile.herbs = rng.int(1, 2);
        }

        // Fish: slightly below old values — lifecycle builds through spring/summer
        if ((tile.type === TileType.WATER || tile.type === TileType.RIVER) && rng.chance(FISH_WATER_CHANCE)) {
          tile.fish = rng.int(2, 5);
        }

        // Wildlife: low spring baseline — lifecycle grows toward summer peak
        if (tile.type === TileType.FOREST && rng.chance(WILDLIFE_FOREST_CHANCE)) {
          tile.wildlife = rng.int(1, 2);
        } else if (tile.type === TileType.GRASS && rng.chance(WILDLIFE_GRASS_CHANCE)) {
          tile.wildlife = rng.int(1, 2);
        }
      }
    }
  }

  private carveRiver(tileMap: TileMap, rng: Random): void {
    const w = tileMap.width;
    const h = tileMap.height;
    const margin = Math.max(4, Math.floor(Math.min(w, h) * 0.06));

    // Bias toward top→bottom (natural gravity flow); occasionally use other edge pairs.
    let fromEdge: EdgeName;
    let toEdge: EdgeName;
    if (rng.chance(0.7)) {
      fromEdge = 'top';
      toEdge = 'bottom';
    } else {
      [fromEdge, toEdge] = this.pickDistinctEdgePair(rng);
    }

    const start = this.pickPointOnEdge(fromEdge, w, h, margin, rng);
    const end = this.pickPointOnEdge(toEdge, w, h, margin, rng);

    let path = this.findRiverRoute(tileMap, start, end, rng);

    // Fallback: force top→bottom with centre-ish start if routing failed.
    if (!path) {
      const fbStart = { x: rng.int(margin, w - margin), y: 0 };
      const fbEnd = { x: rng.int(margin, w - margin), y: h - 1 };
      path = this.findRiverRoute(tileMap, fbStart, fbEnd, rng);
    }

    // Last resort: old simple random-walk method.
    if (!path || path.length === 0) {
      this.carveSimpleRiverFallback(tileMap, rng);
      return;
    }

    // Generate a variable width profile along the path length.
    const widths = this.generateRiverWidthProfile(path.length, rng);

    // Carve river tiles — width is applied perpendicular to the direction of travel.
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const halfWidth = Math.floor(widths[i] / 2);

      // Direction of travel at this step.
      let dx = 0;
      let dy = 0;
      if (i < path.length - 1) {
        dx = path[i + 1].x - p.x;
        dy = path[i + 1].y - p.y;
      } else if (i > 0) {
        dx = p.x - path[i - 1].x;
        dy = p.y - path[i - 1].y;
      }

      // Perpendicular vector.
      const perpX = -dy;
      const perpY = dx;

      for (let d = -halfWidth; d <= halfWidth; d++) {
        const cx = p.x + perpX * d;
        const cy = p.y + perpY * d;
        if (tileMap.inBounds(cx, cy)) {
          tileMap.set(cx, cy, { type: TileType.RIVER, trees: 0 });
        }
      }
    }
  }

  /**
   * A* river routing: strongly prefers low-elevation tiles (valleys) and
   * existing water.  No tile type is fully blocked — rivers carve through
   * everything — but highlands are expensive.
   */
  private findRiverRoute(tileMap: TileMap, from: MapPoint, to: MapPoint, rng: Random): MapPoint[] | null {
    const startKey = this.pointKey(from.x, from.y);
    const goalKey = this.pointKey(to.x, to.y);

    if (!tileMap.inBounds(from.x, from.y) || !tileMap.inBounds(to.x, to.y)) return null;

    const open: SearchNode[] = [{ x: from.x, y: from.y, g: 0, f: this.manhattan(from, to) }];
    const gScore = new Map<string, number>([[startKey, 0]]);
    const cameFrom = new Map<string, string>();
    const closed = new Set<string>();
    const noiseSeed = rng.int(0, 0x7fffffff);
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    let safety = 0;
    const maxSteps = tileMap.width * tileMap.height;

    while (open.length > 0 && safety < maxSteps) {
      safety++;

      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open.splice(bestIdx, 1)[0];
      const currentKey = this.pointKey(current.x, current.y);
      if (closed.has(currentKey)) continue;
      closed.add(currentKey);

      if (currentKey === goalKey) {
        const route: MapPoint[] = [];
        let cursor = goalKey;
        while (cursor !== startKey) {
          route.push(this.parsePointKey(cursor));
          const prev = cameFrom.get(cursor);
          if (!prev) return null;
          cursor = prev;
        }
        route.push({ x: from.x, y: from.y });
        route.reverse();
        return route;
      }

      const shuffled = [...dirs];
      rng.shuffle(shuffled);
      for (const d of shuffled) {
        const nx = current.x + d.x;
        const ny = current.y + d.y;
        if (!tileMap.inBounds(nx, ny)) continue;

        const nKey = this.pointKey(nx, ny);
        if (closed.has(nKey)) continue;

        const tile = tileMap.get(nx, ny);
        if (!tile) continue;

        // Rivers prefer low elevation; existing water is the cheapest path.
        const elev = tile.elevation ?? 0.5;
        const baseCost = tile.type === TileType.WATER ? 0.4 : (0.5 + elev * 1.5);

        // Lighter turn penalty than roads — rivers naturally meander.
        let turnPenalty = 0;
        const prevKey = cameFrom.get(currentKey);
        if (prevKey) {
          const prev = this.parsePointKey(prevKey);
          if ((current.x - prev.x) !== d.x || (current.y - prev.y) !== d.y) turnPenalty = 0.015;
        }

        // Higher noise than roads for more organic, winding courses.
        const noiseCost = this.pathNoise(nx, ny, noiseSeed) * 0.35;
        const tentativeG = current.g + baseCost + turnPenalty + noiseCost;
        const knownG = gScore.get(nKey);
        if (knownG !== undefined && tentativeG >= knownG) continue;

        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, currentKey);

        const f = tentativeG + this.manhattan({ x: nx, y: ny }, to) * 1.01;
        open.push({ x: nx, y: ny, g: tentativeG, f });
      }
    }

    return null;
  }

  /**
   * Build a per-tile width array using a mean-reverting random walk so width
   * varies smoothly from tile to tile within [RIVER_MIN_WIDTH, RIVER_MAX_WIDTH].
   */
  private generateRiverWidthProfile(length: number, rng: Random): number[] {
    const widths: number[] = [];
    const midWidth = (RIVER_MIN_WIDTH + RIVER_MAX_WIDTH) / 2;
    // Start somewhere in the lower half of the range.
    let w = RIVER_MIN_WIDTH + rng.next() * (midWidth - RIVER_MIN_WIDTH);

    for (let i = 0; i < length; i++) {
      widths.push(Math.round(w));
      // Drift slowly toward the midpoint with random noise.
      const drift = (midWidth - w) * 0.04 + (rng.next() - 0.5) * 0.7;
      w = Math.max(RIVER_MIN_WIDTH, Math.min(RIVER_MAX_WIDTH, w + drift));
    }
    return widths;
  }

  /** Simple top-to-bottom random-walk fallback (original algorithm). */
  private carveSimpleRiverFallback(tileMap: TileMap, rng: Random): void {
    const w = tileMap.width;
    const h = tileMap.height;
    let rx = Math.floor(w * 0.3) + rng.int(-20, 20);
    const halfWidth = 1;

    for (let y = 0; y < h; y++) {
      rx += rng.int(-1, 1);
      rx = Math.max(halfWidth + 1, Math.min(w - halfWidth - 2, rx));
      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const x = rx + dx;
        if (x >= 0 && x < w) tileMap.set(x, y, { type: TileType.RIVER, trees: 0 });
      }
    }
  }

  /** Carve a pre-existing trade corridor using efficient terrain-aware routing. */
  private carveTradeRoad(tileMap: TileMap, rng: Random): void {
    const w = tileMap.width;
    const h = tileMap.height;

    const setRoad = (x: number, y: number) => {
      if (!tileMap.inBounds(x, y)) return;
      const current = tileMap.get(x, y);
      if (!current || current.type === TileType.WATER || current.type === TileType.RIVER) return;
      tileMap.set(x, y, {
        type: TileType.ROAD,
        trees: 0,
        occupied: false,
        buildingId: null,
        blocksMovement: false,
        stoneAmount: 0,
        ironAmount: 0,
        berries: 0,
        mushrooms: 0,
        herbs: 0,
        fish: 0,
        wildlife: 0,
      });
    };

    const margin = Math.max(8, Math.floor(Math.min(w, h) * 0.08));
    const minRoadLength = Math.floor((w + h) * 0.5);
    const minEndpointDistance = Math.floor((w + h) * 0.3);
    const routeTiles = this.findEfficientTradeRoute(tileMap, rng, margin, minRoadLength, minEndpointDistance);

    if (!routeTiles || routeTiles.length === 0) return;
    for (const p of routeTiles) {
      setRoad(p.x, p.y);
    }
  }

  private findEfficientTradeRoute(
    tileMap: TileMap,
    rng: Random,
    margin: number,
    minRoadLength: number,
    minEndpointDistance: number,
  ): MapPoint[] | null {
    const w = tileMap.width;
    const h = tileMap.height;

    for (let attempt = 0; attempt < 48; attempt++) {
      const [fromEdge, toEdge] = this.pickDistinctEdgePair(rng);
      const start = this.pickPointOnEdge(fromEdge, w, h, margin, rng);
      const end = this.pickPointOnEdge(toEdge, w, h, margin, rng);
      const endpointDist = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
      if (endpointDist < minEndpointDistance) continue;

      const path = this.findWeightedPath(tileMap, start, end, rng);
      if (!path) continue;
      if (path.length < minRoadLength) continue;
      return this.softenLongStraights(path, tileMap, rng);
    }

    // Fallback: try straightforward opposite-edge routes and keep the longest valid one.
    const fallbackPairs: Array<[EdgeName, EdgeName]> = [
      ['top', 'bottom'],
      ['left', 'right'],
      ['top', 'right'],
      ['right', 'bottom'],
      ['bottom', 'left'],
      ['left', 'top'],
    ];
    let best: MapPoint[] | null = null;
    for (const [fromEdge, toEdge] of fallbackPairs) {
      const start = this.pickPointOnEdge(fromEdge, w, h, margin, rng);
      const end = this.pickPointOnEdge(toEdge, w, h, margin, rng);
      const path = this.findWeightedPath(tileMap, start, end, rng);
      if (!path) continue;
      const softened = this.softenLongStraights(path, tileMap, rng);
      if (!best || softened.length > best.length) best = softened;
    }
    return best;
  }

  private pickDistinctEdgePair(rng: Random): [EdgeName, EdgeName] {
    const clockwise: EdgeName[] = ['top', 'right', 'bottom', 'left'];
    const firstIdx = rng.int(0, clockwise.length - 1);
    let secondIdx = rng.int(0, clockwise.length - 1);
    while (secondIdx === firstIdx) {
      secondIdx = rng.int(0, clockwise.length - 1);
    }
    return [clockwise[firstIdx], clockwise[secondIdx]];
  }

  private pickPointOnEdge(edge: EdgeName, w: number, h: number, margin: number, rng: Random): MapPoint {
    switch (edge) {
      case 'top':
        return { x: rng.int(margin, w - margin - 1), y: 0 };
      case 'bottom':
        return { x: rng.int(margin, w - margin - 1), y: h - 1 };
      case 'left':
        return { x: 0, y: rng.int(margin, h - margin - 1) };
      case 'right':
        return { x: w - 1, y: rng.int(margin, h - margin - 1) };
    }
  }

  /**
   * Weighted A* routing:
   * - blocks water/river
   * - heavily discourages forests
   * - lightly penalizes turns to avoid jittery zigzags
   * - tiny deterministic noise to keep routes organic but still efficient
   */
  private findWeightedPath(
    tileMap: TileMap,
    from: MapPoint,
    to: MapPoint,
    rng: Random,
  ): MapPoint[] | null {
    const startKey = this.pointKey(from.x, from.y);
    const goalKey = this.pointKey(to.x, to.y);

    const startTile = tileMap.get(from.x, from.y);
    const goalTile = tileMap.get(to.x, to.y);
    if (!startTile || !goalTile) return null;
    if (startTile.type === TileType.WATER || startTile.type === TileType.RIVER) return null;
    if (goalTile.type === TileType.WATER || goalTile.type === TileType.RIVER) return null;

    const open: SearchNode[] = [{
      x: from.x,
      y: from.y,
      g: 0,
      f: this.manhattan(from, to),
    }];
    const gScore = new Map<string, number>([[startKey, 0]]);
    const cameFrom = new Map<string, string>();
    const closed = new Set<string>();
    const noiseSeed = rng.int(0, 0x7fffffff);
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    let safety = 0;
    const maxSteps = tileMap.width * tileMap.height;
    while (open.length > 0 && safety < maxSteps) {
      safety++;

      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open.splice(bestIdx, 1)[0];
      const currentKey = this.pointKey(current.x, current.y);
      if (closed.has(currentKey)) continue;
      closed.add(currentKey);

      if (currentKey === goalKey) {
        const route: MapPoint[] = [];
        let cursor = goalKey;
        while (cursor !== startKey) {
          route.push(this.parsePointKey(cursor));
          const prev = cameFrom.get(cursor);
          if (!prev) return null;
          cursor = prev;
        }
        route.push({ x: from.x, y: from.y });
        route.reverse();
        return route;
      }

      const shuffled = [...dirs];
      rng.shuffle(shuffled);
      for (const d of shuffled) {
        const nx = current.x + d.x;
        const ny = current.y + d.y;
        if (!tileMap.inBounds(nx, ny)) continue;

        const nKey = this.pointKey(nx, ny);
        if (closed.has(nKey)) continue;

        const tile = tileMap.get(nx, ny);
        if (!tile) continue;
        if (tile.type === TileType.WATER || tile.type === TileType.RIVER) continue;

        let turnPenalty = 0;
        const prevKey = cameFrom.get(currentKey);
        if (prevKey) {
          const prev = this.parsePointKey(prevKey);
          const prevDx = current.x - prev.x;
          const prevDy = current.y - prev.y;
          const nextDx = nx - current.x;
          const nextDy = ny - current.y;
          if (prevDx !== nextDx || prevDy !== nextDy) turnPenalty = 0.04;
        }

        const baseCost = this.terrainTravelCost(tile.type);
        const noiseCost = this.pathNoise(nx, ny, noiseSeed) * 0.2;
        const tentativeG = current.g + baseCost + turnPenalty + noiseCost;
        const knownG = gScore.get(nKey);
        if (knownG !== undefined && tentativeG >= knownG) continue;

        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, currentKey);

        // Slightly weighted heuristic for snappier routing without large detours.
        const f = tentativeG + this.manhattan({ x: nx, y: ny }, to) * 1.02;
        open.push({ x: nx, y: ny, g: tentativeG, f });
      }
    }

    return null;
  }

  private manhattan(a: MapPoint, b: MapPoint): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private pointKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private parsePointKey(key: string): MapPoint {
    const [xs, ys] = key.split(',');
    return { x: parseInt(xs, 10), y: parseInt(ys, 10) };
  }

  private terrainTravelCost(tileType: number): number {
    switch (tileType) {
      case TileType.FOREST:
        return 4.0; // prefer open ground unless forest is a meaningful shortcut
      case TileType.FERTILE:
        return 1.2;
      case TileType.STONE:
      case TileType.IRON:
        return 1.5;
      default:
        return 1.0;
    }
  }

  private pathNoise(x: number, y: number, seed: number): number {
    // Deterministic 2D hash in [0,1].
    let n = (x * 374761393) ^ (y * 668265263) ^ seed;
    n = (n ^ (n >>> 13)) * 1274126177;
    n ^= n >>> 16;
    return (n >>> 0) / 0xffffffff;
  }

  /**
   * Convert overly long straight sections into shallow bends.
   * Keeps route contiguous, avoids water, and avoids self-intersection.
   */
  private softenLongStraights(pathIn: MapPoint[], tileMap: TileMap, rng: Random): MapPoint[] {
    let path = [...pathIn];
    const minRun = 18;
    const minDetour = 6;
    const maxDetours = 3;
    let detoursApplied = 0;
    let i = 0;

    while (i < path.length - 2 && detoursApplied < maxDetours) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      if ((dx !== 0 && dy !== 0) || (dx === 0 && dy === 0)) {
        i++;
        continue;
      }

      let j = i + 1;
      while (j < path.length - 1) {
        const ndx = path[j + 1].x - path[j].x;
        const ndy = path[j + 1].y - path[j].y;
        if (ndx !== dx || ndy !== dy) break;
        j++;
      }

      const runSteps = j - i;
      if (runSteps < minRun) {
        i = j;
        continue;
      }

      const detourStart = i + Math.max(3, Math.floor(runSteps * 0.25));
      const detourEnd = Math.min(j, i + Math.max(detourStart - i + minDetour, Math.floor(runSteps * 0.7)));

      const perpOptions = dx !== 0
        ? [{ x: 0, y: 1 }, { x: 0, y: -1 }]
        : [{ x: 1, y: 0 }, { x: -1, y: 0 }];
      if (rng.chance(0.5)) perpOptions.reverse();

      let replaced = false;
      for (const perp of perpOptions) {
        const candidate: MapPoint[] = [];
        candidate.push({
          x: path[detourStart].x + perp.x,
          y: path[detourStart].y + perp.y,
        });
        for (let t = detourStart + 1; t <= detourEnd; t++) {
          candidate.push({
            x: path[t].x + perp.x,
            y: path[t].y + perp.y,
          });
        }
        candidate.push({ x: path[detourEnd].x, y: path[detourEnd].y });

        if (!this.isValidDetour(candidate, path, detourStart, detourEnd, tileMap)) continue;

        path = [
          ...path.slice(0, detourStart + 1),
          ...candidate,
          ...path.slice(detourEnd + 1),
        ];
        detoursApplied++;
        i = detourEnd + candidate.length;
        replaced = true;
        break;
      }

      if (!replaced) {
        i = j;
      }
    }

    return path;
  }

  private isValidDetour(
    candidate: MapPoint[],
    path: MapPoint[],
    detourStart: number,
    detourEnd: number,
    tileMap: TileMap,
  ): boolean {
    if (candidate.length === 0) return false;

    const blocked = new Set<string>();
    for (let i = 0; i < path.length; i++) {
      if (i >= detourStart && i <= detourEnd) continue;
      blocked.add(this.pointKey(path[i].x, path[i].y));
    }

    // Check candidate tiles are clear and traversable.
    const local = new Set<string>();
    for (const p of candidate) {
      if (!tileMap.inBounds(p.x, p.y)) return false;
      const tile = tileMap.get(p.x, p.y);
      if (!tile) return false;
      if (tile.type === TileType.WATER || tile.type === TileType.RIVER) return false;

      const key = this.pointKey(p.x, p.y);
      if (blocked.has(key) || local.has(key)) return false;
      local.add(key);
    }

    // Check adjacency continuity around the splice.
    const left = path[detourStart];
    const right = path[detourEnd + 1];
    const first = candidate[0];
    const last = candidate[candidate.length - 1];
    if (this.manhattan(left, first) !== 1) return false;
    if (right && this.manhattan(last, right) !== 1) return false;

    // Check candidate internal adjacency.
    for (let i = 1; i < candidate.length; i++) {
      if (this.manhattan(candidate[i - 1], candidate[i]) !== 1) return false;
    }

    return true;
  }

  /** Find a good starting location (near center, on grass) */
  findStartLocation(tileMap: TileMap): { x: number; y: number } {
    const cx = Math.floor(tileMap.width / 2);
    const cy = Math.floor(tileMap.height / 2);

    // Spiral out from center to find walkable ground
    for (let r = 0; r < START_LOCATION_SEARCH_RADIUS; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tile = tileMap.get(cx + dx, cy + dy);
          if (tile && tile.type === TileType.GRASS) {
            return { x: cx + dx, y: cy + dy };
          }
        }
      }
    }
    return { x: cx, y: cy };
  }
}
