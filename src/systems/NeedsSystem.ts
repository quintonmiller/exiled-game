import type { Game } from '../Game';
import { SEASON_DATA } from '../data/SeasonDefs';
import {
  FOOD_DECAY_PER_TICK, WARMTH_DECAY_PER_TICK,
  STARVATION_HEALTH_DAMAGE, FREEZING_HEALTH_DAMAGE,
  HEALTH_DECAY_PER_TICK, NO_COAT_WARMTH_MULT, COAT_WEAR_PER_TICK,
  ENERGY_DECAY_PER_TICK, ENERGY_RECOVERY_PER_TICK,
  DIET_VARIETY_THRESHOLD, DIET_VARIETY_HAPPINESS, DIET_MONOTONY_HAPPINESS,
  ResourceType,
} from '../constants';

export class NeedsSystem {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    const world = this.game.world;
    const entities = world.query('citizen', 'needs', 'position');
    const seasonData = SEASON_DATA[this.game.state.subSeason];

    for (const id of entities) {
      const needs = world.getComponent<any>(id, 'needs')!;
      const citizen = world.getComponent<any>(id, 'citizen')!;

      // Initialize energy if missing (for citizens spawned before this system existed)
      if (needs.energy === undefined) needs.energy = 100;
      if (citizen.isSleeping === undefined) citizen.isSleeping = false;

      // --- Energy ---
      if (citizen.isSleeping) {
        // Recover energy while sleeping
        needs.energy = Math.min(100, needs.energy + ENERGY_RECOVERY_PER_TICK);
        // Food decays at half rate while sleeping (metabolism slows)
        needs.food -= FOOD_DECAY_PER_TICK * 0.5;
      } else {
        // Drain energy while awake
        needs.energy = Math.max(0, needs.energy - ENERGY_DECAY_PER_TICK);
        // Normal food decay
        needs.food -= FOOD_DECAY_PER_TICK;
      }
      needs.food = Math.max(0, needs.food);

      // --- Warmth ---
      let warmthDecay = WARMTH_DECAY_PER_TICK;
      if (seasonData.temperature < 0) {
        warmthDecay *= 1 + Math.abs(seasonData.temperature) / 10;
      } else if (seasonData.temperature > 15) {
        // Warm weather restores warmth
        needs.warmth = Math.min(100, needs.warmth + 0.02);
        warmthDecay = 0;
      }

      // Coat check: citizens without coats lose warmth faster
      const hasCoat = this.game.getResource(ResourceType.COAT) > 0;
      if (!hasCoat) {
        warmthDecay *= NO_COAT_WARMTH_MULT;
      } else {
        this.game.removeResource(ResourceType.COAT, COAT_WEAR_PER_TICK);
      }

      // Sleeping indoors greatly reduces warmth loss
      const family = world.getComponent<any>(id, 'family');
      const isAtHome = family?.homeId != null && this.isNearHome(id, family.homeId);
      if (isAtHome) {
        const house = world.getComponent<any>(family.homeId, 'house');
        if (house && house.warmthLevel > 30) {
          warmthDecay *= 0.2;
          needs.warmth = Math.min(100, needs.warmth + 0.05);
        }
      }

      needs.warmth -= warmthDecay;
      needs.warmth = Math.max(0, needs.warmth);

      // --- Health ---
      if (needs.food <= 0) {
        needs.health -= STARVATION_HEALTH_DAMAGE;
      }
      if (needs.warmth <= 0 && seasonData.temperature < 5) {
        needs.health -= FREEZING_HEALTH_DAMAGE;
      }

      // Natural health regeneration (when well-fed, warm, and rested)
      if (needs.food > 50 && needs.warmth > 50 && needs.energy > 30 && needs.health < 100) {
        needs.health += 0.005;
      }

      // Herbs boost health
      if (needs.health < 80 && this.game.getResource('herbs') > 0) {
        if (this.game.rng.chance(0.001)) {
          this.game.removeResource('herbs', 1);
          needs.health = Math.min(100, needs.health + 10);
        }
      }

      // Old age health decay
      if (citizen.age > 60) {
        needs.health -= HEALTH_DECAY_PER_TICK * (citizen.age - 60) / 20;
      }

      needs.health = Math.max(0, Math.min(100, needs.health));

      // --- Happiness ---
      // Low energy makes citizens unhappy
      if (needs.food < 30 || needs.warmth < 30 || needs.health < 50 || needs.energy < 15) {
        needs.happiness = Math.max(0, needs.happiness - 0.01);
      } else if (needs.food > 70 && needs.warmth > 70 && needs.health > 70 && needs.energy > 50) {
        needs.happiness = Math.min(100, needs.happiness + 0.005);
      }

      // Diet variety bonus/penalty
      if (needs.recentDiet && needs.recentDiet.length >= 3) {
        const uniqueTypes = new Set(needs.recentDiet).size;
        if (uniqueTypes >= DIET_VARIETY_THRESHOLD) {
          needs.happiness = Math.min(100, needs.happiness + DIET_VARIETY_HAPPINESS);
        } else if (uniqueTypes <= 1) {
          needs.happiness = Math.max(0, needs.happiness + DIET_MONOTONY_HAPPINESS);
        }
      }

      // --- Death ---
      if (needs.health <= 0) {
        this.killCitizen(id);
      }
    }
  }

  /** Check if citizen is physically near their home building */
  private isNearHome(citizenId: number, homeId: number): boolean {
    const pos = this.game.world.getComponent<any>(citizenId, 'position');
    const bPos = this.game.world.getComponent<any>(homeId, 'position');
    if (!pos || !bPos) return false;

    const bld = this.game.world.getComponent<any>(homeId, 'building');
    const bw = bld?.width || 1;
    const bh = bld?.height || 1;

    const dx = pos.tileX - bPos.tileX;
    const dy = pos.tileY - bPos.tileY;
    return dx >= -2 && dx <= bw + 1 && dy >= -2 && dy <= bh + 1;
  }

  private killCitizen(id: number): void {
    const citizen = this.game.world.getComponent<any>(id, 'citizen');
    const name = citizen?.name || 'Unknown';

    // Remove from family
    const family = this.game.world.getComponent<any>(id, 'family');
    if (family?.partnerId) {
      const partnerFamily = this.game.world.getComponent<any>(family.partnerId, 'family');
      if (partnerFamily) partnerFamily.partnerId = null;
    }

    // Remove from workplace
    const worker = this.game.world.getComponent<any>(id, 'worker');
    if (worker?.workplaceId) {
      const bld = this.game.world.getComponent<any>(worker.workplaceId, 'building');
      if (bld?.assignedWorkers) {
        bld.assignedWorkers = bld.assignedWorkers.filter((w: number) => w !== id);
      }
    }

    // Remove from house
    if (family?.homeId) {
      const house = this.game.world.getComponent<any>(family.homeId, 'house');
      if (house?.residents) {
        house.residents = house.residents.filter((r: number) => r !== id);
      }
    }

    this.game.world.destroyEntity(id);
    this.game.state.totalDeaths++;

    this.game.eventBus.emit('citizen_died', { id, name });
  }
}
