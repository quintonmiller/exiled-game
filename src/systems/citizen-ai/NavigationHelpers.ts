import type { Game } from '../../Game';
import { EntityId, DoorDef } from '../../types';
import { getDoorEntryTile } from '../../utils/DoorUtils';
import { BUILDING_DEFS } from '../../data/BuildingDefs';
import {
  BuildingType,
  WANDER_ATTEMPTS, WANDER_RANGE,
  FORCE_WANDER_ATTEMPTS, FORCE_WANDER_RANGE, FORCE_WANDER_MIN_DIST,
} from '../../constants';
import { distance } from '../../utils/MathUtils';

export class NavigationHelpers {
  constructor(private game: Game) {}

  /** Try to path to a building. Returns true if a path was set. */
  goToBuilding(id: EntityId, targetId: EntityId): boolean {
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
  isIndoorBuilding(type: string): boolean {
    const def = BUILDING_DEFS[type];
    return def ? def.blocksMovement !== false : true;
  }

  /**
   * Try to place a citizen inside a building. Returns true if accepted.
   * Enforces capacity limits — residents and assigned workers are always
   * admitted to their own home/workplace; visitors are turned away when full.
   */
  enterBuilding(citizenId: EntityId, buildingId: EntityId): boolean {
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
  exitBuilding(citizenId: EntityId): void {
    const citizen = this.game.world.getComponent<any>(citizenId, 'citizen');
    if (citizen) citizen.insideBuildingId = null;
  }

  /** Count citizens currently inside a building */
  getBuildingOccupantCount(buildingId: EntityId): number {
    const citizens = this.game.world.getComponentStore<any>('citizen');
    if (!citizens) return 0;
    let count = 0;
    for (const [, cit] of citizens) {
      if (cit.insideBuildingId === buildingId) count++;
    }
    return count;
  }

  /** Check if citizen is already near a building (within 2 tiles of any edge) */
  isNearBuilding(citizenId: EntityId, buildingId: EntityId): boolean {
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

  findBuilding(type: string): EntityId | null {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return null;

    for (const [id, bld] of buildings) {
      if (bld.type === type && bld.completed) return id;
    }
    return null;
  }

  /** Find nearest house with available occupant capacity */
  findAvailableHouse(citizenId: EntityId): EntityId | null {
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

  findNearestStorage(citizenId: EntityId): EntityId | null {
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

  findNearestConstructionSite(citizenId: EntityId): EntityId | null {
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

  wander(id: EntityId): void {
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
  forceWander(id: EntityId): void {
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
}
