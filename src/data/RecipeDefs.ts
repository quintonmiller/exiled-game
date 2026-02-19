import { BuildingType, ResourceType } from '../constants';
import { RecipeDef } from '../types';

export const RECIPE_DEFS: RecipeDef[] = [
  // Gathering Hut: collects from forest
  {
    buildingType: BuildingType.GATHERING_HUT,
    inputs: {},
    outputs: { [ResourceType.BERRIES]: 3, [ResourceType.MUSHROOMS]: 2, [ResourceType.ROOTS]: 2 },
    cooldownTicks: 120, // 12 seconds
    seasonalMultiplier: true,
    gatherFromRadius: true,
  },
  // Hunting Cabin: produces venison + leather
  {
    buildingType: BuildingType.HUNTING_CABIN,
    inputs: {},
    outputs: { [ResourceType.VENISON]: 4, [ResourceType.LEATHER]: 1 },
    cooldownTicks: 150,
    seasonalMultiplier: true,
    gatherFromRadius: true,
  },
  // Fishing Dock: produces fish
  {
    buildingType: BuildingType.FISHING_DOCK,
    inputs: {},
    outputs: { [ResourceType.FISH]: 5 },
    cooldownTicks: 100,
  },
  // Forester Lodge: produces logs from forest
  {
    buildingType: BuildingType.FORESTER_LODGE,
    inputs: {},
    outputs: { [ResourceType.LOG]: 3 },
    cooldownTicks: 120,
    gatherFromRadius: true,
  },
  // Wood Cutter: log → firewood
  {
    buildingType: BuildingType.WOOD_CUTTER,
    inputs: { [ResourceType.LOG]: 1 },
    outputs: { [ResourceType.FIREWOOD]: 3 },
    cooldownTicks: 80,
  },
  // Blacksmith: iron + log → tool
  {
    buildingType: BuildingType.BLACKSMITH,
    inputs: { [ResourceType.IRON]: 1, [ResourceType.LOG]: 1 },
    outputs: { [ResourceType.TOOL]: 1 },
    cooldownTicks: 200,
  },
  // Tailor: leather → coat
  {
    buildingType: BuildingType.TAILOR,
    inputs: { [ResourceType.LEATHER]: 2 },
    outputs: { [ResourceType.COAT]: 1 },
    cooldownTicks: 200,
  },
  // Herbalist: gathers herbs
  {
    buildingType: BuildingType.HERBALIST,
    inputs: {},
    outputs: { [ResourceType.HERBS]: 2 },
    cooldownTicks: 150,
    gatherFromRadius: true,
  },
  // Crop Field: produces food (seasonal)
  {
    buildingType: BuildingType.CROP_FIELD,
    inputs: {},
    outputs: { [ResourceType.WHEAT]: 8, [ResourceType.CABBAGE]: 5, [ResourceType.POTATO]: 5 },
    cooldownTicks: 200,
    seasonalMultiplier: true,
  },
];
