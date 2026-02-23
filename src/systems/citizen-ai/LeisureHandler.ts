import type { Game } from '../../Game';
import type { NavigationHelpers } from './NavigationHelpers';
import type { SocialHandler } from './SocialHandler';
import { EntityId } from '../../types';
import {
  BuildingType, TileType, ResourceType,
  PersonalityTrait,
  AI_TICK_INTERVAL,
  HEATED_BUILDING_TYPES, HEATED_BUILDING_WARMTH_THRESHOLD,
  COLD_PREFER_WARM_BUILDING_THRESHOLD, COLD_WARM_BUILDING_WEIGHT_MULT,
  SKILL_XP_PER_WORK_TICK, SKILL_XP_PER_LEVEL, SKILL_MAX_LEVEL,
  PROFESSION_SKILL_MAP,
  SOCIAL_CHAT_RADIUS, SOCIAL_CHAT_DURATION,
  LEISURE_WEIGHT_READING,
  LEISURE_WEIGHT_TAVERN,
  LEISURE_WEIGHT_EXPLORING,
  LEISURE_WEIGHT_PARTNER,
  LEISURE_WEIGHT_PRACTICING,
  LEISURE_WEIGHT_FISHING,
  LEISURE_WEIGHT_VISITING,
  LEISURE_WEIGHT_NAPPING,
  LEISURE_WEIGHT_MENTORING,
  LEISURE_WEIGHT_CHAPEL,
  LEISURE_WEIGHT_FORAGING,
  LEISURE_WEIGHT_TEACHING,
  LEISURE_WEIGHT_BATHING,
  LEISURE_WEIGHT_MARKET,
  LEISURE_WEIGHT_STARGAZING,
  LEISURE_EXPLORE_ADVENTUROUS_MULT,
  LEISURE_PRACTICE_MIN_SKILL,
  LEISURE_READ_XP_RATE,
  LEISURE_READ_HAPPINESS,
  LEISURE_EXPLORE_GATHER_XP,
  LEISURE_PARTNER_HAPPINESS,
  LEISURE_SOCIALIZE_HAPPINESS,
  LEISURE_PRACTICE_XP_MULT,
  LEISURE_PRACTICE_HAPPINESS,
  LEISURE_FISHING_SCAN_RADIUS,
  LEISURE_FISHING_HAPPINESS,
  LEISURE_FISHING_XP_RATE,
  LEISURE_FISHING_YIELD,
  LEISURE_VISIT_SCAN_RADIUS,
  LEISURE_VISIT_HAPPINESS,
  LEISURE_VISIT_HOST_HAPPINESS,
  LEISURE_NAP_ENERGY_THRESHOLD,
  LEISURE_NAP_DURATION,
  LEISURE_MENTOR_MIN_SKILL,
  LEISURE_MENTOR_XP_BONUS,
  LEISURE_MENTOR_HAPPINESS,
  LEISURE_CHAPEL_HAPPINESS_PER_TICK,
  LEISURE_CHAPEL_HEALTH_PER_TICK,
  LEISURE_FORAGING_SCAN_RADIUS,
  LEISURE_FORAGING_HAPPINESS,
  LEISURE_FORAGING_GATHER_XP,
  LEISURE_FORAGING_YIELD,
  LEISURE_TEACH_SCAN_RADIUS,
  LEISURE_TEACH_HAPPINESS,
  LEISURE_TEACH_CHILD_PROGRESS,
  LEISURE_BATHING_HEALTH,
  LEISURE_BATHING_HAPPINESS,
  LEISURE_MARKET_HAPPINESS,
  LEISURE_STARGAZING_MIN_DAYPROGRESS,
  LEISURE_STARGAZING_HAPPINESS,
  LEISURE_STARGAZING_ADVENTUROUS_MULT,
  LEISURE_WEIGHT_CAMPFIRE,
  LEISURE_CAMPFIRE_SCAN_RADIUS,
  LEISURE_CAMPFIRE_DURATION,
  LEISURE_CAMPFIRE_JOIN_RADIUS,
  LEISURE_CAMPFIRE_MIN_DAYPROGRESS,
  LEISURE_CAMPFIRE_FIREWOOD,
  LEISURE_WEIGHT_HUNTING,
  LEISURE_HUNTING_SCAN_RADIUS,
  LEISURE_HUNTING_HAPPINESS,
  LEISURE_HUNTING_XP_RATE,
  LEISURE_HUNTING_YIELD,
  LEISURE_WEIGHT_SWIMMING,
  LEISURE_SWIMMING_HAPPINESS,
  LEISURE_SWIMMING_HEALTH,
  LEISURE_SWIMMING_ENERGY,
  LEISURE_WEIGHT_GARDENING,
  LEISURE_GARDENING_RADIUS,
  LEISURE_GARDENING_HAPPINESS,
  LEISURE_GARDENING_YIELD,
  LEISURE_WEIGHT_COMFORTING,
  LEISURE_COMFORT_SCAN_RADIUS,
  LEISURE_COMFORT_HAPPINESS_SELF,
  LEISURE_COMFORT_HAPPINESS_SICK,
  LEISURE_COMFORT_HEALTH_SICK,
  LEISURE_PARTNER_WAIT_TICKS,
  LEISURE_SOCIAL_SCAN_RADIUS,
  LEISURE_SOCIAL_INITIATE_CHANCE,
  LEISURE_SOCIAL_RESPOND_CHANCE,
  LEISURE_SOCIAL_RESPOND_CHANCE_WORKING,
  TRAIT_HAPPINESS_GAIN_MULT,
  SkillType,
  TAVERN_HAPPINESS_PER_TICK,
  TAVERN_STAY_DURATION,
} from '../../constants';
import {
  REL_GAIN_SOCIAL_CHAT, REL_GAIN_TAVERN, REL_GAIN_VISIT,
  REL_GAIN_LEISURE_PARTNER,
} from '../../constants';
import { hasTrait, getTraitMult, incrementRelationship } from './CitizenUtils';
import { isOffDuty } from './WorkHoursHelper';

type LeisureActivity =
  | 'reading' | 'at_tavern' | 'exploring' | 'with_partner' | 'practicing'
  | 'fishing' | 'visiting' | 'napping' | 'mentoring' | 'chapel'
  | 'foraging' | 'teaching' | 'bathing' | 'market' | 'stargazing'
  | 'campfire' | 'hunting' | 'swimming' | 'gardening' | 'comforting';

export class LeisureHandler {
  constructor(
    private game: Game,
    private nav: NavigationHelpers,
    private social: SocialHandler,
  ) {}

  /**
   * Handle leisure for an off-duty citizen.
   * Returns true if an activity was assigned (caller should skip remaining AI).
   */
  handleLeisure(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    family: any,
    movement: any,
  ): boolean {
    // 0. Active social walk — already agreed to meet someone; keep walking to them.
    if (citizen.socialTargetId !== undefined) {
      return this.doSocialWalk(id, citizen, needs, movement);
    }

    // 0b. In-progress tavern walk — keep heading there until we arrive.
    if (citizen.leisureTavernId !== undefined) {
      return this.doTavern(id, citizen, needs, movement);
    }

    // 1. Opportunistic proximity socializing — passive check before selecting an activity.
    if (this.tryPassiveSocialize(id, citizen, needs, movement, worker)) return true;

    // 2. Weighted activity selection.
    const activity = this.selectLeisureActivity(id, citizen, needs, worker, family);
    if (!activity) return false;

    switch (activity) {
      case 'reading':      return this.doReading(id, citizen, needs, worker, family, movement);
      case 'at_tavern':    return this.doTavern(id, citizen, needs, movement);
      case 'exploring':    return this.doExploring(id, citizen, needs, worker);
      case 'with_partner': return this.doSpendTimeWithPartner(id, citizen, needs, family, movement);
      case 'practicing':   return this.doPracticing(id, citizen, needs, worker, movement);
      case 'fishing':      return this.doFishing(id, citizen, needs, worker, movement);
      case 'visiting':     return this.doVisitNeighbor(id, citizen, needs, family, movement);
      case 'napping':      return this.doNapping(id, citizen, family, movement);
      case 'mentoring':    return this.doMentoring(id, citizen, needs, worker, movement);
      case 'chapel':       return this.doChapelVisit(id, citizen, needs, movement);
      case 'foraging':     return this.doForaging(id, citizen, needs, worker, movement);
      case 'teaching':     return this.doTeachChild(id, citizen, needs, movement);
      case 'bathing':      return this.doBathing(id, citizen, needs, movement);
      case 'market':       return this.doMarketBrowse(id, citizen, needs, movement);
      case 'stargazing':   return this.doStargazing(id, citizen, needs);
      case 'campfire':     return this.doStorytelling(id, citizen, needs, movement);
      case 'hunting':      return this.doRecreationalHunting(id, citizen, needs, worker, movement);
      case 'swimming':     return this.doSwimming(id, citizen, needs, movement);
      case 'gardening':    return this.doGardening(id, citizen, needs, family, movement);
      case 'comforting':   return this.doComfortSick(id, citizen, needs, movement);
    }
  }

  // ── Activity selection ────────────────────────────────────────

  private selectLeisureActivity(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    family: any,
  ): LeisureActivity | null {
    const options: Array<{ activity: LeisureActivity; weight: number }> = [];

    // reading — needs a home
    if (family?.homeId !== null && family?.homeId !== undefined) {
      options.push({ activity: 'reading', weight: LEISURE_WEIGHT_READING });
    }

    // at_tavern — needs a completed tavern with a barkeep
    if (this.findActiveTavern() !== null) {
      options.push({ activity: 'at_tavern', weight: LEISURE_WEIGHT_TAVERN });
    }

    // exploring — always; ADVENTUROUS gets boosted weight
    const exploreWeight = hasTrait(citizen, PersonalityTrait.ADVENTUROUS)
      ? LEISURE_WEIGHT_EXPLORING * LEISURE_EXPLORE_ADVENTUROUS_MULT
      : LEISURE_WEIGHT_EXPLORING;
    options.push({ activity: 'exploring', weight: exploreWeight });

    // with_partner — needs a living partner sharing the same home
    if (this.hasLivingPartnerAtHome(id, family)) {
      options.push({ activity: 'with_partner', weight: LEISURE_WEIGHT_PARTNER });
    }

    // practicing — needs workplace + skill >= threshold
    if (worker?.workplaceId !== null && worker?.workplaceId !== undefined) {
      if (this.getWorkerSkillLevel(worker) >= LEISURE_PRACTICE_MIN_SKILL) {
        options.push({ activity: 'practicing', weight: LEISURE_WEIGHT_PRACTICING });
      }
    }

    // fishing — always available; ADVENTUROUS also prefers this
    const fishWeight = hasTrait(citizen, PersonalityTrait.ADVENTUROUS)
      ? LEISURE_WEIGHT_FISHING * LEISURE_EXPLORE_ADVENTUROUS_MULT
      : LEISURE_WEIGHT_FISHING;
    options.push({ activity: 'fishing', weight: fishWeight });

    // visiting neighbors — always available
    options.push({ activity: 'visiting', weight: LEISURE_WEIGHT_VISITING });

    // napping — only when tired enough to benefit
    if (needs.energy < LEISURE_NAP_ENERGY_THRESHOLD && family?.homeId) {
      options.push({ activity: 'napping', weight: LEISURE_WEIGHT_NAPPING });
    }

    // mentoring — needs high skill and a different building of the same type
    if (worker?.workplaceId && this.getWorkerSkillLevel(worker) >= LEISURE_MENTOR_MIN_SKILL) {
      options.push({ activity: 'mentoring', weight: LEISURE_WEIGHT_MENTORING });
    }

    // chapel — needs a completed chapel
    if (this.nav.findBuilding(BuildingType.CHAPEL) !== null) {
      options.push({ activity: 'chapel', weight: LEISURE_WEIGHT_CHAPEL });
    }

    // foraging — always available; ADVENTUROUS prefers it
    const foragingWeight = hasTrait(citizen, PersonalityTrait.ADVENTUROUS)
      ? LEISURE_WEIGHT_FORAGING * LEISURE_EXPLORE_ADVENTUROUS_MULT
      : LEISURE_WEIGHT_FORAGING;
    options.push({ activity: 'foraging', weight: foragingWeight });

    // teaching children — only if not a child themselves and uneducated children exist nearby
    if (!citizen.isChild) {
      options.push({ activity: 'teaching', weight: LEISURE_WEIGHT_TEACHING });
    }

    // bathing — always available
    options.push({ activity: 'bathing', weight: LEISURE_WEIGHT_BATHING });

    // market browsing — needs a completed market
    if (this.nav.findBuilding(BuildingType.MARKET) !== null) {
      options.push({ activity: 'market', weight: LEISURE_WEIGHT_MARKET });
    }

    // stargazing — only available after dusk
    if (this.game.state.dayProgress >= LEISURE_STARGAZING_MIN_DAYPROGRESS) {
      options.push({ activity: 'stargazing', weight: LEISURE_WEIGHT_STARGAZING });
    }

    // campfire storytelling — evening only, firewood required (or existing campfire nearby)
    if (this.game.state.dayProgress >= LEISURE_CAMPFIRE_MIN_DAYPROGRESS) {
      options.push({ activity: 'campfire', weight: LEISURE_WEIGHT_CAMPFIRE });
    }

    // recreational hunting — always; ADVENTUROUS bonus
    const huntWeight = hasTrait(citizen, PersonalityTrait.ADVENTUROUS)
      ? LEISURE_WEIGHT_HUNTING * LEISURE_EXPLORE_ADVENTUROUS_MULT
      : LEISURE_WEIGHT_HUNTING;
    options.push({ activity: 'hunting', weight: huntWeight });

    // swimming — always
    options.push({ activity: 'swimming', weight: LEISURE_WEIGHT_SWIMMING });

    // gardening — only if citizen has a home (handler finds fertile tile near it)
    if (family?.homeId !== null && family?.homeId !== undefined) {
      options.push({ activity: 'gardening', weight: LEISURE_WEIGHT_GARDENING });
    }

    // comforting the sick — always (handler finds a sick citizen nearby)
    options.push({ activity: 'comforting', weight: LEISURE_WEIGHT_COMFORTING });

    if (options.length === 0) return null;

    // When cold, boost activities that take place inside heated buildings
    if (needs.warmth < COLD_PREFER_WARM_BUILDING_THRESHOLD) {
      for (const opt of options) {
        let buildingType: string | null = null;
        if (opt.activity === 'at_tavern') buildingType = BuildingType.TAVERN;
        else if (opt.activity === 'chapel') buildingType = BuildingType.CHAPEL;
        if (buildingType && this.isBuildingTypeWarm(buildingType)) {
          opt.weight *= COLD_WARM_BUILDING_WEIGHT_MULT;
        }
      }
    }

    const total = options.reduce((s, o) => s + o.weight, 0);
    let roll = Math.random() * total;
    for (const opt of options) {
      roll -= opt.weight;
      if (roll <= 0) return opt.activity;
    }
    return options[options.length - 1].activity;
  }

  /** Check if any completed building of the given type is warm enough to shelter in. */
  private isBuildingTypeWarm(type: string): boolean {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return false;
    for (const [, bld] of buildings) {
      if (bld.type !== type || !bld.completed) continue;
      if (HEATED_BUILDING_TYPES.has(bld.type) && (bld.warmthLevel ?? 0) > HEATED_BUILDING_WARMTH_THRESHOLD) {
        return true;
      }
    }
    return false;
  }

  // ── Opportunistic socializing ─────────────────────────────────

  /**
   * Passive social encounter: when off-duty, A and B each roll independently.
   * If both pass they agree to walk toward each other and chat on arrival.
   */
  private tryPassiveSocialize(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
    worker: any,
  ): boolean {
    if (Math.random() > LEISURE_SOCIAL_INITIATE_CHANCE) return false;

    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const citizenStore  = this.game.world.getComponentStore<any>('citizen');
    const positionStore = this.game.world.getComponentStore<any>('position');
    const workerStore   = this.game.world.getComponentStore<any>('worker');
    if (!citizenStore || !positionStore) return false;

    for (const [otherId, otherCit] of citizenStore) {
      if (otherId === id) continue;
      if (otherCit.isChild) continue;
      if (otherCit.isSleeping) continue;
      if (otherCit.socialTargetId !== undefined) continue;
      if ((otherCit.chatTimer ?? 0) > 0) continue;

      const otherPos = positionStore.get(otherId);
      if (!otherPos) continue;

      const dx = Math.abs(pos.tileX - otherPos.tileX);
      const dy = Math.abs(pos.tileY - otherPos.tileY);
      if (dx > LEISURE_SOCIAL_SCAN_RADIUS || dy > LEISURE_SOCIAL_SCAN_RADIUS) continue;

      const otherWorker = workerStore?.get(otherId);
      const bOffDuty = !otherWorker
        || isOffDuty(otherWorker.profession, this.game.state.dayProgress, false);
      const bChance = bOffDuty
        ? LEISURE_SOCIAL_RESPOND_CHANCE
        : LEISURE_SOCIAL_RESPOND_CHANCE_WORKING;
      if (Math.random() > bChance) continue;

      // Both agreed — set mutual approach targets
      citizen.socialTargetId  = otherId;
      otherCit.socialTargetId = id;

      citizen.activity = 'socializing';
      const result = this.game.pathfinder.findPath(
        pos.tileX, pos.tileY, otherPos.tileX, otherPos.tileY,
      );
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      }
      return true;
    }
    return false;
  }

  /**
   * Continue walking toward an agreed social partner; chat on arrival.
   */
  private doSocialWalk(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    const targetId  = citizen.socialTargetId as EntityId;
    const targetCit = this.game.world.getComponent<any>(targetId, 'citizen');
    const targetPos = this.game.world.getComponent<any>(targetId, 'position');

    const clearTarget = () => {
      citizen.socialTargetId = undefined;
      if (targetCit?.socialTargetId === id) targetCit.socialTargetId = undefined;
    };

    if (!targetCit || !targetPos) { clearTarget(); return false; }

    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) { clearTarget(); return false; }

    const dx = Math.abs(pos.tileX - targetPos.tileX);
    const dy = Math.abs(pos.tileY - targetPos.tileY);

    if (dx > LEISURE_SOCIAL_SCAN_RADIUS * 2 || dy > LEISURE_SOCIAL_SCAN_RADIUS * 2) {
      clearTarget();
      return false;
    }

    // Close enough — start the chat on both citizens
    if (dx <= SOCIAL_CHAT_RADIUS && dy <= SOCIAL_CHAT_RADIUS) {
      clearTarget();

      citizen.chatTimer   = SOCIAL_CHAT_DURATION;
      targetCit.chatTimer = SOCIAL_CHAT_DURATION;
      needs.lastSocialTick = this.game.state.tick;

      const happyMult = getTraitMult(citizen, TRAIT_HAPPINESS_GAIN_MULT);
      needs.happiness = Math.min(100, needs.happiness + LEISURE_SOCIALIZE_HAPPINESS * AI_TICK_INTERVAL * happyMult);

      incrementRelationship(this.game.world, id, targetId, REL_GAIN_SOCIAL_CHAT);

      citizen.activity = 'chatting';
      return true;
    }

    // Still walking toward them
    citizen.activity = 'socializing';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(
        pos.tileX, pos.tileY, targetPos.tileX, targetPos.tileY,
      );
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        clearTarget();
        return false;
      }
    }
    movement.stuckTicks = 0;
    return true;
  }

  // ── Activity handlers ─────────────────────────────────────────

  private doReading(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    family: any,
    movement: any,
  ): boolean {
    const homeId = family?.homeId;
    if (!homeId) return false;

    if (this.nav.isNearBuilding(id, homeId)) {
      this.nav.enterBuilding(id, homeId);
      citizen.activity = 'reading';
      movement.stuckTicks = 0;

      const skillType = PROFESSION_SKILL_MAP[worker?.profession ?? ''];
      if (skillType && worker) this.grantLeisureXP(worker, skillType, LEISURE_READ_XP_RATE);
      needs.happiness = Math.min(100, needs.happiness + LEISURE_READ_HAPPINESS * AI_TICK_INTERVAL);
      return true;
    }

    citizen.activity = 'going home';
    if (this.nav.goToBuilding(id, homeId)) return true;
    return false;
  }

  private doTavern(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    // Find or reuse a tavern target (persists across AI ticks while walking)
    if (citizen.leisureTavernId === undefined) {
      const tavernId = this.findActiveTavern();
      if (!tavernId) return false;
      citizen.leisureTavernId = tavernId;
    }

    const tavernId = citizen.leisureTavernId as EntityId;

    // Validate the tavern is still active
    const bld = this.game.world.getComponent<any>(tavernId, 'building');
    if (!bld?.completed || bld.type !== BuildingType.TAVERN || !bld.assignedWorkers?.length) {
      citizen.leisureTavernId = undefined;
      return false;
    }

    if (this.nav.isNearBuilding(id, tavernId)) {
      if (!this.nav.enterBuilding(id, tavernId)) {
        // Tavern is at capacity — give up for this visit
        citizen.leisureTavernId = undefined;
        return false;
      }
      citizen.activity = 'drinking';
      movement.stuckTicks = 0;
      // Start a stay timer (handled by CitizenAISystem like campfireTimer)
      citizen.tavernTimer = TAVERN_STAY_DURATION;
      citizen.leisureTavernId = undefined;
      // Boost relationships with all other patrons in the same tavern
      const citizenStore = this.game.world.getComponentStore<any>('citizen');
      if (citizenStore) {
        for (const [otherId, otherCit] of citizenStore) {
          if (otherId === id || otherCit.isChild) continue;
          if (citizen.insideBuildingId && citizen.insideBuildingId === otherCit.insideBuildingId) {
            incrementRelationship(this.game.world, id, otherId, REL_GAIN_TAVERN);
          }
        }
      }
      // Seed the happiness — timer handler continues it each tick
      needs.happiness = Math.min(100, needs.happiness + TAVERN_HAPPINESS_PER_TICK * AI_TICK_INTERVAL);
      needs.lastSocialTick = this.game.state.tick;
      return true;
    }

    // Walking to the tavern
    citizen.activity = 'going to tavern';
    if (this.nav.goToBuilding(id, tavernId)) return true;
    citizen.leisureTavernId = undefined;
    return false;
  }

  private doExploring(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
  ): boolean {
    citizen.activity = 'exploring';

    if (hasTrait(citizen, PersonalityTrait.ADVENTUROUS)) {
      needs.happiness = Math.min(100, needs.happiness + 0.003 * AI_TICK_INTERVAL);
    }
    if (worker) this.grantLeisureXP(worker, SkillType.GATHERING, LEISURE_EXPLORE_GATHER_XP);

    this.nav.wander(id);
    return true;
  }

  private doSpendTimeWithPartner(
    id: EntityId,
    citizen: any,
    needs: any,
    family: any,
    movement: any,
  ): boolean {
    const partnerId = family?.partnerId;
    const homeId    = family?.homeId;
    if (!partnerId || !homeId) return false;

    const partnerFamily = this.game.world.getComponent<any>(partnerId, 'family');
    if (!partnerFamily || partnerFamily.homeId !== homeId) return false;

    const tick = this.game.state.tick;
    if (citizen.leisureStartTick === undefined) citizen.leisureStartTick = tick;

    const partnerCit        = this.game.world.getComponent<any>(partnerId, 'citizen');
    const partnerInBuilding = partnerCit?.insideBuildingId === homeId;

    if (!partnerInBuilding && (tick - citizen.leisureStartTick) > LEISURE_PARTNER_WAIT_TICKS) {
      citizen.leisureStartTick = undefined;
      return false;
    }

    if (this.nav.isNearBuilding(id, homeId)) {
      this.nav.enterBuilding(id, homeId);
      citizen.activity = 'with_partner';
      movement.stuckTicks = 0;

      if (partnerInBuilding) {
        citizen.hadLeisureWithPartner = true;
        if (partnerCit) partnerCit.hadLeisureWithPartner = true;
        needs.happiness = Math.min(100, needs.happiness + LEISURE_PARTNER_HAPPINESS * AI_TICK_INTERVAL);
        incrementRelationship(this.game.world, id, partnerId, REL_GAIN_LEISURE_PARTNER);
        citizen.leisureStartTick = undefined;
      }
      return true;
    }

    citizen.activity = 'going home';
    if (this.nav.goToBuilding(id, homeId)) return true;
    return false;
  }

  private doPracticing(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    movement: any,
  ): boolean {
    const workplaceId = worker?.workplaceId;
    if (!workplaceId) return false;

    if (this.nav.isNearBuilding(id, workplaceId)) {
      citizen.activity = 'practicing';
      movement.stuckTicks = 0;

      const skillType = PROFESSION_SKILL_MAP[worker.profession];
      if (skillType) this.grantLeisureXP(worker, skillType, LEISURE_PRACTICE_XP_MULT);
      needs.happiness = Math.min(100, needs.happiness + LEISURE_PRACTICE_HAPPINESS * AI_TICK_INTERVAL);
      return true;
    }

    citizen.activity = 'practicing';
    if (this.nav.goToBuilding(id, workplaceId)) return true;
    return false;
  }

  /** Walk to the nearest water-adjacent tile and fish recreationally. */
  private doFishing(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    movement: any,
  ): boolean {
    // Use or find a fishing spot
    if (!citizen.leisureFishingSpot || !this.isFishingSpotValid(citizen.leisureFishingSpot)) {
      citizen.leisureFishingSpot = this.findFishingSpot(id);
      if (!citizen.leisureFishingSpot) return false;
    }

    const spot = citizen.leisureFishingSpot;
    const pos  = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - spot.x);
    const dy = Math.abs(pos.tileY - spot.y);

    if (dx <= 1 && dy <= 1) {
      // At the spot — fish
      citizen.activity = 'fishing';
      movement.stuckTicks = 0;

      // Produce a fish if any adjacent tile still has fish
      if (this.hasAdjacentFish(spot.x, spot.y)) {
        this.game.addResource(ResourceType.FISH, LEISURE_FISHING_YIELD);
      }

      needs.happiness = Math.min(100, needs.happiness + LEISURE_FISHING_HAPPINESS * AI_TICK_INTERVAL);
      if (hasTrait(citizen, PersonalityTrait.ADVENTUROUS)) {
        needs.happiness = Math.min(100, needs.happiness + 0.002 * AI_TICK_INTERVAL);
      }

      if (worker) this.grantLeisureXP(worker, SkillType.FISHING, LEISURE_FISHING_XP_RATE);

      // Clear spot after a session so next leisure roll picks freshly
      citizen.leisureFishingSpot = undefined;
      return true;
    }

    // Walk to the fishing spot
    citizen.activity = 'going fishing';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureFishingSpot = undefined;
        return false;
      }
    }
    return true;
  }

  /** Walk to a neighbor's house and sit with the residents. */
  private doVisitNeighbor(
    id: EntityId,
    citizen: any,
    needs: any,
    family: any,
    movement: any,
  ): boolean {
    if (!citizen.leisureVisitTargetId || !this.isHouseStillValid(citizen.leisureVisitTargetId, family)) {
      citizen.leisureVisitTargetId = this.findNeighborHouse(id, family);
      if (!citizen.leisureVisitTargetId) return false;
    }

    const targetId = citizen.leisureVisitTargetId as EntityId;

    if (this.nav.isNearBuilding(id, targetId)) {
      this.nav.enterBuilding(id, targetId);
      citizen.activity = 'visiting';
      movement.stuckTicks = 0;

      // Visitor happiness
      needs.happiness = Math.min(100, needs.happiness + LEISURE_VISIT_HAPPINESS * AI_TICK_INTERVAL);
      needs.lastSocialTick = this.game.state.tick;

      // Host residents benefit and count toward social meetings
      const house = this.game.world.getComponent<any>(targetId, 'house');
      if (house?.residents) {
        for (const residentId of house.residents as EntityId[]) {
          if (residentId === id) continue;
          const residentNeeds = this.game.world.getComponent<any>(residentId, 'needs');
          const residentCit   = this.game.world.getComponent<any>(residentId, 'citizen');
          if (!residentNeeds || !residentCit || residentCit.isChild) continue;

          residentNeeds.happiness = Math.min(100,
            residentNeeds.happiness + LEISURE_VISIT_HOST_HAPPINESS * AI_TICK_INTERVAL);
          residentNeeds.lastSocialTick = this.game.state.tick;

          incrementRelationship(this.game.world, id, residentId, REL_GAIN_VISIT);
        }
      }

      // Clear so next leisure roll picks a different or fresh house
      citizen.leisureVisitTargetId = undefined;
      return true;
    }

    citizen.activity = 'visiting';
    if (this.nav.goToBuilding(id, targetId)) return true;
    citizen.leisureVisitTargetId = undefined;
    return false;
  }

  /** Go home and take a short nap — sets napTimer, which the main AI loop processes. */
  private doNapping(
    id: EntityId,
    citizen: any,
    family: any,
    movement: any,
  ): boolean {
    const homeId = family?.homeId;
    if (!homeId) return false;

    if (this.nav.isNearBuilding(id, homeId)) {
      this.nav.enterBuilding(id, homeId);
      citizen.activity = 'napping';
      citizen.napTimer = LEISURE_NAP_DURATION;
      movement.stuckTicks = 0;
      return true;
    }

    citizen.activity = 'going home';
    if (this.nav.goToBuilding(id, homeId)) return true;
    return false;
  }

  /**
   * High-skill worker visits a colleague's building and grants them a bonus XP rate.
   * The mentor gains happiness; each assigned worker at the target building gets
   * their next skill XP tick multiplied by LEISURE_MENTOR_XP_BONUS.
   */
  private doMentoring(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    movement: any,
  ): boolean {
    if (!worker?.workplaceId) return false;

    if (!citizen.leisureMentoringTargetId
        || !this.isMentoringTargetValid(citizen.leisureMentoringTargetId, worker)) {
      const myBld = this.game.world.getComponent<any>(worker.workplaceId, 'building');
      if (!myBld) return false;
      citizen.leisureMentoringTargetId = this.findMentoringTarget(id, worker.workplaceId, myBld.type);
      if (!citizen.leisureMentoringTargetId) return false;
    }

    const targetId = citizen.leisureMentoringTargetId as EntityId;

    if (this.nav.isNearBuilding(id, targetId)) {
      this.nav.enterBuilding(id, targetId);
      citizen.activity = 'mentoring';
      movement.stuckTicks = 0;

      // Mentor happiness
      needs.happiness = Math.min(100, needs.happiness + LEISURE_MENTOR_HAPPINESS * AI_TICK_INTERVAL);

      // Grant bonus XP to each worker present at the target building
      const targetBld = this.game.world.getComponent<any>(targetId, 'building');
      const workerStore = this.game.world.getComponentStore<any>('worker');
      if (targetBld?.assignedWorkers && workerStore) {
        for (const menteeId of targetBld.assignedWorkers as EntityId[]) {
          if (menteeId === id) continue;
          const menteeWorker = workerStore.get(menteeId);
          if (!menteeWorker) continue;
          const skillType = PROFESSION_SKILL_MAP[menteeWorker.profession];
          if (skillType) this.grantLeisureXP(menteeWorker, skillType, LEISURE_MENTOR_XP_BONUS);
        }
      }

      // Clear so the mentor picks a fresh target next leisure round
      citizen.leisureMentoringTargetId = undefined;
      return true;
    }

    citizen.activity = 'mentoring';
    if (this.nav.goToBuilding(id, targetId)) return true;
    citizen.leisureMentoringTargetId = undefined;
    return false;
  }

  /** Walk to the chapel for quiet reflection — happiness and health recovery. */
  private doChapelVisit(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    const chapelId = this.nav.findBuilding(BuildingType.CHAPEL);
    if (!chapelId) return false;

    if (this.nav.isNearBuilding(id, chapelId)) {
      this.nav.enterBuilding(id, chapelId);
      citizen.activity = 'praying';
      movement.stuckTicks = 0;

      needs.happiness = Math.min(100, needs.happiness + LEISURE_CHAPEL_HAPPINESS_PER_TICK * AI_TICK_INTERVAL);
      needs.health    = Math.min(100, needs.health    + LEISURE_CHAPEL_HEALTH_PER_TICK    * AI_TICK_INTERVAL);
      return true;
    }

    citizen.activity = 'going to chapel';
    if (this.nav.goToBuilding(id, chapelId)) return true;
    return false;
  }

  /** Walk to a forest/fertile tile and gather a small amount of berries or mushrooms. */
  private doForaging(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    movement: any,
  ): boolean {
    if (!citizen.leisureForagingSpot || !this.game.tileMap.isWalkable(citizen.leisureForagingSpot.x, citizen.leisureForagingSpot.y)) {
      citizen.leisureForagingSpot = this.findForagingSpot(id);
      if (!citizen.leisureForagingSpot) return false;
    }

    const spot = citizen.leisureForagingSpot;
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - spot.x);
    const dy = Math.abs(pos.tileY - spot.y);

    if (dx <= 1 && dy <= 1) {
      citizen.activity = 'foraging';
      movement.stuckTicks = 0;

      const tile = this.game.tileMap.get(spot.x, spot.y) as any;
      if (tile) {
        if ((tile.berries ?? 0) > 0) {
          const collected = Math.min(LEISURE_FORAGING_YIELD, tile.berries);
          tile.berries -= collected;
          this.game.addResource(ResourceType.BERRIES, collected);
        } else if ((tile.mushrooms ?? 0) > 0) {
          const collected = Math.min(LEISURE_FORAGING_YIELD, tile.mushrooms);
          tile.mushrooms -= collected;
          this.game.addResource(ResourceType.MUSHROOMS, collected);
        }
      }

      needs.happiness = Math.min(100, needs.happiness + LEISURE_FORAGING_HAPPINESS * AI_TICK_INTERVAL);
      if (hasTrait(citizen, PersonalityTrait.ADVENTUROUS)) {
        needs.happiness = Math.min(100, needs.happiness + 0.002 * AI_TICK_INTERVAL);
      }
      if (worker) this.grantLeisureXP(worker, SkillType.GATHERING, LEISURE_FORAGING_GATHER_XP);

      citizen.leisureForagingSpot = undefined;
      return true;
    }

    citizen.activity = 'foraging';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureForagingSpot = undefined;
        return false;
      }
    }
    return true;
  }

  /**
   * Educated adult finds an uneducated child nearby and informally teaches them,
   * accelerating the child's education progress.
   */
  private doTeachChild(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    // Validate existing target
    if (citizen.leisureTeachTargetId !== undefined) {
      const targetCit = this.game.world.getComponent<any>(citizen.leisureTeachTargetId, 'citizen');
      if (!targetCit || !targetCit.isChild || targetCit.isEducated) {
        citizen.leisureTeachTargetId = undefined;
      }
    }

    if (citizen.leisureTeachTargetId === undefined) {
      citizen.leisureTeachTargetId = this.findTeachableChild(id);
      if (citizen.leisureTeachTargetId === undefined) return false;
    }

    const targetId = citizen.leisureTeachTargetId as EntityId;
    const targetCit = this.game.world.getComponent<any>(targetId, 'citizen');
    const targetPos = this.game.world.getComponent<any>(targetId, 'position');
    if (!targetCit || !targetPos) {
      citizen.leisureTeachTargetId = undefined;
      return false;
    }

    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - targetPos.tileX);
    const dy = Math.abs(pos.tileY - targetPos.tileY);

    if (dx <= 2 && dy <= 2) {
      citizen.activity = 'teaching';
      movement.stuckTicks = 0;

      targetCit.educationProgress = (targetCit.educationProgress ?? 0)
        + LEISURE_TEACH_CHILD_PROGRESS * AI_TICK_INTERVAL;
      needs.happiness = Math.min(100, needs.happiness + LEISURE_TEACH_HAPPINESS * AI_TICK_INTERVAL);
      needs.lastSocialTick = this.game.state.tick;
      return true;
    }

    citizen.activity = 'teaching';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, targetPos.tileX, targetPos.tileY);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureTeachTargetId = undefined;
        return false;
      }
    }
    return true;
  }

  /** Walk to a well or water-adjacent tile; hygiene reduces disease spread chance. */
  private doBathing(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    // Prefer a well/stone_well; fall back to a water-adjacent tile (reuse fishing spot finder)
    if (citizen.leisureBathingSpotId === undefined && !citizen.leisureBathingTile) {
      const wellId = this.nav.findBuilding(BuildingType.WELL)
        ?? this.nav.findBuilding(BuildingType.STONE_WELL);
      if (wellId !== null) {
        citizen.leisureBathingSpotId = wellId;
      } else {
        const tile = this.findFishingSpot(id);
        if (!tile) return false;
        citizen.leisureBathingTile = tile;
      }
    }

    if (citizen.leisureBathingSpotId !== undefined) {
      const wellId = citizen.leisureBathingSpotId as EntityId;
      if (this.nav.isNearBuilding(id, wellId)) {
        this.nav.enterBuilding(id, wellId);
        citizen.activity = 'bathing';
        movement.stuckTicks = 0;

        citizen.lastBatheTick = this.game.state.tick;
        needs.health = Math.min(100, needs.health + LEISURE_BATHING_HEALTH * AI_TICK_INTERVAL);
        needs.happiness = Math.min(100, needs.happiness + LEISURE_BATHING_HAPPINESS * AI_TICK_INTERVAL);
        citizen.leisureBathingSpotId = undefined;
        return true;
      }
      citizen.activity = 'going to bathe';
      if (this.nav.goToBuilding(id, wellId)) return true;
      citizen.leisureBathingSpotId = undefined;
      return false;
    }

    if (citizen.leisureBathingTile) {
      const spot = citizen.leisureBathingTile;
      const pos = this.game.world.getComponent<any>(id, 'position');
      if (!pos) return false;

      const dx = Math.abs(pos.tileX - spot.x);
      const dy = Math.abs(pos.tileY - spot.y);

      if (dx <= 1 && dy <= 1) {
        citizen.activity = 'bathing';
        movement.stuckTicks = 0;

        citizen.lastBatheTick = this.game.state.tick;
        needs.health = Math.min(100, needs.health + LEISURE_BATHING_HEALTH * AI_TICK_INTERVAL);
        needs.happiness = Math.min(100, needs.happiness + LEISURE_BATHING_HAPPINESS * AI_TICK_INTERVAL);
        citizen.leisureBathingTile = undefined;
        return true;
      }

      citizen.activity = 'going to bathe';
      if (!movement.path || movement.path.length === 0) {
        const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
        if (result.found && result.path.length > 0) {
          movement.path = result.path;
          movement.stuckTicks = 0;
        } else {
          citizen.leisureBathingTile = undefined;
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /** Walk to the market and browse — happiness and social contact. */
  private doMarketBrowse(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    const marketId = this.nav.findBuilding(BuildingType.MARKET);
    if (!marketId) return false;

    if (this.nav.isNearBuilding(id, marketId)) {
      this.nav.enterBuilding(id, marketId);
      citizen.activity = 'browsing market';
      movement.stuckTicks = 0;

      needs.happiness = Math.min(100, needs.happiness + LEISURE_MARKET_HAPPINESS * AI_TICK_INTERVAL);
      needs.lastSocialTick = this.game.state.tick;
      return true;
    }

    citizen.activity = 'going to market';
    if (this.nav.goToBuilding(id, marketId)) return true;
    return false;
  }

  /** Look at the stars after dusk — happiness, especially for ADVENTUROUS citizens. */
  private doStargazing(
    id: EntityId,
    citizen: any,
    needs: any,
  ): boolean {
    if (this.game.state.dayProgress < LEISURE_STARGAZING_MIN_DAYPROGRESS) return false;

    citizen.activity = 'stargazing';
    const happyGain = hasTrait(citizen, PersonalityTrait.ADVENTUROUS)
      ? LEISURE_STARGAZING_HAPPINESS * LEISURE_STARGAZING_ADVENTUROUS_MULT
      : LEISURE_STARGAZING_HAPPINESS;
    needs.happiness = Math.min(100, needs.happiness + happyGain * AI_TICK_INTERVAL);

    this.nav.wander(id);
    return true;
  }

  // ── Navigation / lookup helpers ───────────────────────────────

  private findActiveTavern(): EntityId | null {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;
    for (const [bldId, bld] of buildings) {
      if (bld.type !== BuildingType.TAVERN || !bld.completed) continue;
      if ((bld.assignedWorkers?.length ?? 0) === 0) continue;
      return bldId;
    }
    return null;
  }

  private hasLivingPartnerAtHome(id: EntityId, family: any): boolean {
    if (!family?.partnerId || !family?.homeId) return false;
    const partnerFamily = this.game.world.getComponent<any>(family.partnerId, 'family');
    if (!partnerFamily) return false;
    return partnerFamily.homeId === family.homeId;
  }

  /** Find a walkable tile adjacent to a water tile within the fishing scan radius. */
  private findFishingSpot(id: EntityId): { x: number; y: number } | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const R = LEISURE_FISHING_SCAN_RADIUS;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = pos.tileX + dx;
        const y = pos.tileY + dy;
        if (!this.game.tileMap.isWalkable(x, y)) continue;
        if (this.hasAdjacentWater(x, y)) return { x, y };
      }
    }
    return null;
  }

  private isFishingSpotValid(spot: { x: number; y: number }): boolean {
    return this.game.tileMap.isWalkable(spot.x, spot.y) && this.hasAdjacentWater(spot.x, spot.y);
  }

  private hasAdjacentWater(x: number, y: number): boolean {
    for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const tile = this.game.tileMap.get(x + ddx, y + ddy);
      if (tile && (tile.type === TileType.WATER || tile.type === TileType.RIVER)) return true;
    }
    return false;
  }

  private hasAdjacentFish(x: number, y: number): boolean {
    for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const tile = this.game.tileMap.get(x + ddx, y + ddy);
      if (tile && (tile.type === TileType.WATER || tile.type === TileType.RIVER)
          && (tile as any).fish > 0) return true;
    }
    return false;
  }

  /** Find the nearest completed house that isn't the citizen's own and has at least one resident. */
  private findNeighborHouse(id: EntityId, family: any): EntityId | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const buildings = this.game.world.getComponentStore<any>('building');
    const houses    = this.game.world.getComponentStore<any>('house');
    if (!buildings || !houses) return null;

    let nearest: EntityId | null = null;
    let bestDist = Infinity;

    for (const [bldId] of houses) {
      if (bldId === family?.homeId) continue;
      const bld = buildings.get(bldId);
      if (!bld?.completed) continue;
      const house = houses.get(bldId);
      if (!house?.residents?.length) continue;

      const bldPos = this.game.world.getComponent<any>(bldId, 'position');
      if (!bldPos) continue;

      const d = Math.abs(pos.tileX - bldPos.tileX) + Math.abs(pos.tileY - bldPos.tileY);
      if (d > LEISURE_VISIT_SCAN_RADIUS || d >= bestDist) continue;
      bestDist = d;
      nearest = bldId;
    }
    return nearest;
  }

  private isHouseStillValid(bldId: EntityId, family: any): boolean {
    if (bldId === family?.homeId) return false;
    const bld   = this.game.world.getComponent<any>(bldId, 'building');
    const house = this.game.world.getComponent<any>(bldId, 'house');
    return !!bld?.completed && !!house?.residents?.length;
  }

  /** Find a different completed building of the same type as the mentor's workplace. */
  private findMentoringTarget(
    id: EntityId,
    myWorkplaceId: EntityId,
    bldType: string,
  ): EntityId | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    let nearest: EntityId | null = null;
    let bestDist = Infinity;

    for (const [bldId, bld] of buildings) {
      if (bldId === myWorkplaceId) continue;
      if (bld.type !== bldType || !bld.completed) continue;
      if (!bld.assignedWorkers?.length) continue;

      const bldPos = this.game.world.getComponent<any>(bldId, 'position');
      if (!bldPos) continue;

      const d = Math.abs(pos.tileX - bldPos.tileX) + Math.abs(pos.tileY - bldPos.tileY);
      if (d < bestDist) { bestDist = d; nearest = bldId; }
    }
    return nearest;
  }

  private isMentoringTargetValid(bldId: EntityId, worker: any): boolean {
    if (bldId === worker?.workplaceId) return false;
    const bld = this.game.world.getComponent<any>(bldId, 'building');
    const myBld = worker?.workplaceId
      ? this.game.world.getComponent<any>(worker.workplaceId, 'building')
      : null;
    return !!bld?.completed && !!bld?.assignedWorkers?.length && bld.type === myBld?.type;
  }

  /**
   * Start or join a campfire in the evening — stay for LEISURE_CAMPFIRE_DURATION ticks.
   * The first citizen burns 1 firewood to light the fire; joiners piggyback for free.
   * Uses citizen.campfireTimer (processed in CitizenAISystem like napTimer) and
   * citizen.leisureCampfireSpot to persist the fire location across AI ticks.
   */
  private doStorytelling(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    if (this.game.state.dayProgress < LEISURE_CAMPFIRE_MIN_DAYPROGRESS) return false;

    // Find or reuse a campfire spot
    if (!citizen.leisureCampfireSpot) {
      // First look for a neighbour already sitting at a fire
      const joinSpot = this.findNearbyActiveCampfire(id);
      if (joinSpot) {
        citizen.leisureCampfireSpot = joinSpot;
      } else {
        // Start our own — only if firewood is available
        if (this.game.getResource(ResourceType.FIREWOOD) < LEISURE_CAMPFIRE_FIREWOOD) return false;
        const spot = this.findCampfireSpot(id);
        if (!spot) return false;
        citizen.leisureCampfireSpot = spot;
      }
    }

    const spot = citizen.leisureCampfireSpot;
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - spot.x);
    const dy = Math.abs(pos.tileY - spot.y);

    if (dx <= 1 && dy <= 1) {
      // Arrived — light the fire (consume firewood if this citizen hasn't yet)
      if (!citizen.campfireTimerSet) {
        // Check if we're joining an existing fire (someone else lit it) or starting our own
        const joinSpot = this.findNearbyActiveCampfire(id);
        if (!joinSpot) {
          // We're the igniter — consume firewood
          this.game.removeResource(ResourceType.FIREWOOD, LEISURE_CAMPFIRE_FIREWOOD);
        }
        citizen.campfireTimerSet = true;
      }
      citizen.campfireTimer = LEISURE_CAMPFIRE_DURATION;
      citizen.activity = 'storytelling';
      movement.stuckTicks = 0;
      return true;
    }

    // Walk to spot
    citizen.activity = 'going to campfire';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureCampfireSpot = undefined;
        return false;
      }
    }
    return true;
  }

  /**
   * Walk to a tile with wildlife and hunt recreationally — yields 1 venison, gains hunting XP.
   */
  private doRecreationalHunting(
    id: EntityId,
    citizen: any,
    needs: any,
    worker: any,
    movement: any,
  ): boolean {
    if (!citizen.leisureHuntingSpot || !this.isHuntingSpotValid(citizen.leisureHuntingSpot)) {
      citizen.leisureHuntingSpot = this.findHuntingSpot(id);
      if (!citizen.leisureHuntingSpot) return false;
    }

    const spot = citizen.leisureHuntingSpot;
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - spot.x);
    const dy = Math.abs(pos.tileY - spot.y);

    if (dx <= 1 && dy <= 1) {
      citizen.activity = 'hunting';
      movement.stuckTicks = 0;

      const tile = this.game.tileMap.get(spot.x, spot.y) as any;
      if (tile && (tile.wildlife ?? 0) > 0) {
        tile.wildlife = Math.max(0, tile.wildlife - 1);
        this.game.addResource(ResourceType.VENISON, LEISURE_HUNTING_YIELD);
      }

      needs.happiness = Math.min(100, needs.happiness + LEISURE_HUNTING_HAPPINESS * AI_TICK_INTERVAL);
      if (hasTrait(citizen, PersonalityTrait.ADVENTUROUS)) {
        needs.happiness = Math.min(100, needs.happiness + 0.002 * AI_TICK_INTERVAL);
      }
      if (worker) this.grantLeisureXP(worker, SkillType.HUNTING, LEISURE_HUNTING_XP_RATE);

      citizen.leisureHuntingSpot = undefined;
      return true;
    }

    citizen.activity = 'hunting';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureHuntingSpot = undefined;
        return false;
      }
    }
    return true;
  }

  /**
   * Walk to a water-adjacent tile and swim — higher happiness than bathing, plus energy recovery.
   * No disease resistance effect (that's for bathing/hygiene).
   */
  private doSwimming(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    if (!citizen.leisureSwimmingSpot || !this.isFishingSpotValid(citizen.leisureSwimmingSpot)) {
      citizen.leisureSwimmingSpot = this.findFishingSpot(id); // reuse water-adjacent finder
      if (!citizen.leisureSwimmingSpot) return false;
    }

    const spot = citizen.leisureSwimmingSpot;
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - spot.x);
    const dy = Math.abs(pos.tileY - spot.y);

    if (dx <= 1 && dy <= 1) {
      citizen.activity = 'swimming';
      movement.stuckTicks = 0;

      needs.happiness = Math.min(100, needs.happiness + LEISURE_SWIMMING_HAPPINESS * AI_TICK_INTERVAL);
      needs.health    = Math.min(100, needs.health    + LEISURE_SWIMMING_HEALTH    * AI_TICK_INTERVAL);
      needs.energy    = Math.min(100, needs.energy    + LEISURE_SWIMMING_ENERGY    * AI_TICK_INTERVAL);

      citizen.leisureSwimmingSpot = undefined;
      return true;
    }

    citizen.activity = 'going swimming';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureSwimmingSpot = undefined;
        return false;
      }
    }
    return true;
  }

  /**
   * Tend a small garden on a fertile tile near home — yields berries or roots, happiness.
   */
  private doGardening(
    id: EntityId,
    citizen: any,
    needs: any,
    family: any,
    movement: any,
  ): boolean {
    if (!citizen.leisureGardeningSpot || !this.game.tileMap.isWalkable(citizen.leisureGardeningSpot.x, citizen.leisureGardeningSpot.y)) {
      citizen.leisureGardeningSpot = this.findGardenSpot(id, family);
      if (!citizen.leisureGardeningSpot) return false;
    }

    const spot = citizen.leisureGardeningSpot;
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - spot.x);
    const dy = Math.abs(pos.tileY - spot.y);

    if (dx <= 1 && dy <= 1) {
      citizen.activity = 'gardening';
      movement.stuckTicks = 0;

      const tile = this.game.tileMap.get(spot.x, spot.y) as any;
      if (tile) {
        if ((tile.berries ?? 0) > 0) {
          const collected = Math.min(LEISURE_GARDENING_YIELD, tile.berries);
          tile.berries -= collected;
          this.game.addResource(ResourceType.BERRIES, collected);
        } else {
          // No berries — yield roots (representing garden produce) without depleting tile
          this.game.addResource(ResourceType.ROOTS, 1);
        }
      }

      needs.happiness = Math.min(100, needs.happiness + LEISURE_GARDENING_HAPPINESS * AI_TICK_INTERVAL);
      citizen.leisureGardeningSpot = undefined;
      return true;
    }

    citizen.activity = 'gardening';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, spot.x, spot.y);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureGardeningSpot = undefined;
        return false;
      }
    }
    return true;
  }

  /**
   * Find a sick neighbour and sit with them — boosts their happiness and health.
   */
  private doComfortSick(
    id: EntityId,
    citizen: any,
    needs: any,
    movement: any,
  ): boolean {
    // Validate existing target
    if (citizen.leisureComfortTargetId !== undefined) {
      const targetNeeds = this.game.world.getComponent<any>(citizen.leisureComfortTargetId, 'needs');
      if (!targetNeeds?.isSick) citizen.leisureComfortTargetId = undefined;
    }

    if (citizen.leisureComfortTargetId === undefined) {
      citizen.leisureComfortTargetId = this.findSickNeighbour(id);
      if (citizen.leisureComfortTargetId === undefined) return false;
    }

    const targetId = citizen.leisureComfortTargetId as EntityId;
    const targetPos = this.game.world.getComponent<any>(targetId, 'position');
    const targetNeeds = this.game.world.getComponent<any>(targetId, 'needs');
    const targetCit  = this.game.world.getComponent<any>(targetId, 'citizen');

    if (!targetPos || !targetNeeds || !targetCit) {
      citizen.leisureComfortTargetId = undefined;
      return false;
    }

    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return false;

    const dx = Math.abs(pos.tileX - targetPos.tileX);
    const dy = Math.abs(pos.tileY - targetPos.tileY);

    if (dx <= 2 && dy <= 2) {
      citizen.activity = 'comforting';
      movement.stuckTicks = 0;

      // Comfort the sick citizen
      targetNeeds.happiness = Math.min(100,
        targetNeeds.happiness + LEISURE_COMFORT_HAPPINESS_SICK * AI_TICK_INTERVAL);
      targetNeeds.health = Math.min(100,
        targetNeeds.health + LEISURE_COMFORT_HEALTH_SICK * AI_TICK_INTERVAL);
      targetNeeds.lastSocialTick = this.game.state.tick;

      // Comforter also gains happiness
      needs.happiness = Math.min(100,
        needs.happiness + LEISURE_COMFORT_HAPPINESS_SELF * AI_TICK_INTERVAL);
      needs.lastSocialTick = this.game.state.tick;

      // Count as a social interaction
      incrementRelationship(this.game.world, id, targetId, REL_GAIN_SOCIAL_CHAT);

      return true;
    }

    citizen.activity = 'comforting';
    if (!movement.path || movement.path.length === 0) {
      const result = this.game.pathfinder.findPath(pos.tileX, pos.tileY, targetPos.tileX, targetPos.tileY);
      if (result.found && result.path.length > 0) {
        movement.path = result.path;
        movement.stuckTicks = 0;
      } else {
        citizen.leisureComfortTargetId = undefined;
        return false;
      }
    }
    return true;
  }

  // ── Foraging / teaching helpers ──────────────────────────────

  /** Find a walkable FOREST or FERTILE tile within scan radius that has berries or mushrooms. */
  private findForagingSpot(id: EntityId): { x: number; y: number } | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const R = LEISURE_FORAGING_SCAN_RADIUS;
    // First pass: prefer tiles with actual resources
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = pos.tileX + dx;
        const y = pos.tileY + dy;
        if (!this.game.tileMap.isWalkable(x, y)) continue;
        const tile = this.game.tileMap.get(x, y) as any;
        if (!tile) continue;
        if (tile.type === TileType.FOREST || tile.type === TileType.FERTILE) {
          if ((tile.berries ?? 0) > 0 || (tile.mushrooms ?? 0) > 0) return { x, y };
        }
      }
    }
    // Second pass: any accessible forest/fertile tile (will still grant happiness + XP)
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = pos.tileX + dx;
        const y = pos.tileY + dy;
        if (!this.game.tileMap.isWalkable(x, y)) continue;
        const tile = this.game.tileMap.get(x, y) as any;
        if (tile && (tile.type === TileType.FOREST || tile.type === TileType.FERTILE)) return { x, y };
      }
    }
    return null;
  }

  /** Find an uneducated child within the teaching scan radius. */
  private findTeachableChild(id: EntityId): EntityId | undefined {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return undefined;

    const citizenStore  = this.game.world.getComponentStore<any>('citizen');
    const positionStore = this.game.world.getComponentStore<any>('position');
    if (!citizenStore || !positionStore) return undefined;

    for (const [otherId, otherCit] of citizenStore) {
      if (otherId === id) continue;
      if (!otherCit.isChild || otherCit.isEducated) continue;

      const otherPos = positionStore.get(otherId);
      if (!otherPos) continue;

      const dx = Math.abs(pos.tileX - otherPos.tileX);
      const dy = Math.abs(pos.tileY - otherPos.tileY);
      if (dx <= LEISURE_TEACH_SCAN_RADIUS && dy <= LEISURE_TEACH_SCAN_RADIUS) return otherId;
    }
    return undefined;
  }

  // ── Campfire / hunting / garden / sick helpers ───────────────

  /** Find a GRASS tile within scan radius suitable for a campfire. */
  private findCampfireSpot(id: EntityId): { x: number; y: number } | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const R = LEISURE_CAMPFIRE_SCAN_RADIUS;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = pos.tileX + dx;
        const y = pos.tileY + dy;
        if (!this.game.tileMap.isWalkable(x, y)) continue;
        const tile = this.game.tileMap.get(x, y) as any;
        if (tile && tile.type === TileType.GRASS) return { x, y };
      }
    }
    return null;
  }

  /**
   * Scan for a neighbour citizen who has an active campfire (campfireTimer > 0
   * and leisureCampfireSpot set) within the join radius.
   */
  private findNearbyActiveCampfire(id: EntityId): { x: number; y: number } | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const citizenStore = this.game.world.getComponentStore<any>('citizen');
    if (!citizenStore) return null;

    for (const [otherId, otherCit] of citizenStore) {
      if (otherId === id) continue;
      if (!otherCit.leisureCampfireSpot) continue;
      if ((otherCit.campfireTimer ?? 0) <= 0) continue;

      const spot = otherCit.leisureCampfireSpot;
      const dx = Math.abs(pos.tileX - spot.x);
      const dy = Math.abs(pos.tileY - spot.y);
      if (dx <= LEISURE_CAMPFIRE_JOIN_RADIUS && dy <= LEISURE_CAMPFIRE_JOIN_RADIUS) {
        return spot;
      }
    }
    return null;
  }

  /** Find a walkable GRASS or FOREST tile with wildlife within hunting scan radius. */
  private findHuntingSpot(id: EntityId): { x: number; y: number } | null {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return null;

    const R = LEISURE_HUNTING_SCAN_RADIUS;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = pos.tileX + dx;
        const y = pos.tileY + dy;
        if (!this.game.tileMap.isWalkable(x, y)) continue;
        const tile = this.game.tileMap.get(x, y) as any;
        if (!tile) continue;
        if ((tile.type === TileType.GRASS || tile.type === TileType.FOREST)
            && (tile.wildlife ?? 0) > 0) return { x, y };
      }
    }
    return null;
  }

  private isHuntingSpotValid(spot: { x: number; y: number }): boolean {
    if (!this.game.tileMap.isWalkable(spot.x, spot.y)) return false;
    const tile = this.game.tileMap.get(spot.x, spot.y) as any;
    return tile && (tile.wildlife ?? 0) > 0;
  }

  /** Find a walkable FERTILE tile within LEISURE_GARDENING_RADIUS of the citizen's home. */
  private findGardenSpot(id: EntityId, family: any): { x: number; y: number } | null {
    const homeId = family?.homeId;
    if (!homeId) return null;

    const homePos = this.game.world.getComponent<any>(homeId, 'position');
    if (!homePos) return null;

    const R = LEISURE_GARDENING_RADIUS;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const x = homePos.tileX + dx;
        const y = homePos.tileY + dy;
        if (!this.game.tileMap.isWalkable(x, y)) continue;
        const tile = this.game.tileMap.get(x, y) as any;
        if (tile && tile.type === TileType.FERTILE) return { x, y };
      }
    }
    return null;
  }

  /** Find a sick adult citizen within LEISURE_COMFORT_SCAN_RADIUS. */
  private findSickNeighbour(id: EntityId): EntityId | undefined {
    const pos = this.game.world.getComponent<any>(id, 'position');
    if (!pos) return undefined;

    const citizenStore  = this.game.world.getComponentStore<any>('citizen');
    const needsStore    = this.game.world.getComponentStore<any>('needs');
    const positionStore = this.game.world.getComponentStore<any>('position');
    if (!citizenStore || !needsStore || !positionStore) return undefined;

    for (const [otherId, otherCit] of citizenStore) {
      if (otherId === id) continue;
      if (otherCit.isChild) continue;

      const otherNeeds = needsStore.get(otherId);
      if (!otherNeeds?.isSick) continue;

      const otherPos = positionStore.get(otherId);
      if (!otherPos) continue;

      const dx = Math.abs(pos.tileX - otherPos.tileX);
      const dy = Math.abs(pos.tileY - otherPos.tileY);
      if (dx <= LEISURE_COMFORT_SCAN_RADIUS && dy <= LEISURE_COMFORT_SCAN_RADIUS) return otherId;
    }
    return undefined;
  }

  // ── XP / skill helpers ────────────────────────────────────────

  private getWorkerSkillLevel(worker: any): number {
    const skillType = PROFESSION_SKILL_MAP[worker.profession ?? ''];
    if (!skillType || !worker.skills?.[skillType]) return 0;
    return worker.skills[skillType].level;
  }

  private grantLeisureXP(worker: any, skillType: string, rateMult: number): void {
    if (!worker.skills) worker.skills = {};
    if (!worker.skills[skillType]) worker.skills[skillType] = { xp: 0, level: 0 };
    const skill = worker.skills[skillType];
    if (skill.level >= SKILL_MAX_LEVEL) return;
    skill.xp += SKILL_XP_PER_WORK_TICK * rateMult * AI_TICK_INTERVAL;
    if (skill.xp >= SKILL_XP_PER_LEVEL) {
      skill.xp -= SKILL_XP_PER_LEVEL;
      skill.level = Math.min(SKILL_MAX_LEVEL, skill.level + 1);
    }
  }
}
