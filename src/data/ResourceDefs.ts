import { ResourceType } from '../constants';

export interface ResourceDef {
  type: ResourceType;
  name: string;
  category: 'raw' | 'food' | 'processed';
  weight: number;
  tradeValue: number;
}

export const RESOURCE_DEFS: Record<string, ResourceDef> = {
  [ResourceType.LOG]: { type: ResourceType.LOG, name: 'Log', category: 'raw', weight: 10, tradeValue: 3 },
  [ResourceType.STONE]: { type: ResourceType.STONE, name: 'Stone', category: 'raw', weight: 12, tradeValue: 4 },
  [ResourceType.IRON]: { type: ResourceType.IRON, name: 'Iron', category: 'raw', weight: 15, tradeValue: 8 },
  [ResourceType.FIREWOOD]: { type: ResourceType.FIREWOOD, name: 'Firewood', category: 'processed', weight: 4, tradeValue: 2 },
  [ResourceType.TOOL]: { type: ResourceType.TOOL, name: 'Tool', category: 'processed', weight: 5, tradeValue: 12 },
  [ResourceType.COAT]: { type: ResourceType.COAT, name: 'Coat', category: 'processed', weight: 3, tradeValue: 15 },
  [ResourceType.HERBS]: { type: ResourceType.HERBS, name: 'Herbs', category: 'processed', weight: 1, tradeValue: 5 },
  [ResourceType.LEATHER]: { type: ResourceType.LEATHER, name: 'Leather', category: 'raw', weight: 5, tradeValue: 6 },
  [ResourceType.BERRIES]: { type: ResourceType.BERRIES, name: 'Berries', category: 'food', weight: 1, tradeValue: 1 },
  [ResourceType.MUSHROOMS]: { type: ResourceType.MUSHROOMS, name: 'Mushrooms', category: 'food', weight: 1, tradeValue: 1 },
  [ResourceType.ROOTS]: { type: ResourceType.ROOTS, name: 'Roots', category: 'food', weight: 1, tradeValue: 1 },
  [ResourceType.VENISON]: { type: ResourceType.VENISON, name: 'Venison', category: 'food', weight: 3, tradeValue: 3 },
  [ResourceType.FISH]: { type: ResourceType.FISH, name: 'Fish', category: 'food', weight: 2, tradeValue: 2 },
  [ResourceType.WHEAT]: { type: ResourceType.WHEAT, name: 'Wheat', category: 'food', weight: 1, tradeValue: 2 },
  [ResourceType.CABBAGE]: { type: ResourceType.CABBAGE, name: 'Cabbage', category: 'food', weight: 1, tradeValue: 1 },
  [ResourceType.POTATO]: { type: ResourceType.POTATO, name: 'Potato', category: 'food', weight: 1, tradeValue: 1 },
};
