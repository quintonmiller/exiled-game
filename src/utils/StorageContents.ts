import type { World } from '../ecs/World';
import type { EntityId } from '../types';
import { RESOURCE_DEFS } from '../data/ResourceDefs';

export interface StorageIconToken {
  resource: string;
  label: string;
  color: string;
}

export interface StorageContentItem {
  resource: string;
  name: string;
  label: string;
  color: string;
  amount: number;
}

export interface StorageContentEstimate {
  usesGlobalEstimate: boolean;
  capacity: number;
  estimatedUsed: number;
  fillRatio: number;
  unitsPerIcon: number;
  icons: StorageIconToken[];
  topContents: StorageContentItem[];
}

const STORAGE_ICON_BUNDLE_UNITS = 100;

const RESOURCE_COLORS: Record<string, string> = {
  log: '#8b5a2b',
  stone: '#9a9a9a',
  iron: '#776655',
  firewood: '#cc8844',
  tool: '#bbbbbb',
  coat: '#5577aa',
  herbs: '#55aa55',
  leather: '#a07040',
  berries: '#cc4455',
  mushrooms: '#9a7a44',
  roots: '#b08b5a',
  venison: '#bb6644',
  fish: '#5599cc',
  wheat: '#d2b55b',
  cabbage: '#77aa55',
  potato: '#a68b5b',
  bread: '#d8a96a',
  fish_stew: '#88aa77',
  berry_pie: '#cc7799',
  vegetable_soup: '#8faa66',
  eggs: '#e8e2b8',
  milk: '#f2f2ea',
  cheese: '#f0d36e',
  feathers: '#d7dbe8',
  hay: '#c9b24f',
  wool: '#f0f0f0',
  cloth: '#a7bdd1',
};

const RESOURCE_LABELS: Record<string, string> = {
  log: 'LG',
  stone: 'ST',
  iron: 'IR',
  firewood: 'FW',
  tool: 'TL',
  coat: 'CT',
  herbs: 'HB',
  leather: 'LE',
  berries: 'BE',
  mushrooms: 'MU',
  roots: 'RT',
  venison: 'VN',
  fish: 'FI',
  wheat: 'WH',
  cabbage: 'CB',
  potato: 'PT',
  bread: 'BR',
  fish_stew: 'FS',
  berry_pie: 'BP',
  vegetable_soup: 'VS',
  eggs: 'EG',
  milk: 'MK',
  cheese: 'CH',
  feathers: 'FE',
  hay: 'HY',
  wool: 'WO',
  cloth: 'CL',
};

function formatFallbackName(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFallbackLabel(key: string): string {
  const parts = key.split('_');
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  return key.slice(0, 2).toUpperCase();
}

function sumInventory(inventory: Record<string, number>): number {
  return Object.values(inventory).reduce((a, b) => a + b, 0);
}

function allocateIcons(items: StorageContentItem[], iconBudget: number, unitsPerIcon: number): number[] {
  if (items.length === 0 || iconBudget <= 0) return [];

  const desired = items.map((item) => item.amount / unitsPerIcon);
  const counts: number[] = desired.map((v) => Math.floor(v));
  const fractions = desired.map((v, i) => ({ idx: i, frac: v - counts[i] }));

  let used = counts.reduce((a, b) => a + b, 0);

  if (used > iconBudget) {
    const order = fractions
      .map((entry) => ({ ...entry, amount: items[entry.idx].amount }))
      .sort((a, b) => (a.frac - b.frac) || (a.amount - b.amount));
    let cursor = 0;
    while (used > iconBudget && cursor < order.length * 3) {
      const idx = order[cursor % order.length].idx;
      if (counts[idx] > 0) {
        counts[idx] -= 1;
        used -= 1;
      }
      cursor += 1;
    }
  }

  if (used < iconBudget) {
    const order = fractions
      .map((entry) => ({ ...entry, amount: items[entry.idx].amount }))
      .sort((a, b) => (b.frac - a.frac) || (b.amount - a.amount));
    let cursor = 0;
    while (used < iconBudget && order.length > 0) {
      const idx = order[cursor % order.length].idx;
      counts[idx] += 1;
      used += 1;
      cursor += 1;
    }
  }

  if (counts.reduce((total, value) => total + value, 0) === 0) {
    let best = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i].amount > items[best].amount) best = i;
    }
    counts[best] = 1;
  }

  return counts;
}

function resolveResourceVisual(resource: string): { name: string; label: string; color: string } {
  const def = RESOURCE_DEFS[resource];
  return {
    name: def?.name || formatFallbackName(resource),
    label: RESOURCE_LABELS[resource] || buildFallbackLabel(resource),
    color: RESOURCE_COLORS[resource] || '#8899aa',
  };
}

/** Build a per-building storage snapshot from the building's real inventory. */
export function estimateStorageContentsForBuilding(
  world: World,
  _globalResources: Map<string, number>,
  buildingId: EntityId,
  maxContents = 5,
  maxIcons = 12,
): StorageContentEstimate | null {
  const building = world.getComponent<any>(buildingId, 'building');
  if (!building || !building.completed || !building.isStorage) return null;

  const storage = world.getComponent<any>(buildingId, 'storage');
  if (!storage) return null;

  const inventory = storage.inventory as Record<string, number>;
  const capacity: number = storage.capacity || building.storageCapacity || 0;
  const usedTotal = sumInventory(inventory);
  const fillRatio = capacity > 0 ? Math.min(1, usedTotal / capacity) : 0;

  const contentItems: StorageContentItem[] = [];
  for (const [resource, amount] of Object.entries(inventory)) {
    if (amount <= 0) continue;
    const visual = resolveResourceVisual(resource);
    contentItems.push({
      resource,
      name: visual.name,
      label: visual.label,
      color: visual.color,
      amount,
    });
  }

  contentItems.sort((a, b) => b.amount - a.amount);
  const topContents = contentItems.slice(0, maxContents);

  const unitsPerIcon = STORAGE_ICON_BUNDLE_UNITS;
  const rawBudget = Math.round(usedTotal / unitsPerIcon);
  const iconBudget = usedTotal > 0 ? Math.max(1, Math.min(maxIcons, rawBudget)) : 0;
  const counts = allocateIcons(topContents, iconBudget, unitsPerIcon);

  const icons: StorageIconToken[] = [];
  for (let i = 0; i < topContents.length; i++) {
    const item = topContents[i];
    const count = counts[i] || 0;
    for (let n = 0; n < count; n++) {
      icons.push({
        resource: item.resource,
        label: item.label,
        color: item.color,
      });
    }
  }

  return {
    usesGlobalEstimate: false,
    capacity,
    estimatedUsed: usedTotal,
    fillRatio,
    unitsPerIcon,
    icons,
    topContents,
  };
}
