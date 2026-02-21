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

// ── Time / Seasons ─────────────────────────────────────────────
export const TICKS_PER_SUB_SEASON = 3000; // 1 sub-season = 1 game month = 5 days
export const SUB_SEASONS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_SUB_SEASON * SUB_SEASONS_PER_YEAR;

// Day/night cycle (each visual day = 60 seconds real time at 1x)
export const TICKS_PER_DAY = 600;  // 60 seconds real time at 1x
export const DAYS_PER_YEAR = TICKS_PER_YEAR / TICKS_PER_DAY; // 60
export const DAWN_START = 0.2;
export const DUSK_START = 0.75;
export const NIGHT_DARKNESS = 0.55;

// ── Semantic time units ────────────────────────────────────────
export const HOUR   = TICKS_PER_DAY / 24;         // 25 ticks
export const DAY    = TICKS_PER_DAY;               // 600 ticks
export const MONTH  = TICKS_PER_SUB_SEASON;        // 600 ticks (= 1 sub-season)
export const SEASON = 3 * MONTH;                   // 1800 ticks
export const YEAR   = TICKS_PER_YEAR;              // 7200 ticks

// ── Citizens ───────────────────────────────────────────────────
export const STARTING_ADULTS = 5;
export const STARTING_CHILDREN = 2;
export const CITIZEN_SPEED = 1.5; // tiles per second
export const CHILD_AGE = 10;
export const OLD_AGE = 60;
export const YEARS_PER_REAL_YEAR = 5;

// Movement speed modifiers
export const ROAD_SPEED_MULT = 2.0;
export const FOREST_SPEED_MULT = 0.6;
export const DEFAULT_SPEED_MULT = 1.0;

// ── Needs (0..100) ─────────────────────────────────────────────
export const FOOD_DECAY_PER_TICK    = 100 / (2 * DAY);       // fully depletes in 2 days → ~2 meals/day
export const WARMTH_DECAY_PER_TICK  = 0.03;                   // modified by temperature in winter
export const HEALTH_DECAY_PER_TICK  = 0.005;
export const HAPPINESS_DECAY_PER_TICK = 0.003;
export const STARVATION_HEALTH_DAMAGE = 0.08;
export const FREEZING_HEALTH_DAMAGE   = 0.06;

// Energy (0..100) — drains while awake, recovers while sleeping
export const ENERGY_DECAY_PER_TICK    = 80 / (16 * HOUR);    // 16 waking hours drains 80 pts
export const ENERGY_RECOVERY_PER_TICK = 100 / (8 * HOUR);    // 8 hours of sleep for full recovery
export const TIRED_THRESHOLD = 20;

// Meals
export const MEAL_FOOD_THRESHOLD = 65;
export const MEAL_RESTORE = 30;
export const MEAL_COST = 3;
export const STARVING_THRESHOLD = 15;

// Tool / Coat wear
export const TOOL_WEAR_PER_TICK = 1 / (8 * MONTH);           // a tool wears out in ~8 months
export const COAT_WEAR_PER_TICK = 1 / (2 * YEAR);            // a coat wears out in ~2 years
export const NO_TOOL_PRODUCTION_MULT = 0.5;
export const NO_COAT_WARMTH_MULT = 2.0;

// Starting resources
export const STARTING_RESOURCES = {
  log: 150,
  stone: 50,
  iron: 20,
  tool: 8,
  coat: 7,
  firewood: 80,
  food: 400,                                                   // ~5 days for 7 citizens at ~2 meals/day
};

// ── Population ─────────────────────────────────────────────────
export const MARRIAGE_MIN_AGE = 18;
export const FERTILITY_MAX_AGE = 55;
export const MAX_CHILDREN_PER_COUPLE = 3;
export const BIRTH_CHANCE = 0.03;
export const OLD_AGE_DEATH_CHANCE_PER_YEAR = 0.02;
export const NEWBORN_NEEDS = 80;
export const ADULT_SPAWN_AGE_MIN = 18;
export const ADULT_SPAWN_AGE_MAX = 30;
export const FAMILY_CHECK_INTERVAL = 100;                      // ticks between family/birth/worker checks

// Pregnancy
export const PREGNANCY_DURATION_TICKS = 9 * MONTH;            // 9 months
export const TRIMESTER_1_END = 3 * MONTH;
export const TRIMESTER_2_END = 6 * MONTH;
export const CONCEPTION_CHANCE_PARTNER = 0.03;
export const CONCEPTION_CHANCE_NON_PARTNER = 0.005;
// Trimester 1 modifiers (months 1-3)
export const T1_FOOD_DECAY_MULT = 1.15;
export const T1_ENERGY_DECAY_MULT = 1.0;
export const T1_SPEED_MULT = 1.0;
// Trimester 2 modifiers (months 4-6)
export const T2_FOOD_DECAY_MULT = 1.3;
export const T2_ENERGY_DECAY_MULT = 1.15;
export const T2_SPEED_MULT = 0.85;
// Trimester 3 modifiers (months 7-9)
export const T3_FOOD_DECAY_MULT = 1.5;
export const T3_ENERGY_DECAY_MULT = 1.3;
export const T3_SPEED_MULT = 0.65;
export const PREGNANT_MEAL_THRESHOLD_BOOST = 10;

// Nomads
export const NOMAD_CHECK_INTERVAL = 500;
export const NOMAD_BASE_CHANCE = 0.01;
export const NOMAD_DISEASE_CHANCE = 0.15;
export const NOMAD_MIN_COUNT = 2;
export const NOMAD_MAX_COUNT = 5;
export const NOMAD_EDGE_MARGIN = 20;
export const NOMAD_SPAWN_SEARCH_RADIUS = 10;
export const NOMAD_SCATTER_RANGE = 2;

// Citizen AI
export const AI_TICK_INTERVAL = 5;
export const STUCK_THRESHOLD = 50;
export const FREEZING_WARMTH_THRESHOLD = 25;
export const EMERGENCY_SLEEP_ENERGY = 5;
export const CHAT_HAPPINESS_GAIN = 0.5;
export const HOME_WARMTH_GAIN = 0.1;

// Wander behavior
export const WANDER_ATTEMPTS = 3;
export const WANDER_RANGE = 6;
export const FORCE_WANDER_ATTEMPTS = 8;
export const FORCE_WANDER_RANGE = 15;
export const FORCE_WANDER_MIN_DIST = 3;
export const CITIZEN_SPAWN_OFFSET = 3;

// ── Construction ───────────────────────────────────────────────
// Formula: ticks = constructionWork / (numWorkers * CONSTRUCTION_WORK_RATE)
// House (250 work) + 3 workers → 2778 ticks ≈ 4.6 days
export const CONSTRUCTION_WORK_RATE = 0.03;
export const EDUCATED_CONSTRUCTION_BONUS = 0.015;
export const INITIAL_HOUSE_WARMTH = 50;

// Production
export const EDUCATION_BONUS = 1.5;
export const FOREST_EFFICIENCY_DIVISOR = 50;

// ── Needs thresholds ───────────────────────────────────────────
export const SLEEP_FOOD_DECAY_MULT = 0.5;
export const WARM_WEATHER_TEMP = 15;
export const WARM_WEATHER_RECOVERY = 0.02;
export const COLD_WARMTH_DIVISOR = 10;
export const HOUSE_WARMTH_THRESHOLD = 30;
export const HOUSE_WARMTH_DECAY_MULT = 0.2;
export const HOUSE_WARMTH_RECOVERY = 0.05;
export const FREEZING_TEMP_THRESHOLD = 5;
export const HEALTH_REGEN_FOOD_MIN = 50;
export const HEALTH_REGEN_WARMTH_MIN = 50;
export const HEALTH_REGEN_ENERGY_MIN = 30;
export const HEALTH_REGEN_RATE = 0.005;
export const HERB_USE_HEALTH_THRESHOLD = 80;
export const HERB_USE_CHANCE = 0.001;
export const HERB_HEALTH_RESTORE = 10;
export const OLD_AGE_HEALTH_DIVISOR = 20;
export const UNHAPPY_FOOD_THRESHOLD = 30;
export const UNHAPPY_WARMTH_THRESHOLD = 30;
export const UNHAPPY_HEALTH_THRESHOLD = 50;
export const UNHAPPY_ENERGY_THRESHOLD = 15;
export const UNHAPPINESS_RATE = 0.01;
export const HAPPY_NEEDS_THRESHOLD = 70;
export const HAPPY_ENERGY_THRESHOLD = 50;
export const HAPPINESS_GAIN_RATE = 0.005;

// Storage / Houses
export const STORAGE_CHECK_INTERVAL = 30;
export const HOUSE_FIREWOOD_MIN = 10;
export const HOUSE_FIREWOOD_TARGET = 20;
export const HOUSE_WARMTH_GAIN_FROM_FIRE = 2;
export const HOUSE_FIREWOOD_CONSUMPTION = 0.05;
export const HOUSE_WARMTH_LOSS_NO_FIRE = 5;
export const MARKET_HAPPINESS_GAIN = 0.5;

// ── Trade ──────────────────────────────────────────────────────
export const MERCHANT_VISIT_INTERVAL_MULT = 0.8;
export const MERCHANT_ARRIVAL_CHANCE = 0.002;
export const MERCHANT_WARES_COUNT = 3;
export const MERCHANT_WARES_MIN = 20;
export const MERCHANT_WARES_MAX = 80;
export const MERCHANT_WANTS_COUNT = 2;
export const MERCHANT_WANTS_MIN = 30;
export const MERCHANT_WANTS_MAX = 100;
export const MERCHANT_STAY_DURATION = 1 * DAY;                // merchant stays 1 day

// ── Environment ────────────────────────────────────────────────
export const ENVIRONMENT_TILES_PER_TICK = 200;
export const MAX_TREE_DENSITY = 5;
export const FOREST_GROWTH_CHANCE = 0.0002;
export const BUILDING_DECAY_CHECK_INTERVAL = 10;

// ── Disease (system tuning) ────────────────────────────────────
export const DISEASE_TICK_INTERVAL = 5;
export const DISEASE_ENERGY_DRAIN = 0.02;
export const DISEASE_MALNUTRITION_THRESHOLD = 30;
export const DISEASE_MALNUTRITION_MULT = 1.5;
export const DISEASE_COLD_THRESHOLD = 30;
export const DISEASE_COLD_MULT = 1.5;
export const DISEASE_WEAK_THRESHOLD = 50;
export const DISEASE_WEAK_MULT = 1.5;

// ── Weather (system tuning) ────────────────────────────────────
export const STORM_WARMTH_DRAIN = 0.05;
export const HARSH_WINTER_WARMTH_DRAIN = 0.03;
export const STORM_CROP_WEATHER_MULT = 0.5;

// ── Map generation ─────────────────────────────────────────────
export const FOREST_DENSITY = 0.35;
export const STONE_DEPOSIT_CHANCE = 0.02;
export const IRON_DEPOSIT_CHANCE = 0.01;
export const RIVER_WIDTH = 3;
export const ELEVATION_NOISE_SCALE = 60;
export const MOISTURE_NOISE_SCALE = 40;
export const FOREST_NOISE_SCALE = 30;
export const WATER_ELEVATION_THRESHOLD = 0.25;
export const FOREST_ELEVATION_MIN = 0.3;
export const FERTILE_MOISTURE_THRESHOLD = 0.55;
export const STONE_ELEVATION_THRESHOLD = 0.6;
export const START_AREA_RADIUS = 10;
export const RIVER_START_POSITION = 0.3;
export const RIVER_START_OFFSET = 20;
export const START_LOCATION_SEARCH_RADIUS = 20;

// Particles
export const MAX_PARTICLES = 300;
export const PARTICLE_SPAWN_INTERVAL = 3;
export const SMOKE_SPAWN_CHANCE = 0.3;
export const SMOKE_MIN_WARMTH = 20;
export const SNOW_PARTICLES_PER_SPAWN = 3;
export const LEAF_SPAWN_CHANCE = 0.3;

// Pathfinding
export const PATH_CACHE_SIZE = 64;
export const MAX_PATHS_PER_TICK = 20;
export const ROAD_PATH_COST = 0.5;
export const FOREST_PATH_COST = 1.8;
export const DEFAULT_PATH_COST = 1.0;

// ── Social ─────────────────────────────────────────────────────
export const SOCIAL_CHAT_RADIUS = 3;
export const SOCIAL_CHAT_CHANCE = 0.02;
export const SOCIAL_CHAT_DURATION = 1 * HOUR;                 // ~1 in-game hour of chatting
export const LONELINESS_THRESHOLD = 3 * DAY;                  // lonely after 3 days without contact
export const LONELINESS_HAPPINESS_PENALTY = -0.003;

// ── Weather events ─────────────────────────────────────────────
export const WEATHER_CHECK_INTERVAL = 12 * HOUR;              // check every 12 hours
export const STORM_CHANCE = 0.01;
export const DROUGHT_CHANCE = 0.005;
export const HARSH_WINTER_CHANCE = 0.02;
export const STORM_DURATION_TICKS = 8 * HOUR;                 // storms last ~8 hours
export const STORM_BUILDING_DAMAGE = 0.05;
export const STORM_CROP_DAMAGE = 0.1;
export const DROUGHT_DURATION_TICKS = 1 * MONTH;              // droughts last 1 month
export const DROUGHT_CROP_MULT = 0.1;

// ── Building decay ─────────────────────────────────────────────
export const BUILDING_DECAY_PER_TICK = 100 / (28 * YEAR);     // full decay over ~28 years
export const BUILDING_MAX_DURABILITY = 100;
export const BUILDING_REPAIR_THRESHOLD = 50;
export const BUILDING_COLLAPSE_THRESHOLD = 0;
export const BUILDING_REPAIR_PER_TICK = 0.5;

// ── Disease ────────────────────────────────────────────────────
export const DISEASE_BASE_CHANCE = 0.00001;                    // 5x rarer spontaneous disease
export const DISEASE_SPREAD_RADIUS = 3;                        // tighter spread radius
export const DISEASE_SPREAD_CHANCE = 0.0001;                   // 3x harder to spread
export const DISEASE_HEALTH_DAMAGE = 0.015;                    // much less lethal (~2.5x less)
export const DISEASE_DURATION_TICKS = 3 * DAY;                 // disease lasts ~3 days (shorter)
export const HERBALIST_CURE_RADIUS = 30;
export const HERBALIST_CURE_CHANCE = 0.005;
export const DISEASE_IMMUNITY_TICKS = 1 * YEAR;               // immune for 1 year after recovery

// Food spoilage & diet variety
export const FOOD_SPOILAGE_RATE = 0.001;
export const BARN_SPOILAGE_MULT = 0.2;
export const DIET_HISTORY_SIZE = 10;
export const DIET_VARIETY_THRESHOLD = 3;
export const DIET_VARIETY_HAPPINESS = 0.01;
export const DIET_MONOTONY_HAPPINESS = -0.005;

// Resource depletion & regrowth
export const TREE_CONSUME_AMOUNT = 1;
export const FORESTER_REPLANT_TICKS = 1 * MONTH;              // 1 month between replanting
export const NATURAL_REGROWTH_CHANCE = 0.00002;
export const TREE_GROWTH_TICKS = 5 * MONTH;                   // 5 months per density level
export const STONE_DEPOSIT_AMOUNT = 50;
export const IRON_DEPOSIT_AMOUNT = 30;

// ── Personality Traits ─────────────────────────────────────────
export const PersonalityTrait = {
  HARDWORKING: 'hardworking',
  LAZY: 'lazy',
  CHEERFUL: 'cheerful',
  SHY: 'shy',
  ADVENTUROUS: 'adventurous',
} as const;
export type PersonalityTrait = (typeof PersonalityTrait)[keyof typeof PersonalityTrait];

export const TRAIT_WORK_SPEED_BONUS: Partial<Record<PersonalityTrait, number>> = {
  [PersonalityTrait.HARDWORKING]: 0.15,
  [PersonalityTrait.LAZY]: -0.15,
};
export const TRAIT_SOCIAL_CHANCE_MULT: Partial<Record<PersonalityTrait, number>> = {
  [PersonalityTrait.SHY]: 0.3,
  [PersonalityTrait.CHEERFUL]: 2.0,
};
export const TRAIT_HAPPINESS_GAIN_MULT: Partial<Record<PersonalityTrait, number>> = {
  [PersonalityTrait.CHEERFUL]: 1.5,
};
export const TRAIT_WANDER_HAPPINESS: Partial<Record<PersonalityTrait, number>> = {
  [PersonalityTrait.ADVENTUROUS]: 0.003,
};
export const MAX_TRAITS_PER_CITIZEN = 2;
export const ALL_TRAITS: PersonalityTrait[] = Object.values(PersonalityTrait);

// ── Citizen Skills ─────────────────────────────────────────────
export const SkillType = {
  FARMING: 'farming',
  FORESTRY: 'forestry',
  MINING: 'mining',
  COOKING: 'cooking',
  BUILDING: 'building',
  GATHERING: 'gathering',
  FISHING: 'fishing',
  HUNTING: 'hunting',
  HERDING: 'herding',
} as const;
export type SkillType = (typeof SkillType)[keyof typeof SkillType];

export const SKILL_MAX_LEVEL = 5;
export const SKILL_XP_PER_LEVEL = 500;
export const SKILL_XP_PER_WORK_TICK = 0.1;
export const SKILL_EFFICIENCY_PER_LEVEL = 0.05;
export const SKILL_MASTERY_BONUS_CHANCE = 0.1;

// Mapping from profession to skill type
export const PROFESSION_SKILL_MAP: Partial<Record<string, SkillType>> = {
  farmer: SkillType.FARMING,
  forester: SkillType.FORESTRY,
  wood_cutter: SkillType.FORESTRY,
  gatherer: SkillType.GATHERING,
  hunter: SkillType.HUNTING,
  fisherman: SkillType.FISHING,
  blacksmith: SkillType.MINING,
  baker: SkillType.COOKING,
  builder: SkillType.BUILDING,
  laborer: SkillType.BUILDING,
  herder: SkillType.HERDING,
  dairymaid: SkillType.COOKING,
};

// ── Crop Growth Stages ─────────────────────────────────────────
export const CropStage = {
  FALLOW: 0,
  PLANTED: 1,
  SPROUTING: 2,
  GROWING: 3,
  FLOWERING: 4,
  READY: 5,
} as const;
export type CropStage = (typeof CropStage)[keyof typeof CropStage];

export const CROP_STAGE_TICKS = SEASON / 5;                   // full crop cycle = 1 season (5 stages)
export const CROP_WINTER_KILL = true;
export const CROP_HARVEST_YIELD_MULT = 1.2;

// ── Cooking / Meal quality ─────────────────────────────────────
export const COOKED_MEAL_RESTORE = 45;
export const COOKED_MEAL_COST = 2;
export const COOKED_MEAL_WARMTH_BOOST = 5;
export const COOKED_MEAL_HAPPINESS_BOOST = 2;
export const COOKED_MEAL_ENERGY_BOOST = 5;

// ── Festivals ──────────────────────────────────────────────────
export const FESTIVAL_DURATION_TICKS = 1 * DAY;               // a festival lasts 1 day
export const FESTIVAL_HAPPINESS_BOOST = 15;
export const FESTIVAL_HAPPINESS_PER_TICK = 0.02;
export const FESTIVAL_GATHER_RADIUS = 8;
export const FESTIVAL_LANTERN_COUNT = 12;
export const FESTIVAL_CHECK_TICKS = 4 * HOUR;                 // triggers 4 hours into the month
// Festival effects (multipliers active for the rest of the season)
export const HARVEST_FESTIVAL_SPOILAGE_MULT = 0.5;
export const FROST_FAIR_DISEASE_MULT = 0.5;
export const PLANTING_DAY_CROP_MULT = 1.2;
export const MIDSUMMER_HAPPINESS_MULT = 1.5;

// ── Milestones & Narrative Events ──────────────────────────────
export const MILESTONE_CHECK_INTERVAL = 8 * HOUR;             // check every 8 hours
export const NARRATIVE_EVENT_CHANCE = 0.003;
export const NARRATIVE_EVENT_INTERVAL = 1 * DAY;              // min 1 day between events

export const MilestoneId = {
  FIRST_HOUSE: 'first_house',
  FIRST_WINTER: 'first_winter',
  POP_10: 'pop_10',
  POP_20: 'pop_20',
  POP_50: 'pop_50',
  FIRST_TRADE: 'first_trade',
  FIRST_HARVEST: 'first_harvest',
  FIRST_BIRTH: 'first_birth',
  FIRST_SCHOOL: 'first_school',
  SELF_SUFFICIENT: 'self_sufficient',
} as const;
export type MilestoneId = (typeof MilestoneId)[keyof typeof MilestoneId];

// ── Animals & Livestock ────────────────────────────────────────
export const CHICKEN_CAPACITY = 8;
export const CATTLE_CAPACITY = 4;
export const ANIMAL_FEED_PER_TICK = 0.005;
export const ANIMAL_STARVE_HEALTH_DAMAGE = 0.02;
export const ANIMAL_COLD_HEALTH_DAMAGE = 0.01;
export const CHICKEN_EGG_TICKS = 12 * HOUR;                    // eggs twice per day — good laying hens
export const CHICKEN_FEATHER_TICKS = 1 * MONTH;               // feathers collected monthly
export const CATTLE_MILK_TICKS = 12 * HOUR;                   // milked twice daily
export const CATTLE_WOOL_TICKS = 1 * SEASON;                  // sheared once per season
export const ANIMAL_BREED_CHANCE = 0.002;
export const HAY_FROM_WHEAT = 2;

// ── Tavern & Social Buildings ──────────────────────────────────
export const TAVERN_HAPPINESS_PER_TICK = 0.03;
export const TAVERN_VISIT_CHANCE = 0.15;
export const TAVERN_EVENING_START = 0.6;
export const TAVERN_SOCIAL_RADIUS = 4;
export const WELL_HAPPINESS_RADIUS = 15;
export const WELL_HAPPINESS_PER_TICK = 0.002;
export const CHAPEL_WEDDING_HAPPINESS = 10;
export const CHAPEL_COMMUNITY_HAPPINESS = 0.001;

// ── Drag Placement ────────────────────────────────────────────
export const ROAD_DRAG_MAX_PATH = 80;
export const FLEXIBLE_MIN_SIZE = 3;
export const FLEXIBLE_MAX_SIZE = 20;

// Spatial hash
export const SPATIAL_CELL_SIZE = 8;

// UI
export const HUD_HEIGHT = 40;
export const BUILD_MENU_HEIGHT = 180;
export const INFO_PANEL_WIDTH = 250;
export const MINIMAP_SIZE = 160;

// Event Log
export const EVENT_LOG_WIDTH = 300;
export const EVENT_LOG_MAX_ENTRIES = 200;
export const EVENT_LOG_VISIBLE_ROWS = 12;
export const EVENT_LOG_ROW_HEIGHT = 18;
export const EVENT_LOG_HEADER_HEIGHT = 24;

// Speed multipliers
export const SPEED_OPTIONS = [0, 1, 2, 5, 10];

// ── Enums ──────────────────────────────────────────────────────
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
  // Cooked meals
  BREAD: 'bread',
  FISH_STEW: 'fish_stew',
  BERRY_PIE: 'berry_pie',
  VEGETABLE_SOUP: 'vegetable_soup',
  // Animal products
  EGGS: 'eggs',
  MILK: 'milk',
  CHEESE: 'cheese',
  FEATHERS: 'feathers',
  HAY: 'hay',
  WOOL: 'wool',
  CLOTH: 'cloth',
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

export const COOKED_FOOD_TYPES: ResourceType[] = [
  ResourceType.BREAD,
  ResourceType.FISH_STEW,
  ResourceType.BERRY_PIE,
  ResourceType.VEGETABLE_SOUP,
  ResourceType.CHEESE,
];

export const ANIMAL_FOOD_TYPES: ResourceType[] = [
  ResourceType.EGGS,
  ResourceType.MILK,
];

export const ALL_FOOD_TYPES: ResourceType[] = [...FOOD_TYPES, ...COOKED_FOOD_TYPES, ...ANIMAL_FOOD_TYPES];

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
  TOWN_HALL: 'town_hall',
  BAKERY: 'bakery',
  TAVERN: 'tavern',
  WELL: 'well',
  CHAPEL: 'chapel',
  CHICKEN_COOP: 'chicken_coop',
  PASTURE: 'pasture',
  DAIRY: 'dairy',
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
  BAKER: 'baker',
  BARKEEP: 'barkeep',
  HERDER: 'herder',
  DAIRYMAID: 'dairymaid',
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
