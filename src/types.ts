import { TileType, ResourceType, BuildingType, BuildingCategory, Profession, Season } from './constants';

export type EntityId = number;

export type DoorSide = 'north' | 'south' | 'east' | 'west';
export interface DoorDef { dx: number; dy: number; side: DoorSide; }
export type Rotation = 0 | 1 | 2 | 3;

export interface TileData {
  type: TileType;
  trees: number;           // 0-5 tree density for forest tiles
  fertility: number;       // 0-1 soil fertility
  elevation: number;       // 0-1 height value
  occupied: boolean;       // is a building placed here
  buildingId: EntityId | null;
  stoneAmount: number;     // 0-50+ resource remaining in stone deposit
  ironAmount: number;      // 0-30+ resource remaining in iron deposit
  blocksMovement: boolean; // does the building on this tile block NPC pathfinding
  // Harvestable map resources (depletable, regrowing)
  berries: number;         // 0-5 berry bushes
  mushrooms: number;       // 0-3 mushroom patches
  herbs: number;           // 0-3 herb plants
  fish: number;            // 0-8 fish population
  wildlife: number;        // 0-3 wildlife density
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  category: BuildingCategory;
  width: number;
  height: number;
  costLog: number;
  costStone: number;
  costIron: number;
  maxWorkers: number;
  workRadius: number;
  constructionWork: number; // total work units to build
  description: string;
  requiresWater?: boolean;
  requiresForest?: boolean;
  isStorage?: boolean;
  storageCapacity?: number;
  residents?: number; // max residents for houses
  blocksMovement?: boolean; // defaults to true; false for open-area buildings (fields, stockpiles)
  doorDef?: DoorDef;
  flexible?: boolean;       // enables drag-to-resize placement
  minWidth?: number;        // minimum drag dimension (default FLEXIBLE_MIN_SIZE)
  minHeight?: number;
  maxWidth?: number;        // maximum drag dimension (default FLEXIBLE_MAX_SIZE)
  maxHeight?: number;
}

export interface RecipeDef {
  buildingType: BuildingType;
  inputs: Partial<Record<ResourceType, number>>;
  outputs: Partial<Record<ResourceType, number>>;
  cooldownTicks: number;
  seasonalMultiplier?: boolean;
  gatherFromRadius?: boolean;
}

export interface SeasonData {
  name: string;
  temperature: number;
  cropGrowth: number;
  gatheringRate: number;
  huntingRate: number;
  fishingRate: number;
  herbRate: number;
  snow: boolean;
  dayLength: number; // 0-1 multiplier
}

export interface ProfessionDef {
  type: Profession;
  name: string;
  tool: boolean; // requires a tool
}

export interface Inventory {
  items: Map<ResourceType, number>;
  capacity: number;
}

export interface GameState {
  tick: number;
  year: number;
  subSeason: Season;
  tickInSubSeason: number;
  speed: number;
  paused: boolean;
  population: number;
  totalDeaths: number;
  totalBirths: number;
  selectedEntity: EntityId | null;
  placingBuilding: BuildingType | null;
  placingRotation: Rotation;
  gameOver: boolean;
  // Day/night cycle
  dayProgress: number;  // 0..1 within a single day
  isNight: boolean;
  isDusk: boolean;
  isDawn: boolean;
  nightAlpha: number;   // 0..1 darkness level for rendering
  // Worker assignment mode
  assigningWorker: EntityId | null;
  // Festival state
  festival: FestivalState | null;
}

export type FestivalType = 'planting_day' | 'midsummer' | 'harvest_festival' | 'frost_fair';

export interface FestivalState {
  type: FestivalType;
  ticksRemaining: number;
  townHallId: EntityId;
  /** Active buff applied for the rest of the season after the festival */
  activeEffect: FestivalType | null;
}

export interface EventLogEntry {
  id: number;
  tick: number;
  year: number;
  subSeason: number;
  category: string;
  text: string;
  color: string;
  entityId?: number;
  tileX?: number;
  tileY?: number;
}
