import type { Game } from '../Game';
import {
  TileType, NATURAL_REGROWTH_CHANCE, MAP_WIDTH, MAP_HEIGHT,
  BUILDING_DECAY_PER_TICK, BUILDING_MAX_DURABILITY,
  ENVIRONMENT_TILES_PER_TICK, MAX_TREE_DENSITY, FOREST_GROWTH_CHANCE,
  BUILDING_DECAY_CHECK_INTERVAL, Profession, TICKS_PER_SUB_SEASON,
  MAX_BERRIES, MAX_MUSHROOMS, MAX_HERBS, MAX_FISH, MAX_WILDLIFE,
  BERRY_LIFECYCLE, MUSHROOM_LIFECYCLE, HERB_LIFECYCLE, FISH_LIFECYCLE, WILDLIFE_LIFECYCLE,
  type ResourceLifecycle,
} from '../constants';

/**
 * Handles natural environment processes:
 * - Slow tree regrowth near existing forests
 * - Tree density growth over time
 * - Building decay over time
 */
export class EnvironmentSystem {
  private game: Game;
  private scanIndex = 0;
  private buildingDecayCounter = 0;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    const tileMap = this.game.tileMap;
    const totalTiles = MAP_WIDTH * MAP_HEIGHT;

    // Scan a portion of the map each tick
    for (let i = 0; i < ENVIRONMENT_TILES_PER_TICK; i++) {
      const idx = this.scanIndex;
      this.scanIndex = (this.scanIndex + 1) % totalTiles;

      const tile = tileMap.tiles[idx];

      const x = idx % MAP_WIDTH;
      const y = Math.floor(idx / MAP_WIDTH);

      // Natural regrowth: grass tiles adjacent to forest may sprout a tree
      if (tile.type === TileType.GRASS && !tile.occupied) {
        if (Math.random() < NATURAL_REGROWTH_CHANCE) {
          if (this.hasAdjacentForest(x, y)) {
            tile.type = TileType.FOREST;
            tile.trees = 1;
          }
        }
      }

      // Existing forests slowly grow denser
      if (tile.type === TileType.FOREST && tile.trees < MAX_TREE_DENSITY) {
        if (Math.random() < FOREST_GROWTH_CHANCE) {
          tile.trees = Math.min(MAX_TREE_DENSITY, tile.trees + 1);
        }
      }

      // ── Resource lifecycle ──
      const ssFloat = this.game.state.subSeason + this.game.state.tickInSubSeason / TICKS_PER_SUB_SEASON;

      this.applyLifecycle(tile, 'berries',   BERRY_LIFECYCLE,    MAX_BERRIES,   ssFloat, x, y);
      this.applyLifecycle(tile, 'mushrooms', MUSHROOM_LIFECYCLE, MAX_MUSHROOMS, ssFloat, x, y);
      this.applyLifecycle(tile, 'herbs',     HERB_LIFECYCLE,     MAX_HERBS,     ssFloat, x, y);

      if (tile.type === TileType.WATER || tile.type === TileType.RIVER)
        this.applyLifecycle(tile, 'fish',     FISH_LIFECYCLE,     MAX_FISH,      ssFloat, x, y);
      if (tile.type === TileType.FOREST || tile.type === TileType.GRASS)
        this.applyLifecycle(tile, 'wildlife', WILDLIFE_LIFECYCLE, MAX_WILDLIFE,  ssFloat, x, y);
    }

    // Building decay — check every 10 ticks
    this.buildingDecayCounter++;
    if (this.buildingDecayCounter >= BUILDING_DECAY_CHECK_INTERVAL) {
      this.buildingDecayCounter = 0;
      this.decayBuildings();
    }
  }

  private decayBuildings(): void {
    const world = this.game.world;
    const buildings = world.getComponentStore<any>('building');
    if (!buildings) return;

    for (const [id, bld] of buildings) {
      if (!bld.completed) continue;

      // Initialize durability
      if (bld.durability === undefined) bld.durability = BUILDING_MAX_DURABILITY;

      // Decay
      bld.durability -= BUILDING_DECAY_PER_TICK * BUILDING_DECAY_CHECK_INTERVAL;

      // Buildings at 0 durability collapse
      if (bld.durability <= 0) {
        this.collapseBuilding(id, bld);
      }
    }
  }

  private collapseBuilding(id: number, bld: any): void {
    const world = this.game.world;
    this.game.updateMineVeinStateFromBuilding(id);

    // Remove workers
    if (bld.assignedWorkers) {
      for (const wId of bld.assignedWorkers) {
        const worker = world.getComponent<any>(wId, 'worker');
        if (worker) {
          worker.workplaceId = null;
          worker.profession = Profession.LABORER;
          worker.task = null;
        }
      }
    }

    // Remove residents
    const house = world.getComponent<any>(id, 'house');
    if (house?.residents) {
      for (const rId of house.residents) {
        const fam = world.getComponent<any>(rId, 'family');
        if (fam) fam.homeId = null;
      }
    }

    // Free tiles
    const pos = world.getComponent<any>(id, 'position');
    if (pos) {
      for (let dy = 0; dy < (bld.height || 1); dy++) {
        for (let dx = 0; dx < (bld.width || 1); dx++) {
          this.game.tileMap.set(pos.tileX + dx, pos.tileY + dy, {
            occupied: false,
            buildingId: null,
            blocksMovement: false,
          });
        }
      }
    }

    world.destroyEntity(id);
    this.game.eventBus.emit('building_collapsed', { name: bld.name, tileX: pos?.tileX, tileY: pos?.tileY });
  }

  private applyLifecycle(tile: any, field: string, lc: ResourceLifecycle, maxVal: number, ssFloat: number, x: number, y: number): void {
    if (!this.tileEligible(tile, field, x, y)) return;
    const offset = this.tilePhaseOffset(x, y, lc.phaseVariance);
    const ss = ((ssFloat + offset) % 12 + 12) % 12;
    const target = this.computeTarget(lc, ss, maxVal);
    if (tile[field] < target && Math.random() < lc.growthProb) tile[field]++;
    else if (tile[field] > target && Math.random() < lc.decayProb) tile[field]--;
  }

  private computeTarget(lc: ResourceLifecycle, ss: number, maxVal: number): number {
    const min = Math.floor(lc.minFraction * maxVal);
    if (ss < lc.bloomStart || ss >= lc.dormantStart) return min;
    if (ss >= lc.peakStart && ss < lc.declineStart) return maxVal;
    if (ss < lc.peakStart) {
      const t = (ss - lc.bloomStart) / (lc.peakStart - lc.bloomStart);
      return Math.round(min + t * (maxVal - min));
    }
    const t = (ss - lc.declineStart) / (lc.dormantStart - lc.declineStart);
    return Math.round(maxVal - t * (maxVal - min));
  }

  private tilePhaseOffset(x: number, y: number, variance: number): number {
    const h = Math.imul(x * 374761393, y * 1013904223 + 1) >>> 0;
    return ((h % 1000) / 1000 - 0.5) * variance * 2;
  }

  /** Deterministic hash: limits which tiles can sustain each resource type,
   *  matching original scatter percentages so visual density stays consistent. */
  private tileEligible(tile: any, field: string, x: number, y: number): boolean {
    const h = (salt: number) => ((Math.imul(x * 374761393 + salt, y * 1013904223 + 1) >>> 0) % 100);
    switch (field) {
      case 'berries':
        if (tile.type === TileType.FOREST)  return h(0) < 40; // matches BERRY_FOREST_CHANCE 40%
        if (tile.type === TileType.FERTILE) return h(1) < 20; // matches BERRY_FERTILE_CHANCE 20%
        return false;
      case 'mushrooms':
        return tile.type === TileType.FOREST && h(2) < 30;    // matches MUSHROOM_FOREST_CHANCE 30%
      case 'herbs':
        if (tile.type !== TileType.FOREST && tile.type !== TileType.GRASS && tile.type !== TileType.FERTILE) return false;
        return h(3) < 15;                                      // matches HERB_CHANCE 15%
      case 'wildlife':
        if (tile.type === TileType.FOREST) return h(4) < 25;  // matches WILDLIFE_FOREST_CHANCE 25%
        if (tile.type === TileType.GRASS)  return h(4) < 10;  // matches WILDLIFE_GRASS_CHANCE 10%
        return false;
      default: return true; // fish: all water tiles (already filtered by caller)
    }
  }

  getInternalState(): { scanIndex: number; buildingDecayCounter: number } {
    return { scanIndex: this.scanIndex, buildingDecayCounter: this.buildingDecayCounter };
  }

  setInternalState(s: { scanIndex: number; buildingDecayCounter: number }): void {
    this.scanIndex = s.scanIndex;
    this.buildingDecayCounter = s.buildingDecayCounter;
  }

  private hasAdjacentForest(x: number, y: number): boolean {
    const tileMap = this.game.tileMap;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tile = tileMap.get(x + dx, y + dy);
        if (tile && tile.type === TileType.FOREST) return true;
      }
    }
    return false;
  }
}
