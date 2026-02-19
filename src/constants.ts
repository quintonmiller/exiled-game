// Map
export const MAP_WIDTH = 200;
export const MAP_HEIGHT = 200;
export const TILE_SIZE = 32;

// Rendering
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3.0;
export const DEFAULT_ZOOM = 1.0;

// Camera
export const CAMERA_PAN_SPEED = 400; // pixels per second
export const EDGE_PAN_MARGIN = 20; // pixels from edge
export const ZOOM_SPEED = 0.1;

// Game loop
export const TICK_RATE = 10; // simulation ticks per second
export const TICK_DURATION = 1000 / TICK_RATE; // ms per tick

// Time / Seasons
export const TICKS_PER_SUB_SEASON = 600; // 60 game-seconds × 10 ticks/sec
export const SUB_SEASONS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_SUB_SEASON * SUB_SEASONS_PER_YEAR;

// Day/night cycle
export const TICKS_PER_DAY = 1800; // 180 seconds = 3 minutes per full day/night cycle at 1x
export const DAWN_START = 0.2;   // fraction of day when dawn begins
export const DUSK_START = 0.75;  // fraction of day when dusk begins
export const NIGHT_DARKNESS = 0.55; // max darkness alpha at midnight

// Citizens
export const STARTING_ADULTS = 5;
export const STARTING_CHILDREN = 2;
export const CITIZEN_SPEED = 1.5; // tiles per second
export const CHILD_AGE = 10; // game-years
export const OLD_AGE = 60;
export const YEARS_PER_REAL_YEAR = 5;

// Movement speed modifiers
export const ROAD_SPEED_MULT = 2.0;
export const FOREST_SPEED_MULT = 0.6;
export const DEFAULT_SPEED_MULT = 1.0;

// Needs (0..100)
export const FOOD_DECAY_PER_TICK = 0.045; // citizen eats ~2-3 meals per day
export const WARMTH_DECAY_PER_TICK = 0.03; // faster in winter (multiplied by temp factor)
export const HEALTH_DECAY_PER_TICK = 0.005;
export const HAPPINESS_DECAY_PER_TICK = 0.003;
export const STARVATION_HEALTH_DAMAGE = 0.08;
export const FREEZING_HEALTH_DAMAGE = 0.06;

// Energy (0..100) — drains while awake, recovers while sleeping
export const ENERGY_DECAY_PER_TICK = 0.06;    // ~97 drained over a long summer day (1620 ticks)
export const ENERGY_RECOVERY_PER_TICK = 0.55;  // ~99 recovered in a short summer night (180 ticks)
export const TIRED_THRESHOLD = 20;             // go sleep even during daytime if below this

// Meals
export const MEAL_FOOD_THRESHOLD = 65;  // citizen seeks food when food level drops below this
export const MEAL_RESTORE = 30;         // food points restored per meal
export const MEAL_COST = 3;             // food units consumed from global supply per meal
export const STARVING_THRESHOLD = 15;   // urgent food seeking overrides everything

// Tool/Coat wear
export const TOOL_WEAR_PER_TICK = 0.0002;   // ~1 tool consumed per ~5000 ticks (~7 min real at 1x)
export const COAT_WEAR_PER_TICK = 0.00008;   // ~1 coat consumed per ~12500 ticks
export const NO_TOOL_PRODUCTION_MULT = 0.5;  // 50% production without tools
export const NO_COAT_WARMTH_MULT = 2.0;      // 2x warmth decay without coat

// Starting resources
export const STARTING_RESOURCES = {
  log: 100,
  stone: 50,
  iron: 20,
  tool: 5,
  coat: 5,
  firewood: 50,
  food: 200, // generic food for starting
};

// Production
export const EDUCATION_BONUS = 1.5;

// Map generation
export const FOREST_DENSITY = 0.35;
export const STONE_DEPOSIT_CHANCE = 0.02;
export const IRON_DEPOSIT_CHANCE = 0.01;
export const RIVER_WIDTH = 3;

// Pathfinding
export const PATH_CACHE_SIZE = 64;
export const MAX_PATHS_PER_TICK = 20;

// Road pathfinding cost (lower = preferred)
export const ROAD_PATH_COST = 0.5;
export const FOREST_PATH_COST = 1.8;
export const DEFAULT_PATH_COST = 1.0;

// Social
export const SOCIAL_CHAT_RADIUS = 3;           // tiles for citizens to notice each other
export const SOCIAL_CHAT_CHANCE = 0.02;        // chance per AI tick to start chatting
export const SOCIAL_CHAT_DURATION = 30;        // ticks spent chatting (3 seconds)
export const LONELINESS_THRESHOLD = 2000;      // ticks without social contact before loneliness
export const LONELINESS_HAPPINESS_PENALTY = -0.003; // per tick when lonely

// Weather events
export const WEATHER_CHECK_INTERVAL = 300;      // ticks between weather checks
export const STORM_CHANCE = 0.01;               // chance per check
export const DROUGHT_CHANCE = 0.005;            // chance per check (only summer)
export const HARSH_WINTER_CHANCE = 0.02;        // chance per check (only winter)
export const STORM_DURATION_TICKS = 200;        // how long a storm lasts
export const STORM_BUILDING_DAMAGE = 0.05;      // durability lost per tick during storm
export const STORM_CROP_DAMAGE = 0.1;           // crop progress lost per tick
export const DROUGHT_DURATION_TICKS = 500;      // how long a drought lasts
export const DROUGHT_CROP_MULT = 0.1;           // crop growth multiplier during drought

// Building decay
export const BUILDING_DECAY_PER_TICK = 0.0005;  // durability lost per tick
export const BUILDING_MAX_DURABILITY = 100;
export const BUILDING_REPAIR_THRESHOLD = 50;    // laborers auto-repair below this
export const BUILDING_COLLAPSE_THRESHOLD = 0;   // building destroyed at 0
export const BUILDING_REPAIR_PER_TICK = 0.5;    // durability restored per tick while being repaired

// Disease
export const DISEASE_BASE_CHANCE = 0.00005;    // base chance per tick for malnourished citizen to get sick
export const DISEASE_SPREAD_RADIUS = 5;         // tiles radius for contagion
export const DISEASE_SPREAD_CHANCE = 0.0003;    // chance per tick to spread to nearby citizen
export const DISEASE_HEALTH_DAMAGE = 0.04;      // health lost per tick while sick
export const DISEASE_DURATION_TICKS = 3000;     // how long disease lasts without treatment (~5 min)
export const HERBALIST_CURE_RADIUS = 30;        // herbalist treatment radius
export const HERBALIST_CURE_CHANCE = 0.005;     // chance per tick to cure a sick citizen in radius
export const DISEASE_IMMUNITY_TICKS = 5000;     // ticks of immunity after recovery

// Food spoilage & diet variety
export const FOOD_SPOILAGE_RATE = 0.002;        // fraction of food lost per spoilage tick (every 30 ticks)
export const BARN_SPOILAGE_MULT = 0.2;          // barns reduce spoilage to 20%
export const DIET_HISTORY_SIZE = 10;            // number of recent meals to track
export const DIET_VARIETY_THRESHOLD = 3;        // unique food types needed for bonus
export const DIET_VARIETY_HAPPINESS = 0.01;     // happiness gain per tick with varied diet
export const DIET_MONOTONY_HAPPINESS = -0.005;  // happiness change per tick with monotonous diet

// Resource depletion & regrowth
export const TREE_CONSUME_AMOUNT = 1;          // trees consumed from tile per production cycle
export const FORESTER_REPLANT_TICKS = 200;     // ticks between forester planting a new tree
export const NATURAL_REGROWTH_CHANCE = 0.00002; // chance per tick per grass tile near forest to sprout
export const TREE_GROWTH_TICKS = 500;          // ticks for a tree to grow one density level (1→2, etc.)
export const STONE_DEPOSIT_AMOUNT = 50;        // starting amount in each stone deposit tile
export const IRON_DEPOSIT_AMOUNT = 30;         // starting amount in each iron deposit tile

// Spatial hash
export const SPATIAL_CELL_SIZE = 8; // tiles

// UI
export const HUD_HEIGHT = 40;
export const BUILD_MENU_HEIGHT = 180;
export const INFO_PANEL_WIDTH = 250;
export const MINIMAP_SIZE = 160;

// Speed multipliers
export const SPEED_OPTIONS = [0, 1, 2, 5, 10];

// Enums as const objects for better tree-shaking
export const TileType = {
  GRASS: 0,
  FOREST: 1,
  WATER: 2,
  STONE: 3,
  IRON: 4,
  RIVER: 5,
  FERTILE: 6,
  ROAD: 7,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

export const ResourceType = {
  LOG: 'log',
  STONE: 'stone',
  IRON: 'iron',
  FIREWOOD: 'firewood',
  TOOL: 'tool',
  COAT: 'coat',
  HERBS: 'herbs',
  LEATHER: 'leather',
  BERRIES: 'berries',
  MUSHROOMS: 'mushrooms',
  ROOTS: 'roots',
  VENISON: 'venison',
  FISH: 'fish',
  WHEAT: 'wheat',
  CABBAGE: 'cabbage',
  POTATO: 'potato',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const FOOD_TYPES: ResourceType[] = [
  ResourceType.BERRIES,
  ResourceType.MUSHROOMS,
  ResourceType.ROOTS,
  ResourceType.VENISON,
  ResourceType.FISH,
  ResourceType.WHEAT,
  ResourceType.CABBAGE,
  ResourceType.POTATO,
];

export const BuildingType = {
  WOODEN_HOUSE: 'wooden_house',
  STORAGE_BARN: 'storage_barn',
  STOCKPILE: 'stockpile',
  CROP_FIELD: 'crop_field',
  GATHERING_HUT: 'gathering_hut',
  HUNTING_CABIN: 'hunting_cabin',
  FISHING_DOCK: 'fishing_dock',
  FORESTER_LODGE: 'forester_lodge',
  WOOD_CUTTER: 'wood_cutter',
  BLACKSMITH: 'blacksmith',
  TAILOR: 'tailor',
  HERBALIST: 'herbalist',
  MARKET: 'market',
  SCHOOL: 'school',
  TRADING_POST: 'trading_post',
  ROAD: 'road',
} as const;
export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType];

export const Profession = {
  LABORER: 'laborer',
  FARMER: 'farmer',
  GATHERER: 'gatherer',
  HUNTER: 'hunter',
  FISHERMAN: 'fisherman',
  FORESTER: 'forester',
  WOOD_CUTTER: 'wood_cutter',
  BLACKSMITH: 'blacksmith',
  TAILOR: 'tailor',
  HERBALIST: 'herbalist',
  VENDOR: 'vendor',
  TEACHER: 'teacher',
  TRADER: 'trader',
  BUILDER: 'builder',
} as const;
export type Profession = (typeof Profession)[keyof typeof Profession];

export const Season = {
  EARLY_SPRING: 0,
  MID_SPRING: 1,
  LATE_SPRING: 2,
  EARLY_SUMMER: 3,
  MID_SUMMER: 4,
  LATE_SUMMER: 5,
  EARLY_AUTUMN: 6,
  MID_AUTUMN: 7,
  LATE_AUTUMN: 8,
  EARLY_WINTER: 9,
  MID_WINTER: 10,
  LATE_WINTER: 11,
} as const;
export type Season = (typeof Season)[keyof typeof Season];

export const BuildingCategory = {
  HOUSING: 'Housing',
  STORAGE: 'Storage',
  FOOD: 'Food',
  RESOURCE: 'Resource',
  SERVICES: 'Services',
  INFRASTRUCTURE: 'Infrastructure',
} as const;
export type BuildingCategory = (typeof BuildingCategory)[keyof typeof BuildingCategory];
