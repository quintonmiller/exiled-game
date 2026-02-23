import type { Game } from '../../Game';
import {
  Profession,
  URGENT_RESOURCE_PER_VILLAGER,
  URGENT_FOOD_PER_VILLAGER,
  BUILDING_LIMIT_RESOURCES,
} from '../../constants';

interface WorkWindow {
  idealStart: number;
  idealEnd: number;
  extStart: number;
  extEnd: number;
}

/** Per-profession work-hour windows (as dayProgress fractions 0..1) */
export const WORK_HOURS: Partial<Record<string, WorkWindow>> = {
  [Profession.BAKER]:    { idealStart: 0.10, idealEnd: 0.50, extStart: 0.05, extEnd: 0.65 },
  [Profession.BARKEEP]: { idealStart: 0.55, idealEnd: 0.92, extStart: 0.45, extEnd: 0.95 },
  [Profession.FARMER]:  { idealStart: 0.20, idealEnd: 0.55, extStart: 0.15, extEnd: 0.70 },
  [Profession.MINER]:   { idealStart: 0.20, idealEnd: 0.70, extStart: 0.15, extEnd: 0.80 },
  [Profession.LABORER]: { idealStart: 0.20, idealEnd: 0.70, extStart: 0.15, extEnd: 0.80 },
  [Profession.BUILDER]: { idealStart: 0.20, idealEnd: 0.70, extStart: 0.15, extEnd: 0.80 },
};

const DEFAULT_WINDOW: WorkWindow = {
  idealStart: 0.20, idealEnd: 0.65,
  extStart:   0.15, extEnd:   0.75,
};

/** Returns true if the citizen should be off duty right now */
export function isOffDuty(profession: string, dayProgress: number, urgent: boolean): boolean {
  const w = WORK_HOURS[profession] ?? DEFAULT_WINDOW;
  const start = urgent ? w.extStart : w.idealStart;
  const end   = urgent ? w.extEnd   : w.idealEnd;
  return dayProgress < start || dayProgress > end;
}

/** Returns true if the worker's role is in a critical shortage state */
export function isUrgent(game: Game, worker: any, bld: any): boolean {
  const profession: string = worker?.profession ?? '';

  if (profession === Profession.LABORER || profession === Profession.BUILDER) {
    // Urgent if any construction or upgrade site exists
    const buildingStore = game.world.getComponentStore<any>('building');
    if (buildingStore) {
      for (const [, b] of buildingStore) {
        if (!b.completed || b.isUpgrading) return true;
      }
    }
    return false;
  }

  // Gathering professions — check if the stock is critically low
  if (bld) {
    const resources = BUILDING_LIMIT_RESOURCES[bld.type as string];
    if (resources && resources.length > 0) {
      const population = Math.max(1, game.state.population);
      const total = resources.reduce((sum: number, r: string) => sum + game.getResource(r), 0);
      return total < URGENT_RESOURCE_PER_VILLAGER * population;
    }
  }

  // Food producers (farmer, baker)
  if (profession === Profession.FARMER || profession === Profession.BAKER) {
    const population = Math.max(1, game.state.population);
    return game.getTotalFood() / population < URGENT_FOOD_PER_VILLAGER;
  }

  return false;
}
