import { Random } from '../core/Random';
import { TileMap } from './TileMap';
import {
  TileType, FOREST_DENSITY, STONE_DEPOSIT_CHANCE, IRON_DEPOSIT_CHANCE,
  RIVER_WIDTH, STONE_DEPOSIT_AMOUNT, IRON_DEPOSIT_AMOUNT,
  ELEVATION_NOISE_SCALE, MOISTURE_NOISE_SCALE, FOREST_NOISE_SCALE,
  WATER_ELEVATION_THRESHOLD, FOREST_ELEVATION_MIN, FERTILE_MOISTURE_THRESHOLD,
  STONE_ELEVATION_THRESHOLD, START_AREA_RADIUS, RIVER_START_POSITION,
  RIVER_START_OFFSET, START_LOCATION_SEARCH_RADIUS,
  BERRY_FOREST_CHANCE, BERRY_FERTILE_CHANCE, MUSHROOM_FOREST_CHANCE,
  HERB_CHANCE, HERB_MIN_MOISTURE, FISH_WATER_CHANCE,
  WILDLIFE_FOREST_CHANCE, WILDLIFE_GRASS_CHANCE,
} from '../constants';

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
          const trees = Math.floor(forestVal * 5) + 1;
          tileMap.set(x, y, { type: TileType.FOREST, trees: Math.min(trees, 5) });
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
  }

  private scatterResources(tileMap: TileMap, rng: Random): void {
    const w = tileMap.width;
    const h = tileMap.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = tileMap.get(x, y)!;

        // Berries: FOREST (40%) and FERTILE near forest (20%)
        if (tile.type === TileType.FOREST && rng.chance(BERRY_FOREST_CHANCE)) {
          tile.berries = rng.int(1, 4);
        } else if (tile.type === TileType.FERTILE && rng.chance(BERRY_FERTILE_CHANCE)) {
          tile.berries = rng.int(1, 3);
        }

        // Mushrooms: FOREST only (30%)
        if (tile.type === TileType.FOREST && rng.chance(MUSHROOM_FOREST_CHANCE)) {
          tile.mushrooms = rng.int(1, 3);
        }

        // Herbs: FOREST/GRASS/FERTILE with moisture > threshold (15%)
        if ((tile.type === TileType.FOREST || tile.type === TileType.GRASS || tile.type === TileType.FERTILE)
            && tile.fertility > HERB_MIN_MOISTURE && rng.chance(HERB_CHANCE)) {
          tile.herbs = rng.int(1, 2);
        }

        // Fish: WATER/RIVER (80%)
        if ((tile.type === TileType.WATER || tile.type === TileType.RIVER) && rng.chance(FISH_WATER_CHANCE)) {
          tile.fish = rng.int(3, 8);
        }

        // Wildlife: FOREST (25%) and GRASS near forest (10%)
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

    // River flows roughly top to bottom with some winding
    let rx = Math.floor(w * RIVER_START_POSITION) + rng.int(-RIVER_START_OFFSET, RIVER_START_OFFSET);
    const halfWidth = Math.floor(RIVER_WIDTH / 2);

    for (let y = 0; y < h; y++) {
      // Wander left/right
      rx += rng.int(-1, 1);
      rx = Math.max(halfWidth + 1, Math.min(w - halfWidth - 2, rx));

      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const x = rx + dx;
        if (x >= 0 && x < w) {
          tileMap.set(x, y, { type: TileType.RIVER, trees: 0 });
        }
      }
    }
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
