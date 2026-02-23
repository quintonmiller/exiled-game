// ── Exiled Game Manual — Data Module ──────────────────────
// All game data and helper functions for manual pages.

const TICKS_PER_DAY = 600;
const TICKS_PER_HOUR = 25;
const WORK_RATE = 0.03;

// ── Time Helpers ──────────────────────────────────────────

function ticksToTime(ticks) {
  if (!ticks || ticks <= 0) return 'instant';
  const hours = ticks / TICKS_PER_HOUR;
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins <= 1 ? '~1 minute' : `~${mins} minutes`;
  }
  if (hours < 24) {
    const h = +(hours.toFixed(1));
    return h === 1 ? '1 hour' : `${h} hours`;
  }
  const days = hours / 24;
  if (days < 5) {
    const d = +(days.toFixed(1));
    return d === 1 ? '1 day' : `${d} days`;
  }
  const months = days / 5;
  if (months < 12) {
    const m = +(months.toFixed(1));
    return m === 1 ? '1 month' : `${m} months`;
  }
  const years = months / 12;
  const y = +(years.toFixed(1));
  return y === 1 ? '1 year' : `${y} years`;
}

function buildTime(work, builders) {
  if (!work || builders <= 0) return 'N/A';
  const ticks = work / (builders * WORK_RATE);
  return ticksToTime(ticks);
}

function formatCost(cost) {
  const parts = [];
  if (cost.log) parts.push(`${cost.log} Log`);
  if (cost.stone) parts.push(`${cost.stone} Stone`);
  if (cost.iron) parts.push(`${cost.iron} Iron`);
  return parts.length ? parts.join(', ') : 'Free';
}

function resourceName(id) {
  const r = resources.find(r => r.id === id);
  return r ? r.name : id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildingById(id) {
  return buildings.find(b => b.id === id) || null;
}

function recipesForBuilding(id) {
  return recipes.filter(r => r.buildingId === id);
}

function formatOutputs(outputs) {
  return Object.entries(outputs).map(([id, qty]) => `${qty} ${resourceName(id)}`).join(', ');
}

function formatInputs(inputs) {
  const entries = Object.entries(inputs);
  if (!entries.length) return 'None (gathered)';
  return entries.map(([id, qty]) => `${qty} ${resourceName(id)}`).join(', ');
}

// ── Category Colors ───────────────────────────────────────

const categoryColors = {
  Housing: '#c4833e',
  Storage: '#8a6d3b',
  Food: '#6aab78',
  Resource: '#aa7733',
  Services: '#6898e0',
  Infrastructure: '#8a7d6b',
};

// ── Resources ─────────────────────────────────────────────

const resources = [
  // Raw Materials
  { id: 'log', name: 'Log', category: 'Raw Materials', weight: 10, tradeValue: 3,
    source: 'Harvested by Foresters from trees',
    uses: 'Construction, firewood production, tool forging' },
  { id: 'stone', name: 'Stone', category: 'Raw Materials', weight: 12, tradeValue: 4,
    source: 'Quarried at Stone Quarries',
    uses: 'Construction, stone roads, stone buildings' },
  { id: 'iron', name: 'Iron', category: 'Raw Materials', weight: 15, tradeValue: 8,
    source: 'Mined at Iron Mines',
    uses: 'Tool forging, advanced construction' },
  { id: 'leather', name: 'Leather', category: 'Raw Materials', weight: 5, tradeValue: 6,
    source: 'From hunting deer or butchering cattle',
    uses: 'Tailored into coats' },

  // Foraged Food
  { id: 'berries', name: 'Berries', category: 'Foraged Food', weight: 1, tradeValue: 1,
    source: 'Gathered by Gathering Huts from nearby forests',
    uses: 'Eaten raw or baked into Berry Pie', seasonal: 'Best in spring and summer' },
  { id: 'mushrooms', name: 'Mushrooms', category: 'Foraged Food', weight: 1, tradeValue: 1,
    source: 'Gathered by Gathering Huts from nearby forests',
    uses: 'Eaten raw', seasonal: 'Peak in late summer and autumn' },
  { id: 'roots', name: 'Roots', category: 'Foraged Food', weight: 1, tradeValue: 1,
    source: 'Bonus finds from gathering trips',
    uses: 'Eaten raw or used in Vegetable Soup', seasonal: 'Available spring through summer' },

  // Farm Produce
  { id: 'wheat', name: 'Wheat', category: 'Farm Produce', weight: 1, tradeValue: 2,
    source: 'Grown in Crop Fields',
    uses: 'Baked into Bread or Berry Pie; produces Hay as by-product', seasonal: 'Grows spring\u2013summer, harvest in autumn' },
  { id: 'cabbage', name: 'Cabbage', category: 'Farm Produce', weight: 1, tradeValue: 1,
    source: 'Grown in Crop Fields',
    uses: 'Eaten raw or cooked into Vegetable Soup', seasonal: 'Grows spring\u2013summer, harvest in autumn' },
  { id: 'potato', name: 'Potato', category: 'Farm Produce', weight: 1, tradeValue: 1,
    source: 'Grown in Crop Fields',
    uses: 'Eaten raw, used in Fish Stew or Vegetable Soup', seasonal: 'Grows spring\u2013summer, harvest in autumn' },

  // Meat & Fish
  { id: 'venison', name: 'Venison', category: 'Meat & Fish', weight: 3, tradeValue: 3,
    source: 'Hunted at Hunting Cabins',
    uses: 'Eaten as food', seasonal: 'Best in autumn, scarce in summer' },
  { id: 'fish', name: 'Fish', category: 'Meat & Fish', weight: 2, tradeValue: 2,
    source: 'Caught at Fishing Docks',
    uses: 'Eaten raw or cooked into Fish Stew', seasonal: 'Year-round but reduced in winter' },

  // Cooked Food
  { id: 'bread', name: 'Bread', category: 'Cooked Food', weight: 1, tradeValue: 3,
    source: 'Baked at Bakery from Wheat',
    uses: 'Restores more hunger than raw food, boosts warmth and happiness' },
  { id: 'fish_stew', name: 'Fish Stew', category: 'Cooked Food', weight: 2, tradeValue: 4,
    source: 'Cooked at Bakery from Fish and Potatoes',
    uses: 'Hearty meal with warmth and happiness bonuses' },
  { id: 'berry_pie', name: 'Berry Pie', category: 'Cooked Food', weight: 1, tradeValue: 3,
    source: 'Baked at Bakery from Berries and Wheat',
    uses: 'Sweet treat with energy and happiness bonuses' },
  { id: 'vegetable_soup', name: 'Vegetable Soup', category: 'Cooked Food', weight: 2, tradeValue: 3,
    source: 'Cooked at Bakery from Cabbage, Potatoes, and Roots',
    uses: 'Balanced meal with warmth and happiness bonuses' },
  { id: 'cheese', name: 'Cheese', category: 'Cooked Food', weight: 2, tradeValue: 5,
    source: 'Processed at Dairy from Milk',
    uses: 'Nutrient-rich cooked food' },

  // Animal Products
  { id: 'eggs', name: 'Eggs', category: 'Animal Products', weight: 1, tradeValue: 2,
    source: 'Produced by chickens in Chicken Coops',
    uses: 'Eaten as food (counts as animal food)' },
  { id: 'milk', name: 'Milk', category: 'Animal Products', weight: 2, tradeValue: 2,
    source: 'Produced by cattle in Pastures',
    uses: 'Eaten as food or processed into Cheese at a Dairy' },
  { id: 'feathers', name: 'Feathers', category: 'Animal Products', weight: 1, tradeValue: 3,
    source: 'Collected from chickens in Chicken Coops',
    uses: 'Trade goods' },
  { id: 'wool', name: 'Wool', category: 'Animal Products', weight: 2, tradeValue: 4,
    source: 'Sheared from cattle in Pastures',
    uses: 'Woven into Cloth at a Tailor' },
  { id: 'hay', name: 'Hay', category: 'Animal Products', weight: 1, tradeValue: 1,
    source: 'By-product of wheat harvests in Crop Fields',
    uses: 'Feed for chickens and cattle' },

  // Processed Goods
  { id: 'firewood', name: 'Firewood', category: 'Processed Goods', weight: 4, tradeValue: 2,
    source: 'Split from Logs at Wood Cutters',
    uses: 'Burned in houses to provide warmth' },
  { id: 'tool', name: 'Tool', category: 'Processed Goods', weight: 5, tradeValue: 12,
    source: 'Forged at Blacksmiths from Iron and Logs',
    uses: 'Equipped by workers; without tools, production drops by 50%' },
  { id: 'coat', name: 'Coat', category: 'Processed Goods', weight: 3, tradeValue: 15,
    source: 'Tailored from Leather',
    uses: 'Worn by citizens; without a coat, warmth decays much faster' },
  { id: 'herbs', name: 'Herbs', category: 'Processed Goods', weight: 1, tradeValue: 5,
    source: 'Gathered by Herbalists from the wild',
    uses: 'Consumed automatically when citizens are injured or sick' },
  { id: 'cloth', name: 'Cloth', category: 'Processed Goods', weight: 2, tradeValue: 6,
    source: 'Woven from Wool at Tailors',
    uses: 'Trade goods and textile product' },
];

const resourceCategories = [
  'Raw Materials', 'Foraged Food', 'Farm Produce', 'Meat & Fish',
  'Cooked Food', 'Animal Products', 'Processed Goods',
];

const foodTypes = ['berries', 'mushrooms', 'roots', 'venison', 'fish', 'wheat', 'cabbage', 'potato'];
const cookedFoodTypes = ['bread', 'fish_stew', 'berry_pie', 'vegetable_soup', 'cheese'];
const animalFoodTypes = ['eggs', 'milk'];

// ── Buildings ─────────────────────────────────────────────

const buildings = [
  // ── Housing ──
  {
    id: 'wooden_house', name: 'Wooden House', category: 'Housing',
    size: [3, 3], cost: { log: 24, stone: 12 }, constructionWork: 250,
    workers: 0, radius: 0, residents: 5,
    description: 'A basic wooden shelter for your citizens. Keeps families warm when stocked with firewood and provides a place to sleep and recover energy.',
    upgradesTo: 'stone_house',
    upgradeCost: { log: 10, stone: 40, iron: 8 }, upgradeWork: 200,
    details: [
      'Houses consume firewood to maintain warmth. Keep them stocked to avoid freezing.',
      'Citizens sleeping at home recover energy and warmth faster.',
      'Assign families to houses — unhoused citizens sleep outdoors.',
    ],
  },

  // ── Storage ──
  {
    id: 'storage_barn', name: 'Storage Barn', category: 'Storage',
    size: [4, 4], cost: { log: 40, stone: 16 }, constructionWork: 300,
    workers: 0, radius: 0, storageCapacity: 6000,
    description: 'A dedicated storage building that protects food from spoilage. Essential for preserving your harvest through the winter months.',
    upgradesTo: 'stone_barn',
    upgradeCost: { stone: 60, iron: 16 }, upgradeWork: 250,
    details: [
      'Food stored in barns spoils 80% slower than in stockpiles or the open.',
      'Build barns early to preserve your food supply through winter.',
    ],
  },
  {
    id: 'stockpile', name: 'Stockpile', category: 'Storage',
    size: [4, 4], cost: {}, constructionWork: 15,
    workers: 0, radius: 0, storageCapacity: 5000,
    description: 'A simple open-air storage area for raw materials. Quick to set up but offers no protection against food spoilage.',
    details: [
      'Does not block citizen movement.',
      'No spoilage reduction — avoid storing perishable food here long-term.',
      'Free to build; useful for early-game overflow.',
    ],
  },

  // ── Food Production ──
  {
    id: 'crop_field', name: 'Crop Field', category: 'Food',
    size: [8, 8], cost: {}, constructionWork: 60,
    workers: 4, radius: 0, flexible: true, minSize: [3, 3], maxSize: [16, 16],
    description: 'A plot of farmland for growing wheat, cabbage, and potatoes. Crops grow through spring and summer, and must be harvested before winter or they\'ll die.',
    profession: 'Farmer',
    details: [
      'Crops go through growth stages: fallow \u2192 planted \u2192 sprouting \u2192 growing \u2192 flowering \u2192 ready.',
      'Unharvested crops die when winter begins.',
      'Harvest output is boosted by a 1.2\u00d7 multiplier.',
      'Wheat harvests also produce Hay as a by-product for feeding livestock.',
      'Drag to resize from 3\u00d73 up to 16\u00d716. Does not block movement.',
    ],
  },
  {
    id: 'gathering_hut', name: 'Gathering Hut', category: 'Food',
    size: [3, 3], cost: { log: 30, stone: 12 }, constructionWork: 150,
    workers: 4, radius: 30,
    description: 'Sends foragers into nearby forests to collect berries, mushrooms, and roots. Works best when surrounded by dense woodland.',
    profession: 'Gatherer',
    upgradesTo: 'gathering_lodge',
    upgradeCost: { log: 20, stone: 24 }, upgradeWork: 180,
    requirements: ['Best placed near dense forest for maximum yield.'],
    details: [
      'Output depends on berry, mushroom, and herb density within the work radius.',
      'Production is seasonal — strongest in spring and summer, zero in late autumn and winter.',
      'Forest density naturally replenishes over time.',
    ],
  },
  {
    id: 'hunting_cabin', name: 'Hunting Cabin', category: 'Food',
    size: [3, 3], cost: { log: 38, stone: 10 }, constructionWork: 150,
    workers: 3, radius: 30,
    description: 'A base for hunters who track deer in the surrounding wilderness. Produces venison for food and leather for coats.',
    profession: 'Hunter',
    upgradesTo: 'hunting_lodge',
    upgradeCost: { log: 28, stone: 20 }, upgradeWork: 180,
    details: [
      'Hunting is best in autumn when wildlife is most abundant.',
      'During summer, animals are scarce and hunting yields drop.',
      'Leather produced here can be turned into Coats at a Tailor.',
    ],
  },
  {
    id: 'fishing_dock', name: 'Fishing Dock', category: 'Food',
    size: [3, 4], cost: { log: 30, stone: 16 }, constructionWork: 180,
    workers: 4, radius: 15,
    description: 'A waterfront pier where fishermen cast nets and lines. Provides a reliable food source year-round, though reduced in winter.',
    profession: 'Fisherman',
    requirements: ['Must be placed adjacent to water.'],
    details: [
      'Fish are available all year, making docks a reliable food source.',
      'Winter fishing still works but at greatly reduced rates.',
      'Fish can be eaten raw or cooked into Fish Stew at a Bakery.',
    ],
  },
  {
    id: 'bakery', name: 'Bakery', category: 'Food',
    size: [3, 3], cost: { log: 36, stone: 24, iron: 8 }, constructionWork: 250,
    workers: 2, radius: 0,
    description: 'A kitchen that turns raw ingredients into cooked meals. Cooked food restores more hunger, provides warmth, and boosts happiness.',
    profession: 'Baker',
    details: [
      'Cycles through 4 recipes in order: Bread, Fish Stew, Berry Pie, Vegetable Soup.',
      'Skips a recipe if ingredients are unavailable and tries the next one.',
      'Cooked meals restore 50% more hunger than raw food.',
      'Cooked meals also provide warmth and happiness bonuses.',
    ],
  },
  {
    id: 'chicken_coop', name: 'Chicken Coop', category: 'Food',
    size: [3, 3], cost: { log: 20, stone: 8 }, constructionWork: 150,
    workers: 1, radius: 0,
    description: 'A henhouse for raising chickens. Produces eggs twice daily and feathers monthly. Chickens need hay to stay healthy.',
    profession: 'Herder',
    requirements: ['Requires Hay for feeding.'],
    details: [
      'Starts with a small flock; chickens breed over time up to the coop\'s capacity.',
      'Chickens need hay — without it, their health declines and they may die.',
      'No production without an assigned herder.',
      'Eggs can be eaten as food; feathers are trade goods.',
    ],
  },
  {
    id: 'pasture', name: 'Pasture', category: 'Food',
    size: [6, 6], cost: { log: 16 }, constructionWork: 80,
    workers: 1, radius: 0, flexible: true, minSize: [3, 3], maxSize: [12, 12],
    description: 'A fenced grazing area for cattle. Produces milk, wool, and leather. Cattle need hay and suffer in cold weather.',
    profession: 'Herder',
    requirements: ['Requires Hay for feeding.'],
    details: [
      'Cattle produce milk twice daily and wool once per season.',
      'In winter, cattle take health damage from cold exposure.',
      'If cattle die, you receive some leather from the loss.',
      'Cattle breed slowly if healthy and below capacity.',
      'Drag to resize from 3\u00d73 up to 12\u00d712. Does not block movement.',
    ],
  },

  // ── Resource Production ──
  {
    id: 'forester_lodge', name: 'Forester Lodge', category: 'Resource',
    size: [3, 3], cost: { log: 28, stone: 12 }, constructionWork: 150,
    workers: 4, radius: 30,
    description: 'Foresters plant new saplings and harvest mature trees for logs within their work radius. Essential for sustainable lumber production.',
    profession: 'Forester',
    upgradesTo: 'forestry_hall',
    upgradeCost: { log: 40, stone: 28 }, upgradeWork: 220,
    details: [
      'Foresters both plant and harvest trees, maintaining a sustainable cycle.',
      'Trees grow naturally too, but much more slowly without foresters.',
      'Place away from other buildings to maximize planting area.',
    ],
  },
  {
    id: 'wood_cutter', name: 'Wood Cutter', category: 'Resource',
    size: [2, 2], cost: { log: 24, stone: 8 }, constructionWork: 100,
    workers: 1, radius: 0,
    description: 'A workshop where logs are split into firewood. Firewood is consumed by houses to keep citizens warm through cold seasons.',
    profession: 'Wood Cutter',
    upgradesTo: 'sawmill',
    upgradeCost: { log: 30, stone: 20, iron: 12 }, upgradeWork: 200,
    details: [
      'Converts 1 Log into 6 Firewood per cycle.',
      'Absolutely essential — without firewood, houses go cold and citizens freeze.',
      'Build early and keep at least one running at all times.',
    ],
  },
  {
    id: 'blacksmith', name: 'Blacksmith', category: 'Resource',
    size: [3, 3], cost: { log: 55, stone: 32, iron: 32 }, constructionWork: 350,
    workers: 1, radius: 0,
    description: 'A forge where iron and logs are combined to make tools. Tools are essential \u2014 workers without tools are only half as productive.',
    profession: 'Blacksmith',
    upgradesTo: 'iron_works',
    upgradeCost: { log: 30, stone: 40, iron: 50 }, upgradeWork: 300,
    details: [
      'Forges 1 Tool from 1 Iron + 1 Log per cycle.',
      'Tools wear out over time (about 8 months per tool).',
      'Workers without tools suffer a 50% production penalty.',
      'Expensive to build — prioritize if tools are running low.',
    ],
  },
  {
    id: 'tailor', name: 'Tailor', category: 'Resource',
    size: [3, 3], cost: { log: 32, stone: 48, iron: 18 }, constructionWork: 250,
    workers: 1, radius: 0,
    description: 'A workshop that crafts coats from leather and cloth from wool. Coats protect citizens from the cold; without them, warmth drops much faster.',
    profession: 'Tailor',
    details: [
      'Crafts 1 Coat from 2 Leather, or 2 Cloth from 3 Wool.',
      'Cycles between recipes based on available materials.',
      'Coats wear out over about 2 years.',
      'Citizens without coats lose warmth 2\u00d7 faster.',
    ],
  },
  {
    id: 'dairy', name: 'Dairy', category: 'Resource',
    size: [3, 3], cost: { log: 30, stone: 20, iron: 4 }, constructionWork: 200,
    workers: 1, radius: 0,
    description: 'Processes fresh milk from your pastures into cheese. Cheese counts as cooked food, providing better nourishment than raw milk.',
    profession: 'Dairymaid',
    details: [
      'Converts 3 Milk into 2 Cheese per cycle.',
      'Requires a Pasture with cattle producing milk.',
      'Cheese counts as cooked food for diet variety purposes.',
    ],
  },
  {
    id: 'quarry', name: 'Stone Quarry', category: 'Resource',
    size: [4, 3], cost: { log: 40 }, constructionWork: 300,
    workers: 3, radius: 20,
    description: 'An open-pit quarry for extracting stone. Workers first collect surface deposits, then dig underground reserves that slowly deplete over time.',
    profession: 'Miner',
    details: [
      'Produces 15 Stone per cycle.',
      'First exhausts visible stone deposits within the work radius.',
      'Once surface stone is gone, miners switch to underground reserves.',
      'Underground reserves are large but eventually deplete, reducing output.',
      'Place near visible stone deposits for best early output.',
    ],
  },
  {
    id: 'mine', name: 'Iron Mine', category: 'Resource',
    size: [4, 4], cost: { log: 60, stone: 30 }, constructionWork: 450,
    workers: 3, radius: 20,
    description: 'An iron mine for extracting ore. Workers harvest surface deposits first, then tunnel into underground veins that gradually run dry.',
    profession: 'Miner',
    details: [
      'Produces 10 Iron per cycle.',
      'Collects surface iron deposits within the work radius first.',
      'Underground veins are finite and deplete faster at high extraction rates.',
      'Higher elevation locations tend to have richer iron deposits.',
      'Place near visible iron deposits for best results.',
    ],
  },

  // ── Services ──
  {
    id: 'herbalist', name: 'Herbalist', category: 'Services',
    size: [3, 3], cost: { log: 26, stone: 10 }, constructionWork: 150,
    workers: 1, radius: 30,
    description: 'Gathers medicinal herbs from the surrounding area and treats nearby sick citizens. Herbs are also consumed automatically when a citizen\'s health drops low.',
    profession: 'Herbalist',
    details: [
      'Gathers 2 Herbs per cycle from surrounding wildland.',
      'Actively cures sick citizens within a 30-tile radius.',
      'Herbs are consumed automatically when any citizen\'s health drops below 75%.',
      'Each herb consumed restores a significant amount of health.',
      'Herb gathering is seasonal — peaks in late spring, unavailable in winter.',
    ],
  },
  {
    id: 'market', name: 'Market', category: 'Services',
    size: [5, 5], cost: { log: 60, stone: 40, iron: 16 }, constructionWork: 500,
    workers: 3, radius: 40,
    description: 'A bustling marketplace that distributes goods to nearby homes and provides a happiness boost to citizens in the area.',
    profession: 'Vendor',
    details: [
      'Citizens within 40 tiles receive periodic happiness boosts.',
      'Does not block citizen movement.',
      'Vendors help distribute resources from storage to houses.',
      'Place centrally for maximum coverage.',
    ],
  },
  {
    id: 'school', name: 'School', category: 'Services',
    size: [4, 4], cost: { log: 82, stone: 80, iron: 40 }, constructionWork: 600,
    workers: 1, radius: 0,
    description: 'Educates young citizens before they enter the workforce. Educated workers produce 50% more at their jobs.',
    profession: 'Teacher',
    upgradesTo: 'academy',
    upgradeCost: { log: 40, stone: 80, iron: 40 }, upgradeWork: 600,
    details: [
      'Children reaching working age while a staffed school exists become educated.',
      'Educated workers get a +50% bonus to production and construction speed.',
      'Requires 1 teacher — a significant workforce investment for long-term gains.',
      'The education bonus is permanent once a citizen is educated.',
    ],
  },
  {
    id: 'trading_post', name: 'Trading Post', category: 'Services',
    size: [5, 5], cost: { log: 58, stone: 62, iron: 40 }, constructionWork: 600,
    workers: 2, radius: 0,
    description: 'A riverside trading post that attracts merchants. When a merchant arrives, you can trade surplus goods for resources you need.',
    profession: 'Trader',
    requirements: ['Must be placed adjacent to water.'],
    details: [
      'Merchants visit periodically by river — roughly once per year.',
      'Each merchant brings 3 types of goods in quantities of 20\u201380.',
      'Merchants stay for about 1 day before departing.',
      'Trade values vary by resource — tools and coats are worth the most.',
    ],
  },
  {
    id: 'tavern', name: 'Tavern', category: 'Services',
    size: [4, 4], cost: { log: 50, stone: 30, iron: 10 }, constructionWork: 400,
    workers: 1, radius: 0,
    description: 'A social gathering place where citizens relax in the evenings. Visiting the tavern boosts happiness significantly.',
    profession: 'Barkeep',
    details: [
      'Citizens visit the tavern during evening hours (after 60% of the day has passed).',
      'Provides a steady happiness boost while citizens are present.',
      'Social interactions at the tavern are more likely.',
      'A 15% chance each evening that an idle citizen will visit.',
    ],
  },
  {
    id: 'well', name: 'Well', category: 'Services',
    size: [2, 2], cost: { log: 8, stone: 20 }, constructionWork: 100,
    workers: 0, radius: 15,
    description: 'A communal well that passively increases happiness for all citizens within its 15-tile radius. Requires no workers.',
    upgradesTo: 'stone_well',
    upgradeCost: { stone: 50, iron: 4 }, upgradeWork: 150,
    details: [
      'Provides a small but constant happiness boost to nearby citizens.',
      'No workers needed — place it and forget it.',
      'Cheap to build; great for filling happiness gaps.',
    ],
  },
  {
    id: 'chapel', name: 'Chapel', category: 'Services',
    size: [3, 3], cost: { log: 40, stone: 50, iron: 8 }, constructionWork: 350,
    workers: 0, radius: 0,
    description: 'A place of worship and celebration. Weddings held at the chapel grant a large happiness boost to the couple and a small morale lift to the entire community.',
    details: [
      'When a chapel exists, couples will marry there and receive +10 happiness.',
      'Provides a small village-wide community happiness boost.',
      'No workers needed — the spiritual benefit is passive.',
    ],
  },
  {
    id: 'town_hall', name: 'Town Hall', category: 'Services',
    size: [5, 5], cost: { log: 80, stone: 60, iron: 20 }, constructionWork: 800,
    workers: 0, radius: 0,
    description: 'The administrative heart of your settlement. Unlocks seasonal festivals that grant powerful bonuses: faster crop growth, reduced disease, less spoilage, and more.',
    details: [
      'Unlocks 4 seasonal festivals: Planting Day, Midsummer, Harvest Festival, and Frost Fair.',
      'Festivals last 1 full day and grant an immediate +10 happiness to all citizens.',
      'Festival bonuses linger for the rest of the season group.',
      'Expensive but provides unique benefits no other building can match.',
    ],
  },

  // ── Infrastructure ──
  {
    id: 'road', name: 'Dirt Road', category: 'Infrastructure',
    size: [1, 1], cost: { log: 1 }, constructionWork: 20,
    workers: 0, radius: 0,
    description: 'A simple dirt path that doubles citizen movement speed. Cheap to build and essential for connecting distant parts of your settlement.',
    details: [
      'Citizens move 2\u00d7 faster on roads.',
      'Roads also slightly reduce pathfinding costs, making routes more efficient.',
      'Drag to place multiple segments at once.',
      'Can be upgraded to Stone Roads for even faster travel.',
    ],
  },
  {
    id: 'stone_road', name: 'Stone Road', category: 'Infrastructure',
    size: [1, 1], cost: { stone: 2 }, constructionWork: 60,
    workers: 0, radius: 0,
    description: 'Durable stone paving that triples movement speed. Can be placed over existing dirt roads or on empty terrain.',
    isTier2: true, upgradeFrom: 'road',
    details: [
      'Citizens move 3\u00d7 faster on stone roads.',
      'Can be placed directly over existing dirt roads.',
      'More expensive than dirt roads but significantly faster.',
    ],
  },
  {
    id: 'bridge', name: 'Wooden Bridge', category: 'Infrastructure',
    size: [1, 1], cost: { log: 3, stone: 2 }, constructionWork: 50,
    workers: 0, radius: 0,
    description: 'A wooden bridge that allows citizens to cross rivers and lakes. Drag to span a body of water.',
    details: [
      'Essential for connecting settlements separated by rivers.',
      'Drag from one shore to another to place a series of bridge tiles.',
      'Slightly slower than roads but much faster than swimming.',
    ],
  },

  // ── Tier-2 Upgraded Buildings (obtained by upgrading, not built from scratch) ──
  {
    id: 'stone_house', name: 'Stone House', category: 'Housing',
    size: [3, 3], cost: {}, constructionWork: 0,
    workers: 0, radius: 0, residents: 7,
    isTier2: true, upgradeFrom: 'wooden_house',
    description: 'An upgrade to the Wooden House. Stone walls provide better insulation and room for 7 residents instead of 5.',
    improvements: [
      'Houses 7 residents (up from 5).',
      'Better warmth retention during cold seasons.',
    ],
  },
  {
    id: 'stone_barn', name: 'Stone Barn', category: 'Storage',
    size: [4, 4], cost: {}, constructionWork: 0,
    workers: 0, radius: 0, storageCapacity: 10000,
    isTier2: true, upgradeFrom: 'storage_barn',
    description: 'A reinforced stone barn with greater capacity and the best food preservation in the game.',
    improvements: [
      'Capacity increased to 10,000 (up from 6,000).',
      'Food spoilage reduced by 90% (up from 80%).',
    ],
  },
  {
    id: 'gathering_lodge', name: 'Gathering Lodge', category: 'Food',
    size: [3, 3], cost: {}, constructionWork: 0,
    workers: 6, radius: 40,
    isTier2: true, upgradeFrom: 'gathering_hut',
    description: 'An expanded gathering operation with room for more foragers and a wider search area.',
    profession: 'Gatherer',
    improvements: [
      '6 workers (up from 4).',
      '40-tile work radius (up from 30).',
    ],
  },
  {
    id: 'hunting_lodge', name: 'Hunting Lodge', category: 'Food',
    size: [3, 3], cost: {}, constructionWork: 0,
    workers: 5, radius: 40,
    isTier2: true, upgradeFrom: 'hunting_cabin',
    description: 'A well-equipped hunting outpost with more hunters and an extended range.',
    profession: 'Hunter',
    improvements: [
      '5 workers (up from 3).',
      '40-tile work radius (up from 30).',
    ],
  },
  {
    id: 'forestry_hall', name: 'Forestry Hall', category: 'Resource',
    size: [4, 4], cost: {}, constructionWork: 0,
    workers: 6, radius: 40,
    isTier2: true, upgradeFrom: 'forester_lodge',
    description: 'A large forestry operation with more workers and a wider planting and harvesting radius.',
    profession: 'Forester',
    improvements: [
      '6 workers (up from 4).',
      '40-tile work radius (up from 30).',
      'Larger 4\u00d74 footprint (requires space to expand).',
    ],
  },
  {
    id: 'sawmill', name: 'Sawmill', category: 'Resource',
    size: [3, 3], cost: {}, constructionWork: 0,
    workers: 2, radius: 0,
    isTier2: true, upgradeFrom: 'wood_cutter',
    description: 'A mechanized wood-processing facility that produces more firewood per log, faster.',
    profession: 'Wood Cutter',
    improvements: [
      '2 workers (up from 1).',
      '9 Firewood per Log (up from 6).',
      'Faster cycle time.',
      'Larger 3\u00d73 footprint (requires space to expand).',
    ],
  },
  {
    id: 'iron_works', name: 'Iron Works', category: 'Resource',
    size: [3, 3], cost: {}, constructionWork: 0,
    workers: 2, radius: 0,
    isTier2: true, upgradeFrom: 'blacksmith',
    description: 'An advanced forge with room for two smiths and faster tool production.',
    profession: 'Blacksmith',
    improvements: [
      '2 workers (up from 1).',
      'Faster cycle time (10 hours vs 14 hours).',
    ],
  },
  {
    id: 'stone_well', name: 'Stone Well', category: 'Services',
    size: [2, 2], cost: {}, constructionWork: 0,
    workers: 0, radius: 25,
    isTier2: true, upgradeFrom: 'well',
    description: 'A deep stone well with a wider area of effect and stronger happiness boost.',
    improvements: [
      '25-tile radius (up from 15).',
      'Doubled happiness aura strength.',
    ],
  },
  {
    id: 'academy', name: 'Academy', category: 'Services',
    size: [4, 4], cost: {}, constructionWork: 0,
    workers: 2, radius: 0,
    isTier2: true, upgradeFrom: 'school',
    description: 'An advanced institution of learning with two teachers. Educated workers receive a +75% production bonus instead of +50%.',
    profession: 'Teacher',
    improvements: [
      '2 teachers (up from 1).',
      'Educated workers get +75% bonus (up from +50%).',
    ],
  },
];

// ── Recipes ───────────────────────────────────────────────

const recipes = [
  // Gathering
  { buildingId: 'gathering_hut', inputs: {}, outputs: { berries: 5, mushrooms: 3, roots: 3 }, cycleTicks: 120, seasonal: true },
  { buildingId: 'gathering_lodge', inputs: {}, outputs: { berries: 5, mushrooms: 3, roots: 3 }, cycleTicks: 120, seasonal: true },
  { buildingId: 'hunting_cabin', inputs: {}, outputs: { venison: 8, leather: 3 }, cycleTicks: 180, seasonal: true },
  { buildingId: 'hunting_lodge', inputs: {}, outputs: { venison: 8, leather: 3 }, cycleTicks: 180, seasonal: true },
  { buildingId: 'fishing_dock', inputs: {}, outputs: { fish: 8 }, cycleTicks: 100, seasonal: true },
  { buildingId: 'herbalist', inputs: {}, outputs: { herbs: 2 }, cycleTicks: 200, seasonal: true },
  { buildingId: 'crop_field', inputs: {}, outputs: { wheat: 10, cabbage: 6, potato: 6 }, cycleTicks: 300, seasonal: true },

  // Processing
  { buildingId: 'wood_cutter', inputs: { log: 1 }, outputs: { firewood: 6 }, cycleTicks: 100 },
  { buildingId: 'sawmill', inputs: { log: 1 }, outputs: { firewood: 9 }, cycleTicks: 80 },
  { buildingId: 'blacksmith', inputs: { iron: 1, log: 1 }, outputs: { tool: 1 }, cycleTicks: 350 },
  { buildingId: 'iron_works', inputs: { iron: 1, log: 1 }, outputs: { tool: 1 }, cycleTicks: 250 },
  { buildingId: 'tailor', inputs: { leather: 2 }, outputs: { coat: 1 }, cycleTicks: 300 },
  { buildingId: 'tailor', inputs: { wool: 3 }, outputs: { cloth: 2 }, cycleTicks: 250 },
  { buildingId: 'dairy', inputs: { milk: 3 }, outputs: { cheese: 2 }, cycleTicks: 200 },

  // Bakery (cycles through all 4)
  { buildingId: 'bakery', inputs: { wheat: 3 }, outputs: { bread: 4 }, cycleTicks: 150 },
  { buildingId: 'bakery', inputs: { fish: 2, potato: 2 }, outputs: { fish_stew: 3 }, cycleTicks: 200 },
  { buildingId: 'bakery', inputs: { berries: 3, wheat: 2 }, outputs: { berry_pie: 3 }, cycleTicks: 200 },
  { buildingId: 'bakery', inputs: { cabbage: 2, potato: 2, roots: 1 }, outputs: { vegetable_soup: 3 }, cycleTicks: 180 },

  // Quarry & Mine
  { buildingId: 'quarry', inputs: {}, outputs: { stone: 15 }, cycleTicks: 280 },
  { buildingId: 'mine', inputs: {}, outputs: { iron: 10 }, cycleTicks: 420 },
];

// ── Seasons ───────────────────────────────────────────────

const seasons = [
  { name: 'Early Spring', group: 'Spring', temp: 5, crop: 0, gather: 0.5, hunt: 0.6, fish: 0.5, herbs: 0.3, snow: false, dayLength: 0.5,
    notes: 'The thaw begins. Foraging is limited; too early for crops.' },
  { name: 'Mid Spring', group: 'Spring', temp: 12, crop: 0.5, gather: 0.8, hunt: 0.7, fish: 0.7, herbs: 0.7, snow: false, dayLength: 0.6,
    notes: 'Warm enough to plant crops. Berries and herbs begin to appear.' },
  { name: 'Late Spring', group: 'Spring', temp: 18, crop: 0.8, gather: 1.0, hunt: 0.6, fish: 0.9, herbs: 1.0, snow: false, dayLength: 0.7,
    notes: 'Peak herb season. Crops grow quickly. Fishing is strong.' },
  { name: 'Early Summer', group: 'Summer', temp: 24, crop: 1.0, gather: 1.0, hunt: 0.5, fish: 1.0, herbs: 1.0, snow: false, dayLength: 0.8,
    notes: 'Maximum crop growth and gathering. Hunting slows as animals hide.' },
  { name: 'Mid Summer', group: 'Summer', temp: 28, crop: 1.0, gather: 1.0, hunt: 0.4, fish: 1.0, herbs: 0.8, snow: false, dayLength: 0.9,
    notes: 'Longest days. Peak production for most activities. Drought risk.' },
  { name: 'Late Summer', group: 'Summer', temp: 25, crop: 0.9, gather: 0.9, hunt: 0.5, fish: 0.9, herbs: 0.6, snow: false, dayLength: 0.8,
    notes: 'Still productive but beginning to wind down.' },
  { name: 'Early Autumn', group: 'Autumn', temp: 18, crop: 0.5, gather: 0.7, hunt: 0.8, fish: 0.7, herbs: 0.4, snow: false, dayLength: 0.6,
    notes: 'Harvest time! Gather remaining crops before winter.' },
  { name: 'Mid Autumn', group: 'Autumn', temp: 10, crop: 0, gather: 0.5, hunt: 1.0, fish: 0.5, herbs: 0.2, snow: false, dayLength: 0.5,
    notes: 'Best hunting season. No more crop growth. Prepare for winter.' },
  { name: 'Late Autumn', group: 'Autumn', temp: 3, crop: 0, gather: 0, hunt: 0.8, fish: 0.3, herbs: 0, snow: false, dayLength: 0.4,
    notes: 'Last chance to stockpile. Foraging and herbs are finished.' },
  { name: 'Early Winter', group: 'Winter', temp: -5, crop: 0, gather: 0, hunt: 0.5, fish: 0.2, herbs: 0, snow: true, dayLength: 0.3,
    notes: 'Snow falls. Citizens need warmth. Firewood is critical.' },
  { name: 'Mid Winter', group: 'Winter', temp: -15, crop: 0, gather: 0, hunt: 0.3, fish: 0.1, herbs: 0, snow: true, dayLength: 0.25,
    notes: 'The harshest period. Extreme cold drains warmth rapidly. Harsh Winter risk.' },
  { name: 'Late Winter', group: 'Winter', temp: -10, crop: 0, gather: 0, hunt: 0.4, fish: 0.2, herbs: 0, snow: true, dayLength: 0.3,
    notes: 'The worst is over. Survive a few more weeks until the thaw.' },
];

// ── Festivals ─────────────────────────────────────────────

const festivals = [
  {
    name: 'Planting Day', season: 'Early Spring',
    description: 'Celebrates the start of the growing season with community planting.',
    effect: 'Crop growth speed increased by 50%.',
    icon: '\ud83c\udf31',
  },
  {
    name: 'Midsummer', season: 'Mid Summer',
    description: 'A joyful celebration of the longest days of the year.',
    effect: 'All happiness gains doubled.',
    icon: '\u2600\ufe0f',
  },
  {
    name: 'Harvest Festival', season: 'Early Autumn',
    description: 'A feast honoring the autumn harvest and giving thanks.',
    effect: 'Food spoilage rate halved.',
    icon: '\ud83c\udf3e',
  },
  {
    name: 'Frost Fair', season: 'Early Winter',
    description: 'A winter market and celebration to lift spirits in the cold.',
    effect: 'Disease chance halved.',
    icon: '\u2744\ufe0f',
  },
];

// ── Milestones ────────────────────────────────────────────

const milestones = [
  { name: 'First Shelter', condition: 'Build your first house', reward: '+2% gathering speed' },
  { name: 'Winter Survivors', condition: 'Survive to Year 2 with no deaths', reward: '+1 baseline happiness' },
  { name: 'Growing Village', condition: 'Reach 10 population', reward: '+2% work speed' },
  { name: 'Thriving Settlement', condition: 'Reach 20 population', reward: '+3% work speed' },
  { name: 'Bustling Town', condition: 'Reach 50 population', reward: '+5% work speed' },
  { name: 'Open for Business', condition: 'Complete your first trade', reward: '+10% trade value' },
  { name: 'Reaping Rewards', condition: 'Harvest your first crop', reward: '+5% crop growth' },
  { name: 'New Generation', condition: 'First child born in the settlement', reward: '+1 baseline happiness' },
  { name: 'Pursuit of Knowledge', condition: 'Build a school and educate a citizen', reward: '+3% education bonus' },
  { name: 'Self-Sufficient', condition: 'Have berries, venison, fish, tools, coats, and firewood in stock', reward: '+5% all production' },
];

// ── Citizen Needs ─────────────────────────────────────────

const needs = [
  {
    name: 'Food', color: '#44aa44',
    description: 'How well-fed the citizen is. Drops steadily and must be replenished by eating.',
    danger: 'At zero, citizens take starvation damage and will eventually die.',
    tips: [
      'Citizens eat automatically when food drops below 65%.',
      'Cooked meals restore 50% more than raw food.',
      'A varied diet (3+ food types) boosts happiness; monotony reduces it.',
    ],
  },
  {
    name: 'Warmth', color: '#ff8844',
    description: 'Body temperature. Drops faster in cold weather and without a coat.',
    danger: 'At zero during freezing temperatures, citizens take cold damage.',
    tips: [
      'Keep houses stocked with firewood for warmth.',
      'Coats reduce warmth decay significantly.',
      'Sleeping at home provides the best warmth recovery.',
    ],
  },
  {
    name: 'Health', color: '#ff4444',
    description: 'Physical well-being. Damaged by starvation, freezing, disease, and old age.',
    danger: 'At zero, the citizen dies.',
    tips: [
      'Health recovers slowly when food, warmth, and energy are above 30%.',
      'Herbs are consumed automatically when health drops below 75%.',
      'An Herbalist actively cures disease in nearby citizens.',
    ],
  },
  {
    name: 'Energy', color: '#ffdd44',
    description: 'How rested the citizen is. Drops while awake, recovers while sleeping.',
    danger: 'When exhausted, citizens will stop working and go home to sleep.',
    tips: [
      'Citizens sleep at night automatically and wake at dawn.',
      'Sleeping at home recovers energy faster.',
      'Citizens collapse from exhaustion at very low energy.',
    ],
  },
  {
    name: 'Happiness', color: '#44aaff',
    description: 'Overall morale. Affected by diet variety, social interactions, and living conditions.',
    danger: 'Low happiness has no direct death effect but indicates poor conditions.',
    tips: [
      'Eat a varied diet (3+ food types) for a happiness boost.',
      'Build Wells, Chapels, Taverns, and Markets for passive happiness.',
      'Festivals at the Town Hall provide large happiness boosts.',
    ],
  },
];

// ── Skills ────────────────────────────────────────────────

const skills = [
  { name: 'Farming', buildings: ['Crop Field'] },
  { name: 'Forestry', buildings: ['Forester Lodge', 'Forestry Hall'] },
  { name: 'Mining', buildings: ['Stone Quarry', 'Iron Mine'] },
  { name: 'Cooking', buildings: ['Bakery'] },
  { name: 'Building', buildings: ['Any construction site'] },
  { name: 'Gathering', buildings: ['Gathering Hut', 'Gathering Lodge'] },
  { name: 'Fishing', buildings: ['Fishing Dock'] },
  { name: 'Hunting', buildings: ['Hunting Cabin', 'Hunting Lodge'] },
  { name: 'Herding', buildings: ['Chicken Coop', 'Pasture'] },
];

// ── Personality Traits ────────────────────────────────────

const traits = [
  { name: 'Hardworking', color: '#44cc44', effect: '+15% work speed' },
  { name: 'Lazy', color: '#cc8844', effect: '-15% work speed' },
  { name: 'Cheerful', color: '#ffdd44', effect: '2\u00d7 social interaction chance, 1.5\u00d7 happiness gains' },
  { name: 'Shy', color: '#8888cc', effect: 'Rarely socializes with others' },
  { name: 'Adventurous', color: '#44ccaa', effect: 'Gains happiness from wandering' },
];

// ── Weather Events ────────────────────────────────────────

const weatherEvents = [
  {
    name: 'Storm', seasons: 'Any season',
    description: 'Heavy winds and rain batter the settlement.',
    effects: ['Buildings take durability damage.', 'Crop growth slows.', 'Citizens caught outside lose warmth rapidly.'],
  },
  {
    name: 'Drought', seasons: 'Summer only',
    description: 'A prolonged dry spell scorches the land.',
    effects: ['Crop efficiency drops to 30%.', 'Lasts for an extended period.'],
  },
  {
    name: 'Harsh Winter', seasons: 'Winter only',
    description: 'An extreme cold snap grips the settlement.',
    effects: ['All citizens lose warmth rapidly.', 'Even citizens indoors are affected.'],
  },
];

// ── Starting Conditions ───────────────────────────────────

const startingConditions = {
  population: { adults: 20, children: 2 },
  resources: {
    log: 150, stone: 50, iron: 20,
    tool: 8, coat: 7, firewood: 80,
    berries: 200, roots: 100, venison: 50,
  },
};

// ── Professions ───────────────────────────────────────────

const professions = [
  { name: 'Laborer', toolRequired: false, description: 'Unassigned workers who help with construction.' },
  { name: 'Farmer', toolRequired: true, description: 'Tends Crop Fields through the growing season.' },
  { name: 'Gatherer', toolRequired: false, description: 'Forages berries, mushrooms, and roots from forests.' },
  { name: 'Hunter', toolRequired: true, description: 'Hunts deer for venison and leather.' },
  { name: 'Fisherman', toolRequired: true, description: 'Catches fish from nearby water.' },
  { name: 'Forester', toolRequired: true, description: 'Plants and harvests trees for sustainable lumber.' },
  { name: 'Wood Cutter', toolRequired: true, description: 'Splits logs into firewood.' },
  { name: 'Blacksmith', toolRequired: true, description: 'Forges tools from iron and logs.' },
  { name: 'Tailor', toolRequired: false, description: 'Crafts coats from leather and cloth from wool.' },
  { name: 'Herbalist', toolRequired: false, description: 'Gathers herbs and treats sick citizens.' },
  { name: 'Vendor', toolRequired: false, description: 'Distributes goods at the Market.' },
  { name: 'Teacher', toolRequired: false, description: 'Educates children at Schools and Academies.' },
  { name: 'Trader', toolRequired: false, description: 'Manages trade at the Trading Post.' },
  { name: 'Baker', toolRequired: false, description: 'Cooks raw ingredients into meals at the Bakery.' },
  { name: 'Barkeep', toolRequired: false, description: 'Runs the Tavern for evening socializing.' },
  { name: 'Herder', toolRequired: false, description: 'Tends chickens or cattle at Coops and Pastures.' },
  { name: 'Dairymaid', toolRequired: false, description: 'Processes milk into cheese at the Dairy.' },
  { name: 'Miner', toolRequired: true, description: 'Extracts stone or iron at Quarries and Mines.' },
];

// ── Navigation Helper ─────────────────────────────────────

function initNav() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });
}

// ── Export ─────────────────────────────────────────────────

export const ManualData = {
  // Helpers
  ticksToTime,
  buildTime,
  formatCost,
  resourceName,
  buildingById,
  recipesForBuilding,
  formatOutputs,
  formatInputs,
  initNav,

  // Data
  categoryColors,
  resources,
  resourceCategories,
  foodTypes,
  cookedFoodTypes,
  animalFoodTypes,
  buildings,
  recipes,
  seasons,
  festivals,
  milestones,
  needs,
  skills,
  traits,
  weatherEvents,
  startingConditions,
  professions,
};
