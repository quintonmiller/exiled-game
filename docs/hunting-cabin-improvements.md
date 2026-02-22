# Hunting Cabin Improvements

Tracking document for planned improvements to the Hunting Cabin system.

## Current Implementation
- 3x3 building, 38 logs + 10 stone, 3 workers, 30-tile work radius
- Produces 8 venison + 3 leather every 180 ticks with no inputs
- Consumes 1 tree per production cycle (forest = implicit deer habitat)
- No actual animals exist — deer are never simulated
- Workers roam randomly within work radius (same behavior as gathering hut)
- Requires tools (50% penalty without)
- Seasonal: uses dedicated `huntingRate` curve — peaks mid-autumn (100%), viable in winter (30–50%), lowest mid-summer (40%)
- Output goes directly to global resource pool
- No danger or injury risk to hunters
- Skill progression: HUNTING skill, +5% efficiency per level

## Planned Improvements

### 1. Wildlife Population System
- **Status:** Not started
- **Description:** Deer and other game animals should exist as a simulated population tied to forest tiles. Population grows naturally, migrates seasonally, and is depleted by hunting. Overhunting should be possible and recoverable over time.
- **Notes:** Forest density could influence animal spawning rates. Could be a lightweight population count per region rather than individual animal entities.

### 2. Stop Consuming Trees
- **Status:** Not started
- **Description:** Hunting currently strips forest tiles exactly like the gathering hut — deforestation from hunting makes no sense. Hunting should deplete animal population, not trees.
- **Notes:** Depends on improvement #1 (wildlife population). Forest density should still indirectly matter as animal habitat.

### 3. Separate Seasonal Curve for Hunting
- **Status:** Done
- **Description:** Hunting now uses its own `huntingRate` field in SeasonDefs instead of sharing `gatheringRate`. Peaks in mid-autumn (1.0), stays viable through winter (0.3–0.5), lowest in mid-summer (0.4) when animals retreat to deep forest.
- **Notes:** Spring breeding season restriction not yet implemented — could further reduce spring rates.

### 4. Hunter Danger / Injury Risk
- **Status:** Not started
- **Description:** Hunting large game should carry some risk of injury. A wounded hunter could need recovery time at home or treatment at the herbalist.
- **Notes:** Rare but meaningful. Could scale with animal type (rabbits = safe, boar = dangerous). Ties into improvement #8 (different animals).

### 5. Tracking Behavior Instead of Random Roaming
- **Status:** Not started
- **Description:** Hunters should path toward areas with higher animal density, "track" for a period, then return to the cabin with their kill. Should be visually distinct from gatherer wandering.
- **Notes:** Depends on improvement #1 (wildlife population) to have meaningful targets. Could show a brief "tracking" animation or pause at the target tile.

### 6. Physical Delivery of Kills
- **Status:** Not started
- **Description:** Venison and leather currently teleport to the global storage pool. Hunters should carry kills back to the cabin for processing, then to storage.
- **Notes:** Common need across gathering hut, hunting cabin, and likely other buildings. Part of a broader hauling/delivery system.

### 7. Trap / Snare Mechanic
- **Status:** Not started
- **Description:** Hunters could set traps in the work radius that passively catch small game, adding a secondary production method beyond active hunting expeditions.
- **Notes:** Traps could be visible on the map, require periodic checking, and produce small amounts of food (rabbits, birds). Good use of work radius.

### 8. Hunt Different Animals
- **Status:** Not started
- **Description:** Beyond deer, hunters could target rabbits (less food, easier, safer), boar (more food, more danger), or seasonal migratory birds. Different animals available in different seasons.
- **Notes:** Ties into seasonal curve (#3), danger (#4), and wildlife population (#1). Different animals could require different skill levels.
