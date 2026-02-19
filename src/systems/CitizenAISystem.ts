import type { Game } from '../Game';
import { EntityId } from '../types';
import {
  Profession, TILE_SIZE, BuildingType,
  MEAL_FOOD_THRESHOLD, MEAL_RESTORE, MEAL_COST,
  STARVING_THRESHOLD, TIRED_THRESHOLD, DIET_HISTORY_SIZE,
  SOCIAL_CHAT_RADIUS, SOCIAL_CHAT_CHANCE, SOCIAL_CHAT_DURATION,
  LONELINESS_THRESHOLD, LONELINESS_HAPPINESS_PENALTY,
} from '../constants';
import { distance } from '../utils/MathUtils';

export class CitizenAISystem {
  private game: Game;
  private tickCounter = 0;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    this.tickCounter++;
    // Only run AI decisions every 5 ticks for performance
    if (this.tickCounter % 5 !== 0) return;

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
        citizen.chatTimer -= 5;
        movement.stuckTicks = 0;
        needs.lastSocialTick = this.game.state.tick;
        if (citizen.chatTimer > 0) continue; // Still chatting
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
        }
        // Also wake if starving — survival overrides sleep
        else if (needs.food < STARVING_THRESHOLD) {
          citizen.isSleeping = false;
        }
        else {
          continue; // Stay asleep, skip all other AI
        }
      }

      // Skip if actively moving along a path
      if (movement.path && movement.path.length > 0) {
        movement.stuckTicks = 0;
        continue;
      }

      movement.stuckTicks++;

      // Stuck recovery: if stuck for 50+ AI cycles (250 ticks), force wander
      if (movement.stuckTicks > 50) {
        if (worker?.workplaceId !== null && worker?.workplaceId !== undefined) {
          this.unassignWorker(id, worker);
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
        this.seekFood(id);
        continue;
      }

      // 2. Freezing -> seek warmth (go home)
      if (needs.warmth < 25) {
        this.seekWarmth(id);
        continue;
      }

      // 3. Exhausted during day -> go home and sleep
      if (needs.energy < TIRED_THRESHOLD) {
        this.goSleep(id, citizen);
        continue;
      }

      // 4. Night time -> go home and sleep
      if (this.game.state.isNight) {
        this.goSleep(id, citizen);
        continue;
      }

      // 5. Hungry (meal time) -> eat a meal
      if (needs.food < MEAL_FOOD_THRESHOLD) {
        this.eatMeal(id);
        continue;
      }

      // 6. If assigned to a workplace, go work
      if (worker.workplaceId !== null) {
        if (this.isNearBuilding(id, worker.workplaceId)) {
          movement.stuckTicks = 0; // Working, not stuck
          continue;
        }
        if (!this.goToBuilding(id, worker.workplaceId)) {
          this.unassignWorker(id, worker);
        }
        continue;
      }

      // 7. Laborers look for construction sites
      if (worker.profession === Profession.LABORER) {
        const site = this.findNearestConstructionSite(id);
        if (site !== null) {
          if (this.isNearBuilding(id, site)) {
            movement.stuckTicks = 0;
            continue;
          }
          if (this.goToBuilding(id, site)) continue;
        }
      }

      // 8. Social interaction — chat with nearby citizens
      if (this.trySocialize(id, citizen, needs)) continue;

      // 9. Wander randomly
      this.wander(id);
    }
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

    // School
    if (!citizen.isEducated) {
      const school = this.findBuilding(BuildingType.SCHOOL);
      if (school !== null) {
        if (this.isNearBuilding(id, school)) {
          movement.stuckTicks = 0;
          return;
        }
        if (this.goToBuilding(id, school)) return;
      }
    }

    this.wander(id);
  }

  /** Eat a discrete meal from global food supply, tracking diet variety */
  private eatMeal(id: EntityId): void {
    const totalFood = this.game.getTotalFood();
    if (totalFood >= MEAL_COST) {
      const needs = this.game.world.getComponent<any>(id, 'needs')!;
      if (!needs.recentDiet) needs.recentDiet = [];

      const result = this.game.removeFoodPreferVariety(MEAL_COST, needs.recentDiet);
      if (result.eaten > 0) {
        needs.food = Math.min(100, needs.food + MEAL_RESTORE);
        // Track diet history
        needs.recentDiet.push(result.type);
        if (needs.recentDiet.length > DIET_HISTORY_SIZE) {
          needs.recentDiet.shift();
        }
        return;
      }
    }

    // No food available — walk toward nearest storage
    const storage = this.findNearestStorage(id);
    if (storage !== null) {
      if (!this.isNearBuilding(id, storage)) {
        this.goToBuilding(id, storage);
      }
    } else {
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
        needs.food = Math.min(100, needs.food + MEAL_RESTORE);
        needs.recentDiet.push(result.type);
        if (needs.recentDiet.length > DIET_HISTORY_SIZE) {
          needs.recentDiet.shift();
        }
        return;
      }
    }

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

  /** Try to chat with a nearby citizen */
  private trySocialize(id: EntityId, citizen: any, needs: any): boolean {
    if (Math.random() > SOCIAL_CHAT_CHANCE) return false;

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
        needs.happiness = Math.min(100, needs.happiness + 0.5);
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
        // At home — fall asleep
        citizen.isSleeping = true;
        const needs = this.game.world.getComponent<any>(id, 'needs');
        if (needs) {
          needs.warmth = Math.min(100, needs.warmth + 0.1);
        }
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.stuckTicks = 0;
        return;
      }
      if (this.goToBuilding(id, family.homeId)) return;
    }

    // No home — find any house to sleep near
    const house = this.findBuilding(BuildingType.WOODEN_HOUSE);
    if (house !== null) {
      if (this.isNearBuilding(id, house)) {
        // Sleep near a house even if not assigned
        citizen.isSleeping = true;
        return;
      }
      if (this.goToBuilding(id, house)) return;
    }

    // Truly homeless — sleep where you are if exhausted
    if (this.game.world.getComponent<any>(id, 'needs')!.energy < 5) {
      citizen.isSleeping = true;
      return;
    }

    this.wander(id);
  }

  /** Go home (for warmth). Doesn't trigger sleep. */
  private goHome(id: EntityId): void {
    const family = this.game.world.getComponent<any>(id, 'family');
    if (family?.homeId != null) {
      if (this.isNearBuilding(id, family.homeId)) {
        const needs = this.game.world.getComponent<any>(id, 'needs');
        if (needs) {
          needs.warmth = Math.min(100, needs.warmth + 0.1);
        }
        const movement = this.game.world.getComponent<any>(id, 'movement')!;
        movement.stuckTicks = 0;
        return;
      }
      if (this.goToBuilding(id, family.homeId)) return;
    }

    const house = this.findBuilding(BuildingType.WOODEN_HOUSE);
    if (house !== null) {
      if (this.isNearBuilding(id, house)) return;
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

    const candidates = [
      { x: targetPos.tileX + Math.floor(bw / 2), y: targetPos.tileY + bh },
      { x: targetPos.tileX + Math.floor(bw / 2), y: targetPos.tileY - 1 },
      { x: targetPos.tileX - 1, y: targetPos.tileY + Math.floor(bh / 2) },
      { x: targetPos.tileX + bw, y: targetPos.tileY + Math.floor(bh / 2) },
      { x: targetPos.tileX, y: targetPos.tileY + bh },
      { x: targetPos.tileX + bw - 1, y: targetPos.tileY + bh },
    ];

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
  }

  private wander(id: EntityId): void {
    const pos = this.game.world.getComponent<any>(id, 'position')!;

    for (let attempt = 0; attempt < 3; attempt++) {
      const ox = this.game.rng.int(-6, 6);
      const oy = this.game.rng.int(-6, 6);
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

    for (let attempt = 0; attempt < 8; attempt++) {
      const ox = this.game.rng.int(-15, 15);
      const oy = this.game.rng.int(-15, 15);
      if (Math.abs(ox) < 3 && Math.abs(oy) < 3) continue;

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
