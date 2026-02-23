import { World } from './ecs/World';
import { EntityId, CitizenRenderData, BuildingRenderData, TravelerRenderData } from './types';
import { BuildingType, HEATED_BUILDING_TYPES } from './constants';
import { estimateStorageContentsForBuilding } from './utils/StorageContents';

const MINE_BUILDING_TYPES_SET = new Set([BuildingType.QUARRY, BuildingType.MINE]);

/** Gather citizen data for the render pass (pure query, no side effects) */
export function getCitizenRenderData(world: World): CitizenRenderData[] {
  const result: CitizenRenderData[] = [];
  const positions = world.getComponentStore<any>('position');
  const citizens = world.getComponentStore<any>('citizen');
  const needs = world.getComponentStore<any>('needs');
  const families = world.getComponentStore<any>('family');

  if (!positions || !citizens) return result;

  for (const [id, cit] of citizens) {
    const pos = positions.get(id);
    if (!pos) continue;
    // Skip citizens who are inside a building (sleeping, working, etc.)
    if (cit.insideBuildingId != null) continue;
    const need = needs?.get(id);
    const fam = families?.get(id);
    result.push({
      id,
      x: pos.tileX,
      y: pos.tileY,
      isMale: cit.isMale,
      isChild: cit.isChild,
      health: need?.health ?? 100,
      isSleeping: cit.isSleeping ?? false,
      isSick: need?.isSick ?? false,
      isChatting: (cit.chatTimer ?? 0) > 0,
      activity: cit.activity ?? 'idle',
      isPregnant: fam?.isPregnant ?? false,
    });
  }
  return result;
}

/** Gather traveler data for the render pass (pure query, no side effects) */
export function getTravelerRenderData(world: World): TravelerRenderData[] {
  const result: TravelerRenderData[] = [];
  const positions = world.getComponentStore<any>('position');
  const travelers = world.getComponentStore<any>('traveler');

  if (!positions || !travelers) return result;

  for (const [id, traveler] of travelers) {
    const pos = positions.get(id);
    if (!pos) continue;
    result.push({
      id,
      x: pos.tileX,
      y: pos.tileY,
      travelType: traveler.travelType || 'pass_through',
    });
  }
  return result;
}

/** Gather building data for the render pass (pure query, no side effects) */
export function getBuildingRenderData(
  world: World,
  assigningWorker: EntityId | null,
  globalResources: Map<string, number>,
): BuildingRenderData[] {
  const result: BuildingRenderData[] = [];
  const positions = world.getComponentStore<any>('position');
  const buildings = world.getComponentStore<any>('building');

  if (!positions || !buildings) return result;

  // Pre-compute occupants inside each building
  const citizenStore = world.getComponentStore<any>('citizen');
  const occupantMap = new Map<EntityId, Array<{ isMale: boolean; isChild: boolean }>>();
  if (citizenStore) {
    for (const [, cit] of citizenStore) {
      if (cit.insideBuildingId != null) {
        let arr = occupantMap.get(cit.insideBuildingId);
        if (!arr) { arr = []; occupantMap.set(cit.insideBuildingId, arr); }
        arr.push({ isMale: cit.isMale, isChild: cit.isChild ?? false });
      }
    }
  }

  const assigning = assigningWorker !== null;

  for (const [id, bld] of buildings) {
    const pos = positions.get(id);
    if (!pos) continue;

    let isValidTarget: boolean | undefined;
    let isFullOrInvalid: boolean | undefined;

    if (assigning) {
      if (bld.completed && bld.maxWorkers > 0) {
        const currentWorkers = bld.assignedWorkers?.length || 0;
        if (currentWorkers < bld.maxWorkers) {
          isValidTarget = true;
        } else {
          isFullOrInvalid = true;
        }
      } else {
        isFullOrInvalid = true;
      }
    }

    // Get crop stage if this is a crop field
    let cropStage: number | undefined;
    let mineVeinRatio: number | undefined;
    const producer = world.getComponent<any>(id, 'producer');
    if (bld.type === BuildingType.CROP_FIELD && producer) {
      cropStage = producer.cropStage;
    }
    if (MINE_BUILDING_TYPES_SET.has(bld.type) && producer) {
      const remaining = bld.type === BuildingType.QUARRY
        ? (producer.undergroundStone ?? 0)
        : (producer.undergroundIron ?? 0);
      const max = producer.maxUnderground ?? 1;
      mineVeinRatio = max > 0 ? Math.max(0, remaining / max) : 0;
    }

    const storageEstimate = estimateStorageContentsForBuilding(world, globalResources, id, 5, 12);

    result.push({
      id,
      x: pos.tileX,
      y: pos.tileY,
      w: bld.width,
      h: bld.height,
      category: bld.category,
      completed: bld.completed,
      progress: bld.constructionProgress,
      name: bld.name,
      type: bld.type,
      isValidTarget,
      isFullOrInvalid,
      cropStage,
      mineVeinRatio,
      doorDef: bld.doorDef,
      isUpgrading: bld.isUpgrading || false,
      upgradeProgress: bld.upgradeProgress ?? 0,
      storageVisual: storageEstimate ? {
        usesGlobalEstimate: storageEstimate.usesGlobalEstimate,
        fillRatio: storageEstimate.fillRatio,
        unitsPerIcon: storageEstimate.unitsPerIcon,
        icons: storageEstimate.icons,
      } : undefined,
      occupants: occupantMap.get(id),
      warmthLevel: HEATED_BUILDING_TYPES.has(bld.type) ? (bld.warmthLevel ?? 0) : undefined,
    });
  }
  return result;
}
