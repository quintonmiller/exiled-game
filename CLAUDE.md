# Banished Clone - Claude Code Project Guide

## Project Overview
A 2D browser-playable clone of the PC game "Banished" — a city-building survival sandbox where exiled travelers must build a settlement and survive through resource management, citizen AI, and seasonal challenges. No win state; the central challenge is avoiding the **death spiral** (resource shortage -> deaths -> fewer workers -> more shortage).

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Build:** Vite 5, no framework
- **Rendering:** HTML5 Canvas 2D (single canvas, no DOM UI)
- **Architecture:** Lightweight ECS (entities = numeric IDs, components in `Map<EntityId, T>`)

## Commands
- `npm run dev` — Start Vite dev server (hot reload)
- `npm run build` — TypeScript check + Vite production build
- `npx tsc --noEmit` — Type check only (no output)
- `npx vite build` — Build only (skip type check)

## Project Structure
```
src/
  main.ts              # Entry point
  Game.ts              # Master class: owns ECS world, all systems, game loop, state
  constants.ts         # ALL tuning values, enums, magic numbers (single source of truth)
  types.ts             # Shared interfaces (TileData, GameState, BuildingDef, etc.)
  core/                # GameLoop (fixed-timestep), EventBus (pub/sub), Random (seeded xorshift)
  ecs/                 # World (entity/component store), System (base class)
  components/          # Component type definitions (Position, Citizen, Needs, etc.)
  systems/             # All game systems (14 total — see below)
  map/                 # TileMap, MapGenerator, Pathfinder (A* + LRU cache), Camera
  data/                # Data-driven definitions (BuildingDefs, RecipeDefs, SeasonDefs, etc.)
  ui/                  # UIManager, BuildMenu, HUD, InfoPanel, Minimap, Tooltip
  input/               # InputManager, CameraController, PlacementController
  utils/               # MathUtils, SpatialHash, SpriteLoader
```

## Key Architecture Patterns

### ECS
- Components are plain objects stored in `Map<EntityId, T>` per component type
- Use `world.getComponent<any>(id, 'componentName')` — always pass `<any>` to avoid TS errors
- Use `world.getComponentStore<any>('componentName')` to iterate all components of a type
- Use `world.query('comp1', 'comp2', ...)` to find entities with all listed components

### Systems (update order in Game.ts)
1. SeasonSystem — calendar + day/night cycle
2. CitizenAISystem — priority-based decision tree
3. MovementSystem — A* path following
4. ConstructionSystem — builder material delivery
5. ProductionSystem — building recipes + resource output
6. NeedsSystem — food/warmth/health/energy decay
7. StorageSystem — house restocking, food spoilage, market
8. PopulationSystem — aging, births, families, nomads, worker assignment
9. TradeSystem — merchant visits
10. EnvironmentSystem — natural tree regrowth, building decay
11. DiseaseSystem — sickness spread and herbalist cures
12. ParticleSystem — smoke, snow, leaves
13. WeatherSystem — storms, droughts, cold snaps

### Data-driven design
- All building stats in `data/BuildingDefs.ts`
- All recipes in `data/RecipeDefs.ts`
- All season parameters in `data/SeasonDefs.ts`
- All tuning constants in `constants.ts` — change numbers there, not in system code

### Citizen AI Priority Order
1. Already sleeping -> stay asleep (wake if energy full + daytime, or if starving)
2. Starving (food < 15) -> urgent food
3. Freezing (warmth < 25) -> go home
4. Exhausted (energy < 20) -> go home and sleep
5. Night time -> go home and sleep
6. Hungry (food < 65) -> eat a meal
7. Assigned to workplace -> go work
8. Laborer -> find construction site
9. Social interaction -> chat with nearby citizen
10. Wander randomly

### Day/Night Timing
- `TICKS_PER_DAY = 1800` (3 minutes real time at 1x)
- Day/night cycle uses `state.tick % TICKS_PER_DAY` (decoupled from season progression)
- Season length: `TICKS_PER_SUB_SEASON = 600` (60 seconds), 12 sub-seasons per year

## Common Pitfalls
- `getComponentStore` returns `Map<EntityId, {}>` by default — always use `<any>` type parameter
- `movement.stuckTicks` must be checked with `=== undefined`, not `!movement.stuckTicks` (0 is falsy)
- `goToBuilding` tries 6 entry points around buildings — if all fail, returns false
- New citizens spawned by PopulationSystem must include `energy`, `isSleeping`, `recentDiet` fields
- Food is stored as multiple types (berries, venison, etc.) — use `game.getTotalFood()` and `game.removeFood()` for aggregates

## Keyboard Shortcuts
- **Space** — Pause/unpause
- **1-5** — Speed (0x, 1x, 2x, 5x, 10x)
- **B** — Toggle build menu
- **Escape** — Cancel placement / deselect
- **F3** — Debug overlay
- **R** — Restart (game over screen only)
