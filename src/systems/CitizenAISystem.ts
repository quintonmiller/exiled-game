import type { Game } from '../Game';
import { EntityId, DoorDef } from '../types';
import { getDoorEntryTile } from '../utils/DoorUtils';
import { logger } from '../utils/Logger';
import { RECIPE_DEFS } from '../data/RecipeDefs';
import { BUILDING_DEFS } from '../data/BuildingDefs';
import {
  Profession, TILE_SIZE, BuildingType,
  MEAL_FOOD_THRESHOLD, MEAL_RESTORE, MEAL_COST,
  STARVING_THRESHOLD, TIRED_THRESHOLD, DIET_HISTORY_SIZE,
  SOCIAL_CHAT_RADIUS, SOCIAL_CHAT_CHANCE, SOCIAL_CHAT_DURATION,
  LONELINESS_THRESHOLD, LONELINESS_HAPPINESS_PENALTY,
  AI_TICK_INTERVAL, STUCK_THRESHOLD, FREEZING_WARMTH_THRESHOLD,
  EMERGENCY_SLEEP_ENERGY, CHAT_HAPPINESS_GAIN, HOME_WARMTH_GAIN,
  WANDER_ATTEMPTS, WANDER_RANGE, FORCE_WANDER_ATTEMPTS,
  FORCE_WANDER_RANGE, FORCE_WANDER_MIN_DIST,
  PREGNANT_MEAL_THRESHOLD_BOOST,
  COOKED_FOOD_TYPES, COOKED_MEAL_RESTORE, COOKED_MEAL_COST,
  COOKED_MEAL_WARMTH_BOOST, COOKED_MEAL_HAPPINESS_BOOST,
  COOKED_MEAL_ENERGY_BOOST, ResourceType,
  TRAIT_SOCIAL_CHANCE_MULT, TRAIT_HAPPINESS_GAIN_MULT,
  TRAIT_WANDER_HAPPINESS, PersonalityTrait,
  PROFESSION_SKILL_MAP, SKILL_XP_PER_WORK_TICK,
  SKILL_XP_PER_LEVEL, SKILL_MAX_LEVEL,
  TAVERN_HAPPINESS_PER_TICK, TAVERN_VISIT_CHANCE, TAVERN_EVENING_START,
} from '../constants';
import { distance } from '../utils/MathUtils';

/** Building types whose workers should roam in the work radius */
const ROAMING_BUILDING_TYPES = new Set<string>([
  BuildingType.GATHERING_HUT,
  BuildingType.HUNTING_CABIN,
  BuildingType.FORESTER_LODGE,
  BuildingType.HERBALIST,
  BuildingType.FISHING_DOCK,
]);

/** Cache: building type → readable activity label */
const BUILDING_ACTIVITY_LABELS: Record<string, string> = {
  [BuildingType.GATHERING_HUT]: 'foraging',
  [BuildingType.HUNTING_CABIN]: 'hunting game',
  [BuildingType.FISHING_DOCK]: 'fishing',
  [BuildingType.FORESTER_LODGE]: 'felling trees',
  [BuildingType.HERBALIST]: 'gathering herbs',
  [BuildingType.WOOD_CUTTER]: 'splitting wood',
  [BuildingType.BLACKSMITH]: 'forging tools',
  [BuildingType.TAILOR]: 'sewing',
  [BuildingType.CROP_FIELD]: 'tending crops',
  [BuildingType.BAKERY]: 'cooking',
  [BuildingType.MARKET]: 'selling goods',
  [BuildingType.SCHOOL]: 'teaching',
  [BuildingType.TRADING_POST]: 'trading',
  [BuildingType.TAVERN]: 'tending bar',
  [BuildingType.CHICKEN_COOP]: 'tending chickens',
  [BuildingType.PASTURE]: 'herding cattle',
  [BuildingType.DAIRY]: 'making cheese',
};

export class CitizenAISystem {
  private game: Game;
  private tickCounter = 0;

  constructor(game: Game) {
    this.game = game;
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
          this.exitBuilding(id);
        }
        // Also wake if starving — survival overrides sleep
        else if (needs.food < STARVING_THRESHOLD) {
          citizen.isSleeping = false;
          this.exitBuilding(id);
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
      this.exitBuilding(id);

      movement.stuckTicks++;

      // Stuck recovery: if stuck for too many AI cycles, force wander
      if (movement.stuckTicks > STUCK_THRESHOLD) {
        // Never unassign manually-assigned workers — they chose this job
        if (worker?.workplaceId !== null && worker?.workplaceId !== undefined && !worker.manuallyAssigned) {
          logger.warn('AI', `${citizen.name} (${id}) STUCK for ${movement.stuckTicks} ticks — unassigning from auto-assigned work`);
          this.unassignWorker(id, worker);
        } else {
          logger.debug('AI', `${citizen.name} (${id}) STUCK for ${movement.stuckTicks} ticks — force wandering (keeping assignment)`);
        }
        this.forceWander(id);
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
        this.seekFood(id);
        continue;
      }

      // 2. Freezing -> seek warmth (go home)
      if (needs.warmth < FREEZING_WARMTH_THRESHOLD) {
        citizen.activity = 'freezing';
        logger.info('AI', `${citizen.name} (${id}) freezing — warmth=${needs.warmth.toFixed(1)}, seeking home`);
        this.seekWarmth(id);
        continue;
      }

      // 3. Exhausted during day -> go home and sleep
      if (needs.energy < TIRED_THRESHOLD) {
        logger.debug('AI', `${citizen.name} (${id}) exhausted — energy=${needs.energy.toFixed(1)}, going to sleep`);
        this.goSleep(id, citizen);
        continue;
      }

      // 4. Night time -> go home and sleep
      if (this.game.state.isNight) {
        this.goSleep(id, citizen);
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
        this.eatMeal(id);
        continue;
      }

      // 5b. Festival — go to Town Hall gathering instead of working
      if (this.game.festivalSystem.isFestivalActive()) {
        const fest = this.game.state.festival;
        if (fest) {
          citizen.activity = 'celebrating';
          if (this.isNearBuilding(id, fest.townHallId)) {
            movement.stuckTicks = 0;
            continue;
          }
          if (this.goToBuilding(id, fest.townHallId)) continue;
        }
      }

      // 6. If assigned to a workplace, go work
      if (worker.workplaceId !== null) {
        const bld = this.game.world.getComponent<any>(worker.workplaceId, 'building');
        const isConstructionSite = bld && !bld.completed;
        citizen.activity = isConstructionSite ? 'building'
          : (BUILDING_ACTIVITY_LABELS[bld?.type] || this.professionActivity(worker.profession));
        if (this.isNearBuilding(id, worker.workplaceId)) {
          movement.stuckTicks = 0; // Working, not stuck
          // Grant skill XP while working
          this.grantSkillXP(worker);
          // Under construction: just stay near the site (no roaming/entering)
          if (!isConstructionSite) {
            // Roaming: gather-type workers patrol the work radius
            if (bld && ROAMING_BUILDING_TYPES.has(bld.type)) {
              this.roamInWorkRadius(id, worker.workplaceId, bld);
            } else if (bld && this.isIndoorBuilding(bld.type)) {
              this.enterBuilding(id, worker.workplaceId);
            }
          }
          continue;
        }
        // Try to path to workplace — if blocked, just wait and retry next tick
        // (don't unassign on temporary pathfinding failures)
        if (!this.goToBuilding(id, worker.workplaceId)) {
          // Wander toward the building area instead of standing still
          this.wander(id);
        }
        continue;
      }

      // 7. Laborers look for construction sites
      if (worker.profession === Profession.LABORER) {
        const site = this.findNearestConstructionSite(id);
        if (site !== null) {
          citizen.activity = 'building';
          if (this.isNearBuilding(id, site)) {
            movement.stuckTicks = 0;
            this.grantSkillXP(worker);
            continue;
          }
          if (this.goToBuilding(id, site)) continue;
        }
      }

      // 8. Evening tavern visit — after work, before bed
      if (this.game.state.dayProgress >= TAVERN_EVENING_START && !this.game.state.isNight) {
        if (this.tryVisitTavern(id, citizen, needs, movement)) continue;
      }

      // 9. Social interaction — chat with nearby citizens
      if (this.trySocialize(id, citizen, needs)) continue;

      // 10. Wander randomly
      // Adventurous trait — gain happiness from wandering
      if (this.hasTrait(citizen, PersonalityTrait.ADVENTUROUS)) {
        const wanderHappy = TRAIT_WANDER_HAPPINESS[PersonalityTrait.ADVENTUROUS] || 0;
        needs.happiness = Math.min(100, needs.happiness + wanderHappy);
      }
      this.wander(id);
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
      this.seekFood(id);
      return;
    }

    // Night or tired — go sleep
    if (this.game.state.isNight || needs.energy < TIRED_THRESHOLD) {
      this.goSleep(id, citizen);
      return;
    }

    // Hungry — eat
    if (needs.food < MEAL_FOOD_THRESHOLD) {
      this.eatMeal(id);
      return;
    }

    // Festival — children attend too
    if (this.game.festivalSystem.isFestivalActive()) {
      const fest = this.game.state.festival;
      if (fest) {
        citizen.activity = 'celebrating';
        if (this.isNearBuilding(id, fest.townHallId)) {
          movement.stuckTicks = 0;
          return;
        }
        if (this.goToBuilding(id, fest.townHallId)) return;
      }
    }

    // School
    if (!citizen.isEducated) {
      const school = this.findBuilding(BuildingType.SCHOOL);
      if (school !== null) {
        citizen.activity = 'school';
        if (this.isNearBuilding(id, school)) {
          this.enterBuilding(id, school);
          movement.stuckTicks = 0;
          return;
        }
        if (this.goToBuilding(id, school)) return;
      }
    }

    citizen.activity = 'idle';
    this.wander(id);
  }

  /** Check if a food type is cooked */
  private isCooked(type: string): boolean {
    return (COOKED_FOOD_TYPES as readonly string[]).includes(type);
  }

  /** Eat a discrete meal from global food supply, tracking diet variety */
  private eatMeal(id: EntityId): void {
    const totalFood = this.game.getTotalFood();
    if (totalFood >= COOKED_MEAL_COST) {
      const needs = this.game.world.getComponent<any>(id, 'needs')!;
      if (!needs.recentDiet) needs.recentDiet = [];

      // Try cooked food first (costs less, restores more)
      const cookedCost = COOKED_MEAL_COST;
      const result = this.game.removeFoodPreferVariety(cookedCost, needs.recentDiet);
      if (result.eaten > 0) {
        const cooked = this.isCooked(result.type);
        const restore = cooked ? COOKED_MEAL_RESTORE : MEAL_RESTORE;
        const citizen = this.game.world.getComponent<any>(id, 'citizen');
        logger.debug('AI', `${citizen?.name} (${id}) ate ${result.type} (${cooked ? 'cooked' : 'raw'}): food ${needs.food.toFixed(1)} → ${Math.min(100, needs.food + restore).toFixed(1)}, totalFood remaining=${(totalFood - result.eaten).toFixed(0)}`);
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
    const storage = this.findNearestStorage(id);
    if (storage !== null) {
      if (!this.isNearBuilding(id, storage)) {
        this.goToBuilding(id, storage);
      }
    } else {
      logger.warn('AI', `${citizen?.name} (${id}) no storage building found — wandering`);
      this.wander(id);
    }
  }

  /** Urgent food seeking when starving */
  private seekFood(id: EntityId): void {
    const totalFood = this.game.getTotalFood();
    if (totalFood > 0) {
      const needs = this.game.world.getComponent<any>(id, 'needs')!;
      if (!needs.recentDiet) needs.recentDiet = [];

      const result = this.game.removeFoodPreferVariety(MEAL_COST, needs.recentDiet);
      if (result.eaten > 0) {
        const cooked = this.isCooked(result.type);
        const citizen = this.game.world.getComponent<any>(id, 'citizen');
        logger.info('AI', `${citizen?.name} (${id}) emergency ate ${result.type}: food ${needs.food.toFixed(1)} → ${Math.min(100, needs.food + (cooked ? COOKED_MEAL_RESTORE : MEAL_RESTORE)).toFixed(1)}`);
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
    const storage = this.findNearestStorage(id);
    if (storage !== null) {
      if (!this.isNearBuilding(id, storage)) {
        this.goToBuilding(id, storage);
      }
    } else {
      this.wander(id);
    }
  }

  private seekWarmth(id: EntityId): void {
    this.goHome(id);
  }

  /** Grant skill XP to a worker based on their current profession */
  private grantSkillXP(worker: any): void {
    const skillType = PROFESSION_SKILL_MAP[worker.profession];
    if (!skillType) return;

    if (!worker.skills) worker.skills = {};
    if (!worker.skills[skillType]) worker.skills[skillType] = { xp: 0, level: 0 };

    const skill = worker.skills[skillType];
    if (skill.level >= SKILL_MAX_LEVEL) return;

    skill.xp += SKILL_XP_PER_WORK_TICK * AI_TICK_INTERVAL;
    if (skill.xp >= SKILL_XP_PER_LEVEL) {
      skill.xp -= SKILL_XP_PER_LEVEL;
      skill.level = Math.min(SKILL_MAX_LEVEL, skill.level + 1);
    }
  }

  /** Get trait multiplier for a given trait map */
  private getTraitMult(citizen: any, traitMap: Partial<Record<PersonalityTrait, number>>): number {
    const traits: string[] = citizen.traits || [];
    let mult = 1;
    for (const t of traits) {
      const v = traitMap[t as PersonalityTrait];
      if (v !== undefined) mult *= v;
    }
    return mult;
  }

  /** Check if citizen has a specific trait */
  private hasTrait(citizen: any, trait: PersonalityTrait): boolean {
    return (citizen.traits || []).includes(trait);
  }

  /** Try to visit a completed tavern with a barkeep for evening relaxation */
  private tryVisitTavern(id: EntityId, citizen: any, needs: any, movement: any): boolean {
    if (Math.random() > TAVERN_VISIT_CHANCE) return false;

    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return false;

    for (const [bldId, bld] of buildings) {
      if (bld.type !== BuildingType.TAVERN || !bld.completed) continue;
      // Tavern needs a barkeep to be active
      const workerCount = bld.assignedWorkers?.length || 0;
      if (workerCount === 0) continue;

      if (this.isNearBuilding(id, bldId)) {
        // At tavern — gain happiness
        citizen.activity = 'drinking';
        this.enterBuilding(id, bldId);
        needs.happiness = Math.min(100, needs.happiness + TAVERN_HAPPINESS_PER_TICK * AI_TICK_INTERVAL);
        needs.lastSocialTick = this.game.state.tick;
        movement.stuckTicks = 0;
        return true;
      }

      // Go to tavern
      citizen.activity = 'drinking';
      if (this.goToBuilding(id, bldId)) return true;
    }
    return false;
  }

  /** Try to chat with a nearby citizen */
  private trySocialize(id: EntityId, citizen: any, needs: any): boolean {
    // Trait affects social chance
    const socialMult = this.getTraitMult(citizen, TRAIT_SOCIAL_CHANCE_MULT);
    if (Math.random() > SOCIAL_CHAT_CHANCE * socialMult) return false;

    const pos = this.game.world.getComponent<any>(id, 'position')!;
    const citizens = this.game.world.getComponentStore<any>('citizen');
    const positions = this.game.world.getComponentStore<any>('position');
    if (!citizens || !positions) return false;

    for (const [otherId] of citizens) {
      if (otherId === id) continue;
      const otherPos = positions.get(otherId);
      if (!otherPos) continue;

      const dx = Math.abs(pos.tileX - otherPos.tileX);
      const dy = Math.abs(pos.tileY - otherPos.tileY);
      if (dx <= SOCIAL_CHAT_RADIUS && dy <= SOCIAL_CHAT_RADIUS) {
        // Start chatting
        citizen.chatTimer = SOCIAL_CHAT_DURATION;
        needs.lastSocialTick = this.game.state.tick;
        const happyMult = this.getTraitMult(citizen, TRAIT_HAPPINESS_GAIN_MULT);
        needs.happiness = Math.min(100, needs.happiness + CHAT_HAPPINESS_GAIN * happyMult);
        return true;
      }
    }
    return false;
  }

  /** Go home and start sleeping */
  private goSleep(id: EntityId, citizen: any): void {
    const family = this.game.world.getComponent<any>(id, 'family');
    if (family?.homeId != null) {
      if (this.isNearBuilding(id, family.homeId)) {
        // At home — fall asleep inside building
        citizen.isSleeping = true;
        this.enterBuilding(id, family.homeId);
        const needs = this.game.world.getComponent<any>(id, 'needs');
        if (needs) {
          needs.warmth = Math.min(100, needs.warmth + HOME_WARMTH_GAIN);
        }
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.stuckTicks = 0;
        return;
      }
      if (this.goToBuilding(id, family.homeId)) return;
    }

    // No home — find a house with room to sleep in
    const house = this.findAvailableHouse(id);
    if (house !== null) {
      if (this.isNearBuilding(id, house)) {
        // Sleep inside a house even if not assigned
        citizen.isSleeping = true;
        this.enterBuilding(id, house);
        return;
      }
      if (this.goToBuilding(id, house)) return;
    }

    // Truly homeless — sleep where you are if exhausted
    if (this.game.world.getComponent<any>(id, 'needs')!.energy < EMERGENCY_SLEEP_ENERGY) {
      logger.warn('AI', `${citizen.name} (${id}) homeless and exhausted — sleeping outside`);
      citizen.isSleeping = true;
      return;
    }

    logger.debug('AI', `${citizen.name} (${id}) has no home, wandering`);
    this.wander(id);
  }

  /** Send a gather-type worker to roam within the building's work radius */
  private roamInWorkRadius(id: EntityId, buildingId: EntityId, bld: any): void {
    const bPos = this.game.world.getComponent<any>(buildingId, 'position');
    if (!bPos) return;

    const radius = bld.workRadius || 15;
    const cx = bPos.tileX + Math.floor((bld.width || 1) / 2);
    const cy = bPos.tileY + Math.floor((bld.height || 1) / 2);

    // Pick a random tile within work radius
    for (let attempt = 0; attempt < WANDER_ATTEMPTS; attempt++) {
      const ox = this.game.rng.int(-radius, radius);
      const oy = this.game.rng.int(-radius, radius);
      if (ox * ox + oy * oy > radius * radius) continue; // stay within circular radius

      const tx = cx + ox;
      const ty = cy + oy;
      if (!this.game.tileMap.isWalkable(tx, ty)) continue;

      const pos = this.game.world.getComponent<any>(id, 'position')!;
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, tx, ty);
      if (result.found && result.path.length > 1) {
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.path = result.path;
        movement.targetEntity = buildingId; // still "working" for this building
        movement.stuckTicks = 0;
        return;
      }
    }
  }

  /** Go home (for warmth). Doesn't trigger sleep. */
  private goHome(id: EntityId): void {
    const citizen = this.game.world.getComponent<any>(id, 'citizen')!;
    const family = this.game.world.getComponent<any>(id, 'family');
    if (family?.homeId != null) {
      if (this.isNearBuilding(id, family.homeId)) {
        this.enterBuilding(id, family.homeId);
        const needs = this.game.world.getComponent<any>(id, 'needs');
        if (needs) {
          needs.warmth = Math.min(100, needs.warmth + HOME_WARMTH_GAIN);
        }
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.stuckTicks = 0;
        return;
      }
      if (this.goToBuilding(id, family.homeId)) return;
    }

    const house = this.findAvailableHouse(id);
    if (house !== null) {
      if (this.isNearBuilding(id, house)) {
        this.enterBuilding(id, house);
        return;
      }
      if (this.goToBuilding(id, house)) return;
    }

    this.wander(id);
  }

  /** Try to path to a building. Returns true if a path was set. */
  private goToBuilding(id: EntityId, targetId: EntityId): boolean {
    const pos = this.game.world.getComponent<any>(id, 'position')!;
    const targetPos = this.game.world.getComponent<any>(targetId, 'position');
    if (!targetPos) return false;

    const bld = this.game.world.getComponent<any>(targetId, 'building');
    const bw = bld?.width || 1;
    const bh = bld?.height || 1;

    // Fallback perimeter entry points
    const candidates = [
      { x: targetPos.tileX + Math.floor(bw / 2), y: targetPos.tileY + bh },
      { x: targetPos.tileX + Math.floor(bw / 2), y: targetPos.tileY - 1 },
      { x: targetPos.tileX - 1, y: targetPos.tileY + Math.floor(bh / 2) },
      { x: targetPos.tileX + bw, y: targetPos.tileY + Math.floor(bh / 2) },
      { x: targetPos.tileX, y: targetPos.tileY + bh },
      { x: targetPos.tileX + bw - 1, y: targetPos.tileY + bh },
    ];

    // Prefer door entry tile if available
    const doorDef: DoorDef | undefined = bld?.doorDef;
    if (doorDef) {
      const entry = getDoorEntryTile(targetPos.tileX, targetPos.tileY, doorDef);
      // Prepend door entry, deduplicate
      const isDuplicate = candidates.some(c => c.x === entry.x && c.y === entry.y);
      if (!isDuplicate) {
        candidates.unshift(entry);
      } else {
        // Move the duplicate to front
        const idx = candidates.findIndex(c => c.x === entry.x && c.y === entry.y);
        if (idx > 0) {
          candidates.unshift(candidates.splice(idx, 1)[0]);
        }
      }
    }

    for (const target of candidates) {
      if (!this.game.tileMap.isWalkable(target.x, target.y)) continue;

      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, target.x, target.y);
      if (result.found && result.path.length > 0) {
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.path = result.path;
        movement.targetEntity = targetId;
        movement.stuckTicks = 0;
        return true;
      }
    }

    return false;
  }

  /** Check if a building type represents an indoor (movement-blocking) structure */
  private isIndoorBuilding(type: string): boolean {
    const def = BUILDING_DEFS[type];
    return def ? def.blocksMovement !== false : true;
  }

  /**
   * Try to place a citizen inside a building. Returns true if accepted.
   * Enforces capacity limits — residents and assigned workers are always
   * admitted to their own home/workplace; visitors are turned away when full.
   */
  private enterBuilding(citizenId: EntityId, buildingId: EntityId): boolean {
    const citizen = this.game.world.getComponent<any>(citizenId, 'citizen');
    if (!citizen) return false;

    // Already inside this building
    if (citizen.insideBuildingId === buildingId) return true;

    // Determine capacity
    const bld = this.game.world.getComponent<any>(buildingId, 'building');
    const house = this.game.world.getComponent<any>(buildingId, 'house');
    let capacity: number;
    if (house) {
      capacity = house.maxResidents || 5;
    } else if (bld?.maxWorkers) {
      // Workplaces: workers + a few visitor slots
      capacity = bld.maxWorkers + 3;
    } else {
      // Fallback based on building area (1 per 2 tiles, minimum 4)
      capacity = Math.max(4, Math.floor(((bld?.width || 2) * (bld?.height || 2)) / 2));
    }

    // Check if citizen has a right to enter (resident or assigned worker)
    const family = this.game.world.getComponent<any>(citizenId, 'family');
    const worker = this.game.world.getComponent<any>(citizenId, 'worker');
    const isResident = family?.homeId === buildingId;
    const isWorker = worker?.workplaceId === buildingId;

    // Residents and workers are always admitted
    if (!isResident && !isWorker) {
      // Visitor — check if there's room
      const currentOccupants = this.getBuildingOccupantCount(buildingId);
      if (currentOccupants >= capacity) return false;
    }

    // Exit previous building if entering a different one
    if (citizen.insideBuildingId != null && citizen.insideBuildingId !== buildingId) {
      citizen.insideBuildingId = null;
    }

    citizen.insideBuildingId = buildingId;
    return true;
  }

  /** Remove a citizen from whatever building they are inside */
  private exitBuilding(citizenId: EntityId): void {
    const citizen = this.game.world.getComponent<any>(citizenId, 'citizen');
    if (citizen) citizen.insideBuildingId = null;
  }

  /** Count citizens currently inside a building */
  private getBuildingOccupantCount(buildingId: EntityId): number {
    const citizens = this.game.world.getComponentStore<any>('citizen');
    if (!citizens) return 0;
    let count = 0;
    for (const [, cit] of citizens) {
      if (cit.insideBuildingId === buildingId) count++;
    }
    return count;
  }

  /** Check if citizen is already near a building (within 2 tiles of any edge) */
  private isNearBuilding(citizenId: EntityId, buildingId: EntityId): boolean {
    const pos = this.game.world.getComponent<any>(citizenId, 'position');
    const bPos = this.game.world.getComponent<any>(buildingId, 'position');
    if (!pos || !bPos) return false;

    const bld = this.game.world.getComponent<any>(buildingId, 'building');
    const bw = bld?.width || 1;
    const bh = bld?.height || 1;

    const dx = pos.tileX - bPos.tileX;
    const dy = pos.tileY - bPos.tileY;

    return dx >= -2 && dx <= bw + 1 && dy >= -2 && dy <= bh + 1;
  }

  /** Unassign a worker from their workplace */
  private unassignWorker(id: EntityId, worker: any): void {
    if (worker.workplaceId === null) return;

    const bld = this.game.world.getComponent<any>(worker.workplaceId, 'building');
    if (bld?.assignedWorkers) {
      bld.assignedWorkers = bld.assignedWorkers.filter((w: number) => w !== id);
    }

    worker.workplaceId = null;
    worker.profession = Profession.LABORER;
    worker.manuallyAssigned = false;
  }

  private wander(id: EntityId): void {
    const pos = this.game.world.getComponent<any>(id, 'position')!;

    for (let attempt = 0; attempt < WANDER_ATTEMPTS; attempt++) {
      const ox = this.game.rng.int(-WANDER_RANGE, WANDER_RANGE);
      const oy = this.game.rng.int(-WANDER_RANGE, WANDER_RANGE);
      if (ox === 0 && oy === 0) continue;

      const tx = Math.max(1, Math.min(this.game.tileMap.width - 2, pos.tileX + ox));
      const ty = Math.max(1, Math.min(this.game.tileMap.height - 2, pos.tileY + oy));

      if (!this.game.tileMap.isWalkable(tx, ty)) continue;

      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, tx, ty);
      if (result.found && result.path.length > 1) {
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.path = result.path;
        movement.targetEntity = null;
        movement.stuckTicks = 0;
        return;
      }
    }
  }

  /** Force wander with larger radius */
  private forceWander(id: EntityId): void {
    const pos = this.game.world.getComponent<any>(id, 'position')!;

    for (let attempt = 0; attempt < FORCE_WANDER_ATTEMPTS; attempt++) {
      const ox = this.game.rng.int(-FORCE_WANDER_RANGE, FORCE_WANDER_RANGE);
      const oy = this.game.rng.int(-FORCE_WANDER_RANGE, FORCE_WANDER_RANGE);
      if (Math.abs(ox) < FORCE_WANDER_MIN_DIST && Math.abs(oy) < FORCE_WANDER_MIN_DIST) continue;

      const tx = Math.max(1, Math.min(this.game.tileMap.width - 2, pos.tileX + ox));
      const ty = Math.max(1, Math.min(this.game.tileMap.height - 2, pos.tileY + oy));

      if (!this.game.tileMap.isWalkable(tx, ty)) continue;

      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, tx, ty);
      if (result.found && result.path.length > 1) {
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.path = result.path;
        movement.targetEntity = null;
        return;
      }
    }
  }

  private findNearestConstructionSite(citizenId: EntityId): EntityId | null {
    const pos = this.game.world.getComponent<any>(citizenId, 'position')!;
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    let nearest: EntityId | null = null;
    let nearestDist = Infinity;

    for (const [id, bld] of buildings) {
      if (bld.completed || bld.constructionProgress >= 1) continue;

      const bPos = this.game.world.getComponent<any>(id, 'position');
      if (!bPos) continue;
      const d = distance(pos.tileX, pos.tileY, bPos.tileX, bPos.tileY);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = id;
      }
    }
    return nearest;
  }

  private findBuilding(type: string): EntityId | null {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    for (const [id, bld] of buildings) {
      if (bld.type === type && bld.completed) return id;
    }
    return null;
  }

  /** Find nearest house with available occupant capacity */
  private findAvailableHouse(citizenId: EntityId): EntityId | null {
    const pos = this.game.world.getComponent<any>(citizenId, 'position')!;
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    let nearest: EntityId | null = null;
    let nearestDist = Infinity;

    for (const [id, bld] of buildings) {
      if (bld.type !== BuildingType.WOODEN_HOUSE || !bld.completed) continue;
      const house = this.game.world.getComponent<any>(id, 'house');
      const maxOccupants = house?.maxResidents || bld.residents || 5;
      if (this.getBuildingOccupantCount(id) >= maxOccupants) continue;

      const bPos = this.game.world.getComponent<any>(id, 'position');
      if (!bPos) continue;
      const d = distance(pos.tileX, pos.tileY, bPos.tileX, bPos.tileY);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = id;
      }
    }
    return nearest;
  }

  private professionActivity(profession: string): string {
    switch (profession) {
      case Profession.FARMER: return 'farming';
      case Profession.GATHERER: return 'gathering';
      case Profession.HUNTER: return 'hunting';
      case Profession.FISHERMAN: return 'fishing';
      case Profession.FORESTER: return 'forestry';
      case Profession.WOOD_CUTTER: return 'woodcutting';
      case Profession.BLACKSMITH: return 'smithing';
      case Profession.TAILOR: return 'tailoring';
      case Profession.HERBALIST: return 'healing';
      case Profession.VENDOR: return 'vending';
      case Profession.TEACHER: return 'teaching';
      case Profession.TRADER: return 'trading';
      case Profession.BUILDER: return 'building';
      case Profession.BAKER: return 'baking';
      case Profession.BARKEEP: return 'serving';
      case Profession.HERDER: return 'herding';
      case Profession.DAIRYMAID: return 'dairying';
      default: return 'working';
    }
  }

  private findNearestStorage(citizenId: EntityId): EntityId | null {
    const pos = this.game.world.getComponent<any>(citizenId, 'position')!;
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    let nearest: EntityId | null = null;
    let nearestDist = Infinity;

    for (const [id, bld] of buildings) {
      if (!bld.completed) continue;
      if (bld.type !== BuildingType.STORAGE_BARN &&
          bld.type !== BuildingType.STOCKPILE &&
          bld.type !== BuildingType.MARKET) continue;

      const bPos = this.game.world.getComponent<any>(id, 'position')!;
      const d = distance(pos.tileX, pos.tileY, bPos.tileX, bPos.tileY);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = id;
      }
    }
    return nearest;
  }
}
