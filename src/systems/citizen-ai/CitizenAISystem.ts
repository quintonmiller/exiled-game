import type { Game } from '../../Game';
import { EntityId } from '../../types';
import { logger } from '../../utils/Logger';
import {
  Profession, BuildingType, PersonalityTrait,
  MEAL_FOOD_THRESHOLD, STARVING_THRESHOLD, TIRED_THRESHOLD,
  FREEZING_WARMTH_THRESHOLD,
  LONELINESS_THRESHOLD, LONELINESS_HAPPINESS_PENALTY,
  AI_TICK_INTERVAL, STUCK_THRESHOLD,
  PREGNANT_MEAL_THRESHOLD_BOOST,
  TRAIT_WANDER_HAPPINESS, TAVERN_EVENING_START,
} from '../../constants';
import { NavigationHelpers } from './NavigationHelpers';
import { GatherHandler } from './GatherHandler';
import { NeedsHandler } from './NeedsHandler';
import { SocialHandler } from './SocialHandler';
import {
  GATHER_BUILDING_TYPES, BUILDING_ACTIVITY_LABELS,
  grantSkillXP, hasTrait, professionActivity,
} from './CitizenUtils';

export class CitizenAISystem {
  private game: Game;
  private tickCounter = 0;

  // Handlers
  private nav: NavigationHelpers;
  private gather: GatherHandler;
  private needs: NeedsHandler;
  private social: SocialHandler;

  constructor(game: Game) {
    this.game = game;
    this.nav = new NavigationHelpers(game);
    this.gather = new GatherHandler(game, this.nav);
    this.needs = new NeedsHandler(game, this.nav);
    this.social = new SocialHandler(game, this.nav);
  }

  update(): void {
    this.tickCounter++;
    // Only run AI decisions every N ticks for performance
    if (this.tickCounter % AI_TICK_INTERVAL !== 0) return;

    const world = this.game.world;
    const entities = world.query('citizen', 'position', 'needs', 'movement');

    for (const id of entities) {
      const citizen = world.getComponent<any>(id, 'citizen')!;
      const needs = world.getComponent<any>(id, 'needs')!;
      const movement = world.getComponent<any>(id, 'movement')!;
      const worker = world.getComponent<any>(id, 'worker');

      // Initialize fields
      if (movement.stuckTicks === undefined) movement.stuckTicks = 0;
      if (citizen.isSleeping === undefined) citizen.isSleeping = false;
      if (needs.energy === undefined) needs.energy = 100;

      // Initialize social fields
      if (needs.lastSocialTick === undefined) needs.lastSocialTick = 0;
      if (citizen.chatTimer === undefined) citizen.chatTimer = 0;

      // --- Chatting: brief social pause ---
      if (citizen.chatTimer > 0) {
        citizen.chatTimer -= AI_TICK_INTERVAL;
        movement.stuckTicks = 0;
        needs.lastSocialTick = this.game.state.tick;
        if (citizen.chatTimer > 0) { citizen.activity = 'chatting'; continue; }
      }

      // Loneliness: if no social contact for a long time, happiness drops
      if (this.game.state.tick - needs.lastSocialTick > LONELINESS_THRESHOLD) {
        needs.happiness = Math.max(0, needs.happiness + LONELINESS_HAPPINESS_PENALTY);
      }

      // --- Sleeping citizens: stay put, check wake conditions ---
      if (citizen.isSleeping) {
        movement.stuckTicks = 0;
        // Wake up when energy is full AND it's daytime
        if (needs.energy >= 100 && !this.game.state.isNight) {
          citizen.isSleeping = false;
          this.nav.exitBuilding(id);
        }
        // Also wake if starving — survival overrides sleep
        else if (needs.food < STARVING_THRESHOLD) {
          citizen.isSleeping = false;
          this.nav.exitBuilding(id);
        }
        else {
          continue; // Stay asleep, skip all other AI
        }
      }

      // Skip if actively moving along a path (retain last activity)
      if (movement.path && movement.path.length > 0) {
        movement.stuckTicks = 0;
        continue;
      }

      // Default activity — overridden by decision branches below
      citizen.activity = 'idle';

      // Clear inside-building flag; decision branches re-set it when appropriate
      this.nav.exitBuilding(id);

      movement.stuckTicks++;

      // Stuck recovery: if stuck for too many AI cycles, force wander
      if (movement.stuckTicks > STUCK_THRESHOLD) {
        // Never unassign manually-assigned workers — they chose this job
        if (worker?.workplaceId !== null && worker?.workplaceId !== undefined && !worker.manuallyAssigned) {
          logger.warn('AI', `${citizen.name} (${id}) STUCK for ${movement.stuckTicks} ticks — unassigning from auto-assigned work`);
          this.gather.unassignWorker(id, worker);
        } else {
          logger.debug('AI', `${citizen.name} (${id}) STUCK for ${movement.stuckTicks} ticks — force wandering (keeping assignment)`);
        }
        this.nav.forceWander(id);
        movement.stuckTicks = 0;
        continue;
      }

      // Children have simpler AI
      if (citizen.isChild) {
        this.handleChildAI(id, citizen, needs, movement);
        continue;
      }

      if (!worker) continue;

      // ---- Priority-based decision tree ----

      // 1. Starving -> seek food urgently (overrides everything)
      if (needs.food < STARVING_THRESHOLD) {
        citizen.activity = 'starving';
        logger.warn('AI', `${citizen.name} (${id}) STARVING — food=${needs.food.toFixed(1)}, seeking food urgently`);
        this.needs.seekFood(id);
        continue;
      }

      // 2. Freezing -> seek warmth (go home)
      if (needs.warmth < FREEZING_WARMTH_THRESHOLD) {
        citizen.activity = 'freezing';
        logger.info('AI', `${citizen.name} (${id}) freezing — warmth=${needs.warmth.toFixed(1)}, seeking home`);
        this.needs.seekWarmth(id);
        continue;
      }

      // 3. Exhausted during day -> go home and sleep
      if (needs.energy < TIRED_THRESHOLD) {
        logger.debug('AI', `${citizen.name} (${id}) exhausted — energy=${needs.energy.toFixed(1)}, going to sleep`);
        this.needs.goSleep(id, citizen);
        continue;
      }

      // 4. Night time -> go home and sleep
      if (this.game.state.isNight) {
        this.needs.goSleep(id, citizen);
        continue;
      }

      // 5. Hungry (meal time) -> eat a meal
      const family = this.game.world.getComponent<any>(id, 'family');
      const mealThreshold = family?.isPregnant
        ? MEAL_FOOD_THRESHOLD + PREGNANT_MEAL_THRESHOLD_BOOST
        : MEAL_FOOD_THRESHOLD;
      if (needs.food < mealThreshold) {
        citizen.activity = 'eating';
        logger.debug('AI', `${citizen.name} (${id}) hungry — food=${needs.food.toFixed(1)} < ${mealThreshold}, eating meal`);
        this.needs.eatMeal(id);
        continue;
      }

      // 5b. Festival — go to Town Hall gathering instead of working
      if (this.game.festivalSystem.isFestivalActive()) {
        const fest = this.game.state.festival;
        if (fest) {
          citizen.activity = 'celebrating';
          if (this.nav.isNearBuilding(id, fest.townHallId)) {
            movement.stuckTicks = 0;
            continue;
          }
          if (this.nav.goToBuilding(id, fest.townHallId)) continue;
        }
      }

      // 6. If assigned to a workplace, go work
      if (worker.workplaceId !== null) {
        const bld = this.game.world.getComponent<any>(worker.workplaceId, 'building');
        const isConstructionSite = bld && !bld.completed;

        // Gathering buildings use physical gather-carry-deposit cycle
        if (bld && bld.completed && GATHER_BUILDING_TYPES.has(bld.type)) {
          this.gather.handleGatherCycle(id, worker, citizen, movement, needs, worker.workplaceId, bld);
          continue;
        }

        citizen.activity = isConstructionSite ? 'building'
          : (BUILDING_ACTIVITY_LABELS[bld?.type] || professionActivity(worker.profession));
        if (this.nav.isNearBuilding(id, worker.workplaceId)) {
          movement.stuckTicks = 0; // Working, not stuck
          // Grant skill XP while working
          grantSkillXP(worker);
          // Under construction: just stay near the site (no roaming/entering)
          if (!isConstructionSite) {
            if (bld && this.nav.isIndoorBuilding(bld.type)) {
              this.nav.enterBuilding(id, worker.workplaceId);
            }
          }
          continue;
        }
        // Try to path to workplace — if blocked, just wait and retry next tick
        // (don't unassign on temporary pathfinding failures)
        if (!this.nav.goToBuilding(id, worker.workplaceId)) {
          // Wander toward the building area instead of standing still
          this.nav.wander(id);
        }
        continue;
      }

      // 7. Laborers look for construction sites
      if (worker.profession === Profession.LABORER) {
        const site = this.nav.findNearestConstructionSite(id);
        if (site !== null) {
          citizen.activity = 'building';
          if (this.nav.isNearBuilding(id, site)) {
            movement.stuckTicks = 0;
            grantSkillXP(worker);
            continue;
          }
          if (this.nav.goToBuilding(id, site)) continue;
        }
      }

      // 8. Evening tavern visit — after work, before bed
      if (this.game.state.dayProgress >= TAVERN_EVENING_START && !this.game.state.isNight) {
        if (this.social.tryVisitTavern(id, citizen, needs, movement)) continue;
      }

      // 9. Social interaction — chat with nearby citizens
      if (this.social.trySocialize(id, citizen, needs)) continue;

      // 10. Wander randomly
      // Adventurous trait — gain happiness from wandering
      if (hasTrait(citizen, PersonalityTrait.ADVENTUROUS)) {
        const wanderHappy = TRAIT_WANDER_HAPPINESS[PersonalityTrait.ADVENTUROUS] || 0;
        needs.happiness = Math.min(100, needs.happiness + wanderHappy);
      }
      this.nav.wander(id);
    }
  }

  getInternalState(): { tickCounter: number } {
    return { tickCounter: this.tickCounter };
  }

  setInternalState(s: { tickCounter: number }): void {
    this.tickCounter = s.tickCounter;
  }

  private handleChildAI(id: EntityId, citizen: any, needs: any, movement: any): void {
    // Sleeping
    if (citizen.isSleeping) return; // Already handled above

    if (needs.food < STARVING_THRESHOLD) {
      this.needs.seekFood(id);
      return;
    }

    // Night or tired — go sleep
    if (this.game.state.isNight || needs.energy < TIRED_THRESHOLD) {
      this.needs.goSleep(id, citizen);
      return;
    }

    // Hungry — eat
    if (needs.food < MEAL_FOOD_THRESHOLD) {
      this.needs.eatMeal(id);
      return;
    }

    // Festival — children attend too
    if (this.game.festivalSystem.isFestivalActive()) {
      const fest = this.game.state.festival;
      if (fest) {
        citizen.activity = 'celebrating';
        if (this.nav.isNearBuilding(id, fest.townHallId)) {
          movement.stuckTicks = 0;
          return;
        }
        if (this.nav.goToBuilding(id, fest.townHallId)) return;
      }
    }

    // School
    if (!citizen.isEducated) {
      const school = this.nav.findBuilding(BuildingType.SCHOOL);
      if (school !== null) {
        citizen.activity = 'school';
        if (this.nav.isNearBuilding(id, school)) {
          this.nav.enterBuilding(id, school);
          movement.stuckTicks = 0;
          return;
        }
        if (this.nav.goToBuilding(id, school)) return;
      }
    }

    citizen.activity = 'idle';
    this.nav.wander(id);
  }
}
