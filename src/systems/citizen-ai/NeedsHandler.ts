import type { Game } from '../../Game';
import type { NavigationHelpers } from './NavigationHelpers';
import { EntityId } from '../../types';
import { logger } from '../../utils/Logger';
import {
  ResourceType,
  MEAL_FOOD_THRESHOLD, MEAL_RESTORE, MEAL_COST,
  STARVING_THRESHOLD,
  DIET_HISTORY_SIZE,
  EMERGENCY_SLEEP_ENERGY, HOME_WARMTH_GAIN,
  COOKED_MEAL_RESTORE, COOKED_MEAL_COST,
  COOKED_MEAL_WARMTH_BOOST, COOKED_MEAL_HAPPINESS_BOOST,
  COOKED_MEAL_ENERGY_BOOST,
  HEATED_BUILDING_TYPES, HEATED_BUILDING_WARMTH_THRESHOLD,
} from '../../constants';
import { isCooked } from './CitizenUtils';

export class NeedsHandler {
  constructor(private game: Game, private nav: NavigationHelpers) {}

  /** Eat a discrete meal from global food supply, tracking diet variety */
  eatMeal(id: EntityId): void {
    const totalFood = this.game.getTotalFood();
    if (totalFood >= COOKED_MEAL_COST) {
      const needs = this.game.world.getComponent<any>(id, 'needs')!;
      if (!needs.recentDiet) needs.recentDiet = [];

      // Try cooked food first (costs less, restores more)
      const cookedCost = COOKED_MEAL_COST;
      const result = this.game.removeFoodPreferVariety(cookedCost, needs.recentDiet);
      if (result.eaten > 0) {
        const cooked = isCooked(result.type);
        const restore = cooked ? COOKED_MEAL_RESTORE : MEAL_RESTORE;
        const citizen = this.game.world.getComponent<any>(id, 'citizen');
        logger.debug('AI', `${citizen?.name} (${id}) ate ${result.type} (${cooked ? 'cooked' : 'raw'}): food ${needs.food.toFixed(1)} -> ${Math.min(100, needs.food + restore).toFixed(1)}, totalFood remaining=${(totalFood - result.eaten).toFixed(0)}`);
        needs.food = Math.min(100, needs.food + restore);

        // Cooked food buffs
        if (cooked) {
          needs.happiness = Math.min(100, needs.happiness + COOKED_MEAL_HAPPINESS_BOOST);
          // Stew and soup give warmth
          if (result.type === ResourceType.FISH_STEW || result.type === ResourceType.VEGETABLE_SOUP) {
            needs.warmth = Math.min(100, needs.warmth + COOKED_MEAL_WARMTH_BOOST);
          }
          // Pie gives energy
          if (result.type === ResourceType.BERRY_PIE) {
            needs.energy = Math.min(100, (needs.energy ?? 100) + COOKED_MEAL_ENERGY_BOOST);
          }
        }

        // Track diet history
        needs.recentDiet.push(result.type);
        if (needs.recentDiet.length > DIET_HISTORY_SIZE) {
          needs.recentDiet.shift();
        }
        return;
      }
    }

    // No food available — walk toward nearest storage
    const citizen = this.game.world.getComponent<any>(id, 'citizen');
    logger.warn('AI', `${citizen?.name} (${id}) tried to eat but no food available (total=${totalFood.toFixed(1)})`);
    const storage = this.nav.findNearestStorage(id);
    if (storage !== null) {
      if (!this.nav.isNearBuilding(id, storage)) {
        this.nav.goToBuilding(id, storage);
      }
    } else {
      logger.warn('AI', `${citizen?.name} (${id}) no storage building found — wandering`);
      this.nav.wander(id);
    }
  }

  /** Urgent food seeking when starving */
  seekFood(id: EntityId): void {
    const totalFood = this.game.getTotalFood();
    if (totalFood > 0) {
      const needs = this.game.world.getComponent<any>(id, 'needs')!;
      if (!needs.recentDiet) needs.recentDiet = [];

      const result = this.game.removeFoodPreferVariety(MEAL_COST, needs.recentDiet);
      if (result.eaten > 0) {
        const cooked = isCooked(result.type);
        const citizen = this.game.world.getComponent<any>(id, 'citizen');
        logger.info('AI', `${citizen?.name} (${id}) emergency ate ${result.type}: food ${needs.food.toFixed(1)} -> ${Math.min(100, needs.food + (cooked ? COOKED_MEAL_RESTORE : MEAL_RESTORE)).toFixed(1)}`);
        needs.food = Math.min(100, needs.food + (cooked ? COOKED_MEAL_RESTORE : MEAL_RESTORE));
        if (cooked) {
          needs.happiness = Math.min(100, needs.happiness + COOKED_MEAL_HAPPINESS_BOOST);
        }
        needs.recentDiet.push(result.type);
        if (needs.recentDiet.length > DIET_HISTORY_SIZE) {
          needs.recentDiet.shift();
        }
        return;
      }
    }

    const citizen = this.game.world.getComponent<any>(id, 'citizen');
    logger.error('AI', `${citizen?.name} (${id}) STARVING and NO FOOD in stockpile (total=${totalFood.toFixed(1)})`);
    const storage = this.nav.findNearestStorage(id);
    if (storage !== null) {
      if (!this.nav.isNearBuilding(id, storage)) {
        this.nav.goToBuilding(id, storage);
      }
    } else {
      this.nav.wander(id);
    }
  }

  seekWarmth(id: EntityId): void {
    const family = this.game.world.getComponent<any>(id, 'family');
    const warmBuildingId = this.findNearestWarmBuilding(id);

    if (!warmBuildingId && !family?.homeId) {
      this.goHome(id); // fallback (wanders if truly homeless)
      return;
    }

    if (warmBuildingId && family?.homeId) {
      // Pick whichever is closer
      const pos = this.game.world.getComponent<any>(id, 'position');
      const homePos = this.game.world.getComponent<any>(family.homeId, 'position');
      const bldPos  = this.game.world.getComponent<any>(warmBuildingId, 'position');
      if (pos && homePos && bldPos) {
        const homeDist = Math.abs(pos.tileX - homePos.tileX) + Math.abs(pos.tileY - homePos.tileY);
        const bldDist  = Math.abs(pos.tileX - bldPos.tileX)  + Math.abs(pos.tileY - bldPos.tileY);
        if (bldDist < homeDist) {
          this.goToWarmBuilding(id, warmBuildingId);
          return;
        }
      }
    } else if (warmBuildingId) {
      this.goToWarmBuilding(id, warmBuildingId);
      return;
    }

    this.goHome(id);
  }

  /** Find the nearest completed heated building with warmth above threshold. */
  private findNearestWarmBuilding(id: EntityId): EntityId | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    let nearest: EntityId | null = null;
    let bestDist = Infinity;

    for (const [bldId, bld] of buildings) {
      if (!bld.completed || !HEATED_BUILDING_TYPES.has(bld.type)) continue;
      if ((bld.warmthLevel ?? 0) <= HEATED_BUILDING_WARMTH_THRESHOLD) continue;

      const bldPos = this.game.world.getComponent<any>(bldId, 'position');
      if (!bldPos) continue;

      const dist = Math.abs(pos.tileX - bldPos.tileX) + Math.abs(pos.tileY - bldPos.tileY);
      if (dist < bestDist) { bestDist = dist; nearest = bldId; }
    }
    return nearest;
  }

  /** Move toward a warm public building for shelter — no sleep trigger. */
  private goToWarmBuilding(id: EntityId, buildingId: EntityId): void {
    if (this.nav.isNearBuilding(id, buildingId)) {
      this.nav.enterBuilding(id, buildingId);
      const movement = this.game.world.getComponent<any>(id, 'movement');
      if (movement) movement.stuckTicks = 0;
    } else {
      this.nav.goToBuilding(id, buildingId);
    }
  }

  /** Go home and start sleeping */
  goSleep(id: EntityId, citizen: any): void {
    const family = this.game.world.getComponent<any>(id, 'family');
    if (family?.homeId != null) {
      if (this.nav.isNearBuilding(id, family.homeId)) {
        // At home — fall asleep inside building
        if (this.nav.enterBuilding(id, family.homeId)) {
          citizen.isSleeping = true;
          const needs = this.game.world.getComponent<any>(id, 'needs');
          if (needs) {
            needs.warmth = Math.min(100, needs.warmth + HOME_WARMTH_GAIN);
          }
          const movement = this.game.world.getComponent<any>(id, 'movement')!;
          movement.stuckTicks = 0;
          return;
        }
      } else if (this.nav.goToBuilding(id, family.homeId)) {
        return;
      }
    }

    // No home — find a house with room to sleep in
    const house = this.nav.findAvailableHouse(id);
    if (house !== null) {
      if (this.nav.isNearBuilding(id, house)) {
        // Sleep inside a house even if not assigned
        if (this.nav.enterBuilding(id, house)) {
          citizen.isSleeping = true;
          return;
        }
      } else if (this.nav.goToBuilding(id, house)) {
        return;
      }
    }

    // Truly homeless — sleep where you are if exhausted
    if (this.game.world.getComponent<any>(id, 'needs')!.energy < EMERGENCY_SLEEP_ENERGY) {
      logger.warn('AI', `${citizen.name} (${id}) homeless and exhausted — sleeping outside`);
      citizen.isSleeping = true;
      return;
    }

    logger.debug('AI', `${citizen.name} (${id}) has no home, wandering`);
    this.nav.wander(id);
  }

  /** Go home (for warmth). Doesn't trigger sleep. */
  private goHome(id: EntityId): void {
    const family = this.game.world.getComponent<any>(id, 'family');
    if (family?.homeId != null) {
      if (this.nav.isNearBuilding(id, family.homeId)) {
        if (this.nav.enterBuilding(id, family.homeId)) {
          const needs = this.game.world.getComponent<any>(id, 'needs');
          if (needs) {
            needs.warmth = Math.min(100, needs.warmth + HOME_WARMTH_GAIN);
          }
          const movement = this.game.world.getComponent<any>(id, 'movement')!;
          movement.stuckTicks = 0;
          return;
        }
      } else if (this.nav.goToBuilding(id, family.homeId)) {
        return;
      }
    }

    const house = this.nav.findAvailableHouse(id);
    if (house !== null) {
      if (this.nav.isNearBuilding(id, house)) {
        if (this.nav.enterBuilding(id, house)) return;
      } else if (this.nav.goToBuilding(id, house)) {
        return;
      }
    }

    this.nav.wander(id);
  }
}
