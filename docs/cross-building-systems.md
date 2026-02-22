# Cross-Building Systems

High-level game systems that need to be built or improved to support multiple building improvements. Instead of solving problems per-building, these are game-level systems that benefit many buildings at once.

---

## 1. Hauling & Delivery System
- **Status:** Not started
- **Affects:** Gathering Hut, Hunting Cabin, Fishing Dock, Forester Lodge, Wood Cutter, Bakery, Dairy, Market, Houses (firewood)
- **Current state:** All production buildings teleport output directly to the global resource pool. Houses receive firewood instantly from the global pool.
- **What's needed:**
  - Workers carry limited amounts (carry capacity per citizen)
  - Production buildings have a local output buffer — finished goods sit at the building until carried away
  - Hauler role or producing workers do their own delivery trips to storage
  - Delivery path: resource tile → production building → storage building
  - Barrow/cart upgrade to increase carry capacity
- **Why it matters:** Without this, production feels abstract. Citizens don't interact with the physical world — resources just appear and disappear.

## 2. Real Map Resources
- **Status:** Done
- **Affects:** Gathering Hut, Hunting Cabin, Fishing Dock, Herbalist, Forester Lodge
- **Implemented:** Tiles now have numeric resource fields (`berries`, `mushrooms`, `herbs`, `fish`, `wildlife`) that are generated during map creation, depleted by gathering buildings on production, and regrow seasonally via EnvironmentSystem.
  - **Generation:** Berry bushes on FOREST (40%) and FERTILE (20%) tiles; mushrooms on FOREST (30%); herbs on moist FOREST/GRASS/FERTILE (15%); fish on WATER/RIVER (80%); wildlife on FOREST (25%) and GRASS near forest (10%). Starting area is cleared of all resources.
  - **Gathering efficiency:** Each building type scales efficiency by its relevant tile resource count divided by a tuning divisor (replacing the old abstract forest-count method). Gathering Hut uses `(berries + mushrooms) / 40`, Hunting Cabin uses `wildlife / 20`, Fishing Dock uses `fish / 40`, Herbalist uses `herbs / 15`. Forester Lodge unchanged (still uses tree count).
  - **Depletion:** On each production cycle, the building consumes 1 unit of the relevant resource from a random tile in its work radius.
  - **Regrowth:** EnvironmentSystem scans tiles and regrows resources seasonally — berries in spring/summer, mushrooms peak in autumn (3x chance), herbs in spring/summer, fish year-round (slower in winter), wildlife year-round (slower in winter). All capped at per-tile maximums.
  - **Visuals:** RenderSystem draws berry dots (red/purple), mushroom semicircles (brown), herb crosses (green), and fish shimmer dots (blue) on tiles.
  - **Fishing Dock:** Now has `workRadius: 15` (was 0) so it can scan nearby water tiles.
  - **Save/load:** Tile resource fields are serialized/deserialized, backward-compatible with older saves (defaults to 0).
- **Remaining:**
  - Per-resource seasonal gathering splits within Gathering Hut (berries peak summer, mushrooms peak autumn) — currently combined into one efficiency score
  - Wildlife density visual indicator (skipped to avoid visual noise in dense forests)

## 3. Per-Building Seasonal Curves
- **Status:** Done
- **Affects:** Gathering Hut, Hunting Cabin, Fishing Dock, Herbalist, Crop Field
- **Implemented:** SeasonDefs now has four separate rate fields (`gatheringRate`, `huntingRate`, `fishingRate`, `herbRate`), each with a distinct seasonal curve. ProductionSystem reads the correct field per building type. Fishing Dock and Herbalist now have `seasonalMultiplier: true`.
  - Gathering: peaks summer, zero in winter (unchanged)
  - Hunting: peaks mid-autumn (1.0), stays viable in winter (0.3–0.5), lowest mid-summer (0.4)
  - Fishing: peaks summer (1.0), ice fishing in winter (0.1–0.2), never fully zero
  - Herbs: peaks late spring/early summer (1.0), dormant in winter (0)
- **Remaining:** Per-resource seasonal availability within gathering (berries peak summer, mushrooms peak autumn) — partially addressed by Real Map Resources (#2): berry tiles regrow in spring/summer and mushroom tiles peak in autumn, so seasonal availability is now emergent via tile regrowth. However, the Gathering Hut recipe still produces a fixed ratio of berries/mushrooms/roots per cycle rather than reflecting what's actually available on nearby tiles.

## 4. Storage Capacity Enforcement
- **Status:** Done (global cap)
- **Affects:** Storage Barn, Stockpile, all production buildings, Market
- **Implemented:** Global storage cap = BASE_STORAGE_CAPACITY (500) + sum of all completed storage buildings' storageCapacity values. `Game.addResource()` caps additions at capacity (overflow discarded). ProductionSystem and LivestockSystem pause production when storage is full. HUD shows `Sto: used/cap` with yellow (>80%) and red (full) coloring. InfoPanel shows per-building capacity and global fill bar when a storage building is selected.
- **Remaining:**
  - Per-building inventories (resources physically stored at specific buildings) — tied to hauling system (#1)
  - Storage Barn vs Stockpile differentiation: barn = indoor (reduces spoilage), stockpile = outdoor
  - Market pulls from storage buildings and distributes to houses

## 5. Per-Citizen Equipment & Clothing
- **Status:** Not started
- **Affects:** Blacksmith, Tailor, Houses, all tool-requiring buildings
- **Current state:** Tools are a global counter that wear down. Coats are a global counter. No citizen owns specific items.
- **What's needed:**
  - Each citizen has an equipment slot (tool) and clothing slot (coat)
  - Citizens without a tool work at 50% (existing mechanic but tracked per-person)
  - Citizens without a coat lose warmth faster (existing mechanic but per-person)
  - Tool/coat quality tiers (basic → improved → steel)
  - Citizens visit blacksmith/tailor when their equipment is worn out
  - Visual feedback: citizen info shows their equipment state
- **Why it matters:** Per-citizen equipment makes the blacksmith and tailor feel meaningful. Currently tools/coats are invisible abstract counters.

## 6. Worker Pathfinding to Resources
- **Status:** Not started
- **Affects:** Gathering Hut, Hunting Cabin, Fishing Dock, Herbalist, Forester Lodge
- **Current state:** All roaming workers pick random walkable tiles within the work radius. They wander aimlessly.
- **What's needed:**
  - Workers path toward actual resource locations (berry bushes, animal sightings, herb patches)
  - "Work" animation/pause at the resource tile for some ticks
  - Return to building with gathered goods
  - If no resources in radius, worker idles at building (visual signal to player that something is wrong)
- **Depends on:** System #2 (Real Map Resources) — now done; tile resource data is available via `TileMap.countResourceInRadius()` for pathfinding targets
- **Why it matters:** Worker behavior should communicate what's happening. Random wandering gives no feedback about the building's effectiveness.

## 7. Overlapping Radius Competition
- **Status:** Partially done (natural competition via shared depletion)
- **Affects:** Gathering Hut, Hunting Cabin, Herbalist, Forester Lodge, Fishing Dock
- **Current state:** With Real Map Resources (#2) implemented, overlapping buildings now naturally compete — both deplete from the same shared tile resource pool. Placing two Gathering Huts near the same forest will drain berries/mushrooms faster and reduce both buildings' efficiency.
- **Remaining:**
  - Tile "claiming" system where each resource tile is assigned to the nearest building (optional refinement)
  - UI: show work radius overlap during placement so players can plan spacing
- **Why it matters:** Players should think about building placement and spacing, not just spam buildings.

## 8. Building Repair & Maintenance
- **Status:** Not started
- **Affects:** All buildings (especially Wooden House, Storage Barn)
- **Current state:** All buildings decay at a fixed rate over ~28 years and collapse with no way to repair them. Citizens become homeless when houses collapse.
- **What's needed:**
  - Repair task for laborers or a dedicated maintenance worker
  - Repair consumes some materials (logs/stone depending on building type)
  - Priority system: repair near-collapse buildings first
  - UI indicator showing building durability state
  - Optional: maintenance building (workshop) that improves repair efficiency
- **Why it matters:** Buildings silently crumbling with no recourse feels unfair. Maintenance is a core loop in city builders.

## 9. Flammability & Fire System
- **Status:** Not started
- **Affects:** Wooden House, Storage Barn, and all wooden buildings
- **Current state:** No fire mechanics exist. Wooden buildings have no additional risk.
- **What's needed:**
  - Wooden buildings have a flammability rating
  - Fire can start from: lightning strikes (storms), house fireplaces, blacksmith forge
  - Fire spreads to adjacent buildings (chance based on distance and material)
  - Citizens prioritize firefighting as emergency task
  - Stone buildings resist fire; stone house upgrade becomes meaningful
  - Fire destroys stored resources in affected building
  - Drought increases fire chance
- **Why it matters:** Risk mechanics add tension. Currently there's no downside to dense wooden construction.

## 10. NPC Activity & Service System
- **Status:** Not started
- **Affects:** Market, Tavern, Well, Chapel, School, Trading Post
- **Current state:** Most service buildings are passive happiness buffs or have workers who do nothing. Market "distributes goods" but only gives happiness. Tavern has no drinks. School educates instantly. Trading Post has no UI.
- **What's needed:**
  - Service buildings have actual NPC interactions (vendor serves customer, teacher teaches class, priest performs ceremony)
  - Citizens visit service buildings as part of their daily routine (morning water at well, afternoon market, evening tavern)
  - Service quality depends on workers, supplies, and building condition
  - Visible NPC activity at service buildings (not just standing idle)
- **Why it matters:** Service buildings should feel alive and purposeful, not like passive modifiers.

---

## Implementation Priority Suggestion

These are ordered by impact-to-effort ratio. Completed items marked with checkmarks:

1. ~**Per-Building Seasonal Curves** (#3)~ — Done
2. ~**Storage Capacity Enforcement** (#4)~ — Done
3. ~**Real Map Resources** (#2)~ — Done
4. **Building Repair & Maintenance** (#8) — Prevents frustrating silent collapse
5. **Hauling & Delivery System** (#1) — Makes production physical and visible
6. **Worker Pathfinding to Resources** (#6) — Dependency #2 now met; improves visual clarity
7. **Per-Citizen Equipment** (#5) — Deepens blacksmith/tailor loop
8. **NPC Activity & Service System** (#10) — Polish for service buildings
9. **Flammability & Fire** (#9) — Risk mechanic, requires most new code
10. ~**Overlapping Radius Competition** (#7)~ — Partially done (natural outcome of #2)
