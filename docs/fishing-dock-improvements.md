# Fishing Dock Improvements

Tracking document for planned improvements to the Fishing Dock system.

## Current Implementation
- 3x4 building, 30 logs + 16 stone, 4 workers, must be adjacent to water
- Produces 8 fish every 100 ticks with no inputs (fastest gathering cycle)
- No map resource consumption — water tiles have no fish population
- Seasonal: uses dedicated `fishingRate` curve — peaks summer (100%), ice fishing in winter (10–20%), never fully zero
- Work radius is 0 — workers listed as roaming but don't actually move
- Requires tools (50% penalty without)
- No weather effects on production
- Output goes directly to global resource pool
- Fish can be eaten raw or cooked into fish stew at Bakery

## Planned Improvements

### 1. Fish Population in Water Tiles
- **Status:** Not started
- **Description:** Water tiles should have a fish population that depletes with fishing and regenerates over time. Overfishing a small pond should be possible. Rivers could have higher regeneration due to flow.
- **Notes:** Part of the broader "real map resources" system. Fish population could be a property on water/river tiles.

### 2. Seasonal Fishing Rates
- **Status:** Done
- **Description:** Fishing now uses its own `fishingRate` field in SeasonDefs with `seasonalMultiplier: true`. Peaks in summer (1.0), drops to ice-fishing levels in winter (0.1–0.2), never fully zero.
- **Notes:** Part of the per-building seasonal curves system. Weather impact on fishing (#3) could further modify these rates.

### 3. Weather Impact on Fishing
- **Status:** Not started
- **Description:** Storms should prevent or penalize fishing (dangerous conditions). Droughts could lower water levels and reduce fish population.
- **Notes:** Storms already damage buildings and crops — extending to fishing production is straightforward.

### 4. Meaningful Work Radius Over Water
- **Status:** Not started
- **Description:** The dock should have a work radius that measures available water area. More adjacent water = better output. A dock on a tiny pond should produce less than one on a large lake or river.
- **Notes:** Could count water tiles in radius similar to how gathering hut counts forest tiles. Part of the broader "meaningful work radius" system.

### 5. Worker Fishing Animation / Pathing
- **Status:** Not started
- **Description:** Workers should path to the water's edge within a work radius and visually fish. Return to dock with catch periodically.
- **Notes:** Part of the broader "workers path to resources" system.

### 6. Net / Boat Upgrades
- **Status:** Not started
- **Description:** Progression beyond skill levels. Early: line fishing (low output). Mid: nets (better output). Late: small boat (deeper water access, best output).
- **Notes:** Could tie into the equipment/tool system. Nets and boats as craftable items at a workshop.

### 7. Fish Variety
- **Status:** Not started
- **Description:** Different water bodies could support different fish types (river trout, lake perch, etc.) with different food values and seasonal availability.
- **Notes:** Adds dietary variety. Ties into seasonal rates (#2) and the cooking system.

### 8. Rebalance Year-Round Production
- **Status:** Done (via #2)
- **Description:** Fishing now has seasonal variation via `fishingRate`. Winter production drops to 10–20%, making it no longer a free year-round food source. Players must still stockpile for winter.
- **Notes:** Resolved by implementing seasonal fishing rates (#2).
