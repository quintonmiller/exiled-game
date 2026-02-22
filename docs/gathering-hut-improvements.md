# Gathering Hut Improvements

Tracking document for planned improvements to the Gathering Hut system.

## Current Implementation
- 3x3 building, 30 logs + 12 stone, 4 workers, 30-tile work radius
- Produces 5 berries + 3 mushrooms + 3 roots every 120 ticks with no inputs
- Consumes 1 tree per production cycle from work radius
- Efficiency scales with forest tile count (need 50+ for full efficiency)
- Workers roam randomly within work radius (don't enter building)
- Seasonal: uses `gatheringRate` curve — 100% summer, 50–80% spring/autumn, 0% winter
- Output goes directly to global resource pool (no delivery)
- No tools required
- No warmth/shelter provided
- `requiresForest` flag exists but is never validated during placement

## Planned Improvements

### 1. Real Gatherable Resources on the Map
- **Status:** Not started
- **Description:** Berry bushes, mushroom patches, root plants should exist as actual tile features rather than materializing from forest adjacency. They deplete when harvested and regrow seasonally. Different resources appear in different seasons and biome areas.
- **Notes:** Requires new tile properties or map entity layer. Forest tiles could spawn gatherable sub-resources. Ties into seasonal yield diversity (improvement #5).

### 2. Gathering Should Require Tools
- **Status:** Not started
- **Description:** Gathering is currently the only food-production building that doesn't require tools (hunting, fishing, farming all do). Should require baskets, knives, or similar. The hut could store them.
- **Notes:** Simple change — add Gathering Hut to `buildingNeedsTools()` in ProductionSystem. Without tools, production drops to 50% (existing mechanic).

### 3. Physical Delivery Trips
- **Status:** Not started
- **Description:** Workers should gather resources at the source, carry them back to the hut (limited carry capacity), then bring batches to storage. Resources currently teleport to the global pool instantly.
- **Notes:** A barrow upgrade could increase carry capacity. Ties into the broader hauling system also needed for housing firewood delivery. Could be a shared improvement across multiple buildings.

### 4. Validate Forest Placement
- **Status:** Not started
- **Description:** `requiresForest: true` is defined on the building def but never checked in PlacementController. Should prevent placement or warn the player when insufficient forest exists in the work radius.
- **Notes:** Simple fix in PlacementController.canPlace(). Could show the work radius overlay during placement so players can see forest coverage.

### 5. Diverse Seasonal Yields
- **Status:** Not started
- **Description:** Instead of always producing the same 3 resources at a flat rate, output should vary by season. Berries peak in summer, mushrooms in autumn, roots available spring through autumn. Winter could produce tiny amounts of bark/pine nuts from evergreens.
- **Notes:** Could use per-resource seasonal multipliers in SeasonDefs rather than a single gatheringRate. Makes food variety planning more strategic.

### 6. Worker Pathfinding to Resources
- **Status:** Not started
- **Description:** Workers currently roam to random tiles within the work radius. They should path specifically toward gatherable resource tiles, "work" there briefly, then return to the hut.
- **Notes:** Depends on improvement #1 (real map resources). Would make worker behavior visually meaningful rather than aimless wandering.

### 7. Diminishing Returns from Overlapping Radii
- **Status:** Not started
- **Description:** Two gathering huts with overlapping work radii currently double-dip on the same forest tiles. Overlapping radii should compete for the same resources, reducing efficiency for both.
- **Notes:** Could track which tiles are "claimed" by a gathering building, or simply reduce efficiency based on overlap percentage.
