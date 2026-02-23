# Codebase Review Findings (2026-02-22)

## Scope
- Reviewed core runtime loop, app lifecycle, input handling, placement/building flow, AI helper logic, save/load paths, and representative simulation systems.
- Built project with `npm run build` to confirm current compile health.

## Priority Findings

### Critical
1. **Pause menu does not pause simulation**
   - `src/AppController.ts` toggles `state.paused` but does not stop the game loop speed.
   - Impact: needs/resources/time continue changing while pause menu is open.
   - **Status:** Resolved in current branch (`src/AppController.ts` now sets loop speed to `0` on pause and restores speed on resume).

2. **Input listeners leak across game instances**
   - `src/input/InputManager.ts` adds `window` and `canvas` listeners but has no teardown API.
   - `src/Game.ts` destroy path does not remove input listeners.
   - Impact: duplicate controls/events after load/restart flows.
   - **Status:** Resolved in current branch (`InputManager.destroy()` added and invoked from `Game.destroy()`).

### High
3. **Road placement can overcharge**
   - Existing roads can be counted as successful placements and consume resources again.
   - Paths containing already-road tiles can be rejected due to inflated affordability checks.
   - Affected files: `src/input/PlacementController.ts`, `src/map/TileMap.ts`.
   - **Status:** Resolved in current branch (costing now excludes existing roads; `TileMap.placeRoad()` returns false for already-road tiles).

4. **Gather helper target distance uses wrong position fields**
   - `src/systems/citizen-ai/CitizenAISystem.ts` uses `position.x/y` (non-existent) instead of `tileX/tileY`.
   - Impact: understaffed-building helper assignment degrades to unreliable behavior.
   - **Status:** Resolved in current branch (distance now uses `tileX/tileY`).

### Medium
5. **Determinism gaps from direct `Math.random` usage**
   - Multiple systems bypass `game.rng`, reducing seeded reproducibility after save/load.

6. **Population scalability risk from repeated full-entity scans**
   - Some systems do O(n²)-like neighbor checks and broad world queries per tick window.

## Current Open Items
1. Determinism gaps from direct `Math.random` usage in simulation systems.
2. Population scalability risk from repeated broad scans/proximity checks.

## Recommended Follow-up (after priority fixes)
1. Replace `Math.random` with `game.rng` in simulation-critical systems.
2. Introduce focused regression tests for pause behavior, listener cleanup, and road placement charging.
3. Use spatial partitioning (`SpatialHash`) for disease/social/market proximity checks.
4. Prioritize gameplay roadmap items: hauling/inventories, repair/maintenance, trading UI/contracts.
