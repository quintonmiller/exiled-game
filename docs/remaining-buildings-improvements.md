# Remaining Buildings — Review & Improvements

Covers all buildings not already documented individually (House, Gathering Hut, Hunting Cabin, Fishing Dock have their own docs).

---

## Resource / Production Buildings

### Forester Lodge
**Current:** 3x3, 28 logs + 12 stone, 4 workers, workRadius 30, roaming. Produces 4 logs every 180 ticks. Has unique `updateForester()` logic that actually plants saplings on grass tiles and grows existing trees. Consumes trees when harvesting. Workers roam the radius.

**What works well:**
- Only building that actively manages the map — plants and grows trees
- Creates a sustainable forestry loop (harvest → replant → regrow)
- Roaming behavior fits the role

**Issues & improvements:**
- Should require tools (currently excluded from `buildingNeedsTools()` despite axes being essential for logging)
- Tree growth is very slow (5 months per density level) — could use tuning
- No visual indicator of which trees are saplings vs mature
- Workers roam randomly instead of pathing to mature trees for harvest or empty tiles for planting
- No differentiation between tree types (hardwood/softwood)
- Overlapping forester radii don't compete — both plant and harvest the same tiles
- **Cross-building systems needed:** #2 (real map resources), #6 (worker pathfinding), #7 (radius competition)

### Wood Cutter
**Current:** 2x2, 24 logs + 8 stone, 1 worker, indoor. Converts 1 log → 3 firewood every 100 ticks. Requires tools.

**What works well:**
- Simple conversion building with clear purpose
- Creates demand for logs (feeds house warmth system)
- Tool requirement adds supply chain depth

**Issues & improvements:**
- No log quality or wood type distinction — all logs produce identical firewood
- Tool status invisible to player — no UI indicator when production halved
- Could produce byproducts (sawdust, kindling) for other uses
- Single worker feels limiting for a critical resource — could support 2
- No education bonus visibility (educated wood cutter gets 1.5x but player doesn't see this)
- **Cross-building systems needed:** #5 (per-citizen equipment for tool visibility)

### Blacksmith
**Current:** 3x3, 55 logs + 32 stone + 32 iron, 1 worker, indoor. Converts 1 iron + 1 log → 1 tool every 350 ticks. Requires tools to operate (paradox).

**What works well:**
- Central to the economy — 6 buildings need tools
- High material cost reflects importance
- Long production cycle balances tool availability

**Issues & improvements:**
- **Bootstrap paradox:** Blacksmith needs tools to make tools. Game starts with 8 tools. If all wear out, blacksmith operates at 50% but can recover — however this creates a potential death spiral
- No tool quality tiers — all tools identical regardless of smith skill
- Only 1 worker — bottleneck for larger settlements
- No specialization — same tool for farming, hunting, fishing, logging
- Iron sourcing is unclear (mined? traded? starting resources only?)
- Could produce other metal goods (nails for construction, horseshoes, weapons for defense)
- **Cross-building systems needed:** #5 (per-citizen equipment)

### Tailor
**Current:** 3x3, 32 logs + 48 stone + 18 iron, 1 worker, indoor. Multi-recipe: 2 leather → 1 coat (300 ticks) OR 3 wool → 2 cloth (250 ticks). Cycles through recipes round-robin.

**What works well:**
- Multi-recipe adds variety
- Coats are mechanically important (2x warmth loss without them)
- Leather from hunting creates a supply chain

**Issues & improvements:**
- **Cloth is an orphaned resource** — produced but never consumed anywhere. Appears incorrectly in `COOKED_FOOD_TYPES`. Needs a use (blankets for houses, sails, bandages for herbalist, trade good)
- Coats are global, not per-citizen — one coat "protects" everyone. Should be per-citizen inventory items
- No UI indication of which recipe is active or why production paused (missing inputs)
- Coat wear is silent — player doesn't know when coats are degrading
- Could add more recipes: cloth + leather → warm coat (better), wool → blankets
- **Cross-building systems needed:** #5 (per-citizen equipment)

### Dairy
**Current:** 3x3, 30 logs + 20 stone + 4 iron, 1 worker, indoor. Converts 3 milk → 2 cheese every 200 ticks.

**What works well:**
- Creates a multi-step supply chain (pasture → milk → dairy → cheese)
- Processed food adds dietary variety

**Issues & improvements:**
- Cheese is misclassified as "cooked food" (in `COOKED_FOOD_TYPES`) — gets full cooked meal bonuses (+5 warmth, +2 happiness, +5 energy) which is excessive
- Should be categorized as "processed" with smaller bonuses than bakery meals
- No aging mechanic — real cheese improves with time
- Supply chain is invisible — player can't see milk inventory between pasture and dairy
- Could add butter recipe (milk → butter, used in bakery recipes)
- **Cross-building systems needed:** #4 (storage/inventory visibility)

---

## Farming & Livestock

### Crop Field
**Current:** Flexible 3-16 tiles, free to build, 4 workers, uses crop stage growth system. Produces 10 wheat + 6 cabbage + 6 potato per harvest. Seasonal: plant spring, harvest autumn, killed by winter.

**What works well:**
- Growth stage system (5 stages) is more realistic than timer-based production
- Seasonal cycle creates planning tension (must harvest before winter)
- Weather affects growth (drought 0.1x, storms damage)
- Produces hay as byproduct (feeds livestock)
- Requires tools

**Issues & improvements:**
- **No crop selection** — always produces the same wheat/cabbage/potato mix. Player should choose what to plant
- **Field size doesn't affect output** — a 16x16 field produces the same as 3x3 with the same workers. Larger fields should yield more but take more workers
- **No soil fertility** — fields never degrade. Continuous farming should reduce yields without crop rotation or fertilizer
- **No irrigation** — proximity to water could boost growth
- No pest/blight mechanics (could pair with seasons)
- No fallow period mechanic (resting fields to restore fertility)
- Hay production is tiny (8 per harvest with 4 workers) vs livestock consumption needs
- **Cross-building systems needed:** #3 (seasonal curves)

### Chicken Coop
**Current:** 3x3, 20 logs + 8 stone, 1 herder. Starts with 3 chickens (max 8). Produces eggs every 12 hours, feathers every month. Chickens eat hay. Breed at 0.2% chance per animal per tick when healthy.

**What works well:**
- Health system with starvation damage
- Breeding mechanic creates natural population growth
- Multiple outputs (eggs + feathers)
- Herder required for collection

**Issues & improvements:**
- **Chickens eat only hay** — should eat grain, scraps, or insects. Hay is cattle feed
- **No winter cold penalty** — unlike cattle, chickens are unaffected by cold. Coops should provide shelter but unheated coops should still stress birds in deep winter
- **No slaughter mechanic** — can't convert chickens to meat. Only eggs and feathers
- **Feathers have no use** — produced but unclear what they're consumed by (arrows? pillows? trade only?)
- Breeding is chance-based with no player control — can't choose to breed or not
- No egg/meat tradeoff decision (more chickens = more eggs, but slaughtering reduces flock)
- No fox/predator threat mechanic
- **Cross-building systems needed:** #2 (real resources for feed variety)

### Pasture
**Current:** Flexible 3-12 tiles, 16 logs, 1 herder. Starts with 2 cattle (max 4). Produces milk every 12 hours, wool every season. Cattle eat hay. Winter cold damages health (-0.01/tick).

**What works well:**
- Winter exposure mechanic differentiates from chicken coop
- Dead cattle produce leather (2 per death)
- Milk feeds into dairy supply chain
- Wool feeds into tailor supply chain

**Issues & improvements:**
- **Field size doesn't affect capacity** — a 12x12 pasture holds the same 4 cattle as a 3x3. Capacity should scale with area
- **No slaughter mechanic** — can't actively butcher cattle for meat/leather. Must wait for starvation deaths
- **Feed rate identical to chickens** — cattle should eat significantly more than chickens per animal
- **No grazing** — cattle don't consume pasture grass. Overgrazing could degrade the field
- **Low max capacity** — only 4 cattle feels very limiting for a 6x6+ field
- Milk production doesn't scale with animal health/nutrition
- No distinction between dairy cows and beef cattle
- No barn/shelter building to protect cattle in winter (would solve the cold damage)
- **Cross-building systems needed:** #3 (seasonal curves for production rates)

---

## Service Buildings

### Herbalist
**Current:** 3x3, 26 logs + 10 stone, 1 worker, workRadius 30, roaming. Produces 2 herbs every 200 ticks. Herbs passively cure sick citizens within 30-tile radius at 0.5% chance per tick.

**What works well:**
- Roaming worker fits the role of herb forager
- Disease cure mechanic creates a needed function
- Work radius means placement near population matters

**Issues & improvements:**
- Herbs gathered from nothing — no map resources to deplete (unlike forester's trees)
- Cure is passive/invisible — no citizen visits the herbalist, cures just happen
- No preventive medicine — herbs could boost health/immunity before sickness
- Could cultivate herb gardens (like forester plants trees)
- No herb variety (medicinal herbs vs cooking herbs vs poisons)
- Worker wanders randomly instead of seeking herb-rich areas
- **Cross-building systems needed:** #2 (real map resources), #6 (worker pathfinding), #10 (NPC service interactions)

### Market
**Current:** 5x5, 60 logs + 40 stone + 16 iron, 3 vendors, workRadius 40, doesn't block movement. No recipe.

**What works well:**
- Large footprint and high cost reflects importance
- Doesn't block movement (open-air market feel)
- Work radius defines service area

**Issues & improvements:**
- **Description says "distributes goods to nearby houses" but it only gives a passive happiness buff (+0.5/tick to nearby citizens).** No actual goods distribution is implemented
- 3 vendor slots exist but vendors have no job — they're effectively unemployed
- No inventory — market doesn't stock or sell anything
- Should pull food/goods from storage buildings and make them available to nearby houses
- Could enable per-house food storage by being the distribution mechanism
- Vendors could physically carry goods from storage to houses
- Could have market days (periodic events with higher happiness)
- **Cross-building systems needed:** #4 (storage capacity), #1 (hauling), #10 (NPC services)

### School
**Current:** 4x4, 82 logs + 80 stone + 40 iron, 1 teacher. Children are instantly marked as educated when school exists with a teacher. Educated workers get +50% production.

**What works well:**
- Education bonus is meaningful (+50% is huge)
- High construction cost reflects long-term investment
- Children do walk to the school building

**Issues & improvements:**
- **Education is instant** — no attendance time, no curriculum, no graduation. Children just get flagged
- Teacher has no actual work mechanic — sits idle in the school
- No education progress (0-100%) — should take months/years
- No class size limit — 1 teacher educates unlimited children simultaneously
- No skill specialization — education gives flat bonus to everything
- Adults can never become educated — only children who were children when school existed
- Could add literacy requirement for certain jobs (scribe, trader)
- No school supplies consumed (books, paper, chalk)
- **Cross-building systems needed:** #10 (NPC services)

### Trading Post
**Current:** 5x5, 58 logs + 62 stone + 40 iron, 2 workers, requiresWater. Merchants arrive ~yearly with random goods. Stay for 1 day.

**What works well:**
- Water requirement adds placement constraint
- Merchant timing creates anticipation
- Trade goods are varied (logs, stone, iron, tools, coats, firewood)
- Merchant wants are varied (berries, venison, fish, logs, leather)

**Issues & improvements:**
- **No trading UI** — merchant arrives and leaves with no visible player interaction. This is arguably the most broken service building
- 2 workers assigned but have no function
- No merchant NPC visible on the map
- Player can't see what merchant offers or wants
- No negotiation or trade skill influence
- Merchant visit duration (1 day) is very short
- No way to attract more frequent merchants
- No exotic/luxury goods that only come from trade
- Could enable trade routes with regular merchants for specific goods
- **Cross-building systems needed:** #10 (NPC services), #1 (hauling for trade goods)

### Tavern
**Current:** 4x4, 50 logs + 30 stone + 10 iron, 1 barkeep. Citizens visit in evening (after 60% of day). 15% visit chance. Happiness gain +0.03/tick while visiting.

**What works well:**
- Evening-only visits feel natural
- Citizens enter the building (visible activity)
- Updates social tick counter (reduces loneliness)
- Barkeep requirement means it needs staffing

**Issues & improvements:**
- **No food or drink served** — citizens gain happiness from being there, but nothing is consumed
- Barkeep has no actual job mechanic — just stands in building
- Could consume ale/mead (brewed from wheat/berries) for better happiness
- Could serve cooked food (tavern meals)
- No social interaction between patrons — they're in the same building but don't interact
- Could add drunkenness (temporary happiness boost, next-day work penalty)
- Could be a gossip/news hub (citizens learn about events here)
- TAVERN_SOCIAL_RADIUS constant exists (4) but is unused
- **Cross-building systems needed:** #10 (NPC services)

### Well
**Current:** 2x2, 8 logs + 20 stone, no workers, workRadius 15. Passive +0.002 happiness/tick to citizens within radius.

**What works well:**
- Cheap to build (low stone cost)
- No worker required (passive benefit)
- Placement matters (radius-based)

**Issues & improvements:**
- **Purely decorative with a tiny effect** — 0.002/tick is barely noticeable
- No water mechanic — despite being a well, no water is drawn or used
- Citizens don't visit it or interact with it
- Could provide clean water (health boost, disease prevention)
- Could be a social gathering point (morning water collection)
- Could require periodic maintenance (well dries up, needs deepening)
- No visual feedback showing the happiness radius
- Water quality could degrade if too close to pastures/stockpiles (contamination)
- **Cross-building systems needed:** #10 (NPC services)

### Chapel
**Current:** 3x3, 40 logs + 50 stone + 8 iron, no workers. Weddings happen automatically here. Newlyweds get +10 happiness. All citizens get +0.001/tick passive community boost.

**What works well:**
- Wedding mechanic ties into population system (couples need chapel for bonus)
- Community morale is village-wide
- High stone cost reflects permanence

**Issues & improvements:**
- **No priest or clergy** — maxWorkers is 0, chapel is unmanned
- Weddings are instant and invisible — no ceremony, no attendance, no celebration
- Community boost is negligible (+0.001/tick)
- No funeral mechanic when citizens die
- No religious/spiritual progression
- Could host ceremonies that require citizen attendance (weekly service)
- Could provide comfort to grieving families (death happiness penalty reduced)
- Citizens don't visit chapel for any reason
- **Cross-building systems needed:** #10 (NPC services)

### Town Hall
**Current:** 5x5, 80 logs + 60 stone + 20 iron, no workers. Unlocks 4 seasonal festivals that auto-trigger. Each gives +15 happiness burst and lingering bonuses for rest of season.

**What works well:**
- Festival system is thematic and impactful
- Lingering effects create strategic value (Planting Day +20% crops, Frost Fair -50% disease)
- Citizens gather at Town Hall during festivals (visible celebration)
- Particle effects (lanterns) during festivals
- Most expensive building — feels like an achievement

**Issues & improvements:**
- Festivals are fully automatic — no player input on timing or resources
- No preparation phase — festivals don't consume food/ale/decorations
- No attendance tracking — benefit applies regardless of who shows up
- Only 4 festivals, always the same, always same time
- No governance mechanics — Town Hall could unlock policies, tax decisions, worker priorities
- No mayor/council NPC
- Festival bonuses may be too powerful (Frost Fair halving disease is huge for free)
- Could require festival supplies (food feast, ale, decorations) making festivals a real investment
- Could unlock player-initiated celebrations for morale during crises
- **Cross-building systems needed:** #10 (NPC services)

---

## Storage & Infrastructure

### Storage Barn
**Current:** 4x4, 40 logs + 16 stone, no workers, capacity 6000, isStorage. Reduces food spoilage to 20% of normal rate.

**What works well:**
- Spoilage reduction is a meaningful benefit
- Enclosed building (blocks movement) feels like indoor storage

**Issues & improvements:**
- **Capacity is never enforced** — storage component exists but resources go to an unlimited global pool. 6000 capacity is cosmetic
- **Only 1 barn needed** — spoilage check is binary (barn exists? yes/no). Multiple barns give no additional benefit
- No per-building inventory — can't see what's stored where
- No specialization (food barn vs material warehouse)
- Stockpile and barn are functionally almost identical (only difference is spoilage flag)
- Could implement temperature-based preservation (winter = natural cold storage)
- Vermin/pest risk in stored food
- **Cross-building systems needed:** #4 (storage capacity enforcement)

### Stockpile
**Current:** 4x4, FREE, no workers, capacity 5000, doesn't block movement. Open-air storage.

**What works well:**
- Free to build (immediate storage option)
- Doesn't block movement (open area)
- Lower capacity than barn (implicit trade-off)

**Issues & improvements:**
- **No functional difference from barn** (besides spoilage flag and cost) since capacity isn't enforced
- Should have worse spoilage than barn (outdoor exposure) — currently just doesn't get the barn's reduction
- Could be limited to raw materials only (logs, stone, iron — not food)
- Should be visually distinct (piles of resources visible on tiles)
- Multiple stockpiles should stack capacity
- **Cross-building systems needed:** #4 (storage capacity enforcement)

### Road
**Current:** 1x1, 1 log, instant construction. Citizens walk 2x faster. Pathfinder gives roads 0.5 cost (half of normal terrain).

**What works well:**
- Speed bonus is significant and correctly implemented in both MovementSystem and Pathfinder
- A* pathfinding naturally prefers roads (lower cost)
- Cheap and quick to build
- Supports click-and-drag placement

**Issues & improvements:**
- No road degradation — roads last forever with no maintenance
- No upgrade tiers (dirt → gravel → stone road with increasing speed bonuses)
- No network bonus — connected road chains could give extra speed
- Bridge mechanic missing — can't build roads over water
- No visual distinction for heavily-used roads vs unused ones
- Road building doesn't consume stone (only logs, which is odd for a path)
- Could add road maintenance worker who repairs degraded roads
- **Cross-building systems needed:** #8 (building repair/maintenance)

### Bakery
**Current:** 3x3, 36 logs + 24 stone + 8 iron, 2 workers, indoor. 4 recipes cycling round-robin: wheat→bread, fish+potato→stew, berries+wheat→pie, cabbage+potato+roots→soup.

**What works well:**
- Multi-recipe system with diverse inputs creates strategic variety
- Cooked food is significantly better than raw (more restore, warmth/happiness/energy buffs)
- Creates demand for multiple raw food types (wheat, fish, berries, cabbage, potato, roots)
- 2 workers allow decent throughput

**Issues & improvements:**
- Round-robin cycling is opaque — player can't see which recipe is active or control priority
- No recipe selection — player should be able to prioritize certain meals
- Bakery doesn't consume firewood/fuel for cooking (produces food from nothing but ingredients)
- No meal quality variation based on cook skill
- Could add more recipes as new ingredients become available
- Cooking should arguably require fire/fuel
- **Cross-building systems needed:** #5 (skill-based quality)

---

## Critical Bugs / Design Issues Found

1. **Cloth is orphaned** — Tailor produces cloth from wool but nothing in the game consumes it. It also incorrectly appears in `COOKED_FOOD_TYPES` in constants.ts
2. **Storage capacity is cosmetic** — Both Storage Barn and Stockpile define capacity that is never checked
3. **Market doesn't distribute goods** — Description promises distribution but code only applies happiness
4. **Trading Post has no UI** — Merchants arrive invisibly with no player interaction
5. **Cheese is miscategorized** — Listed in `COOKED_FOOD_TYPES` but made by Dairy, gets excessive meal bonuses
6. **Feather resource has no consumer** — Chicken Coop produces feathers with no use
7. **Multiple barns give no benefit** — Spoilage check is boolean, not scaled
8. **Forester excluded from tool requirement** — Logging without tools should have a penalty
