# Per-Building Contents Plan

## Problem
- Many buildings currently interact with a global resource pool.
- Storage buildings can only show estimated contents, not exact per-building inventory.
- Production/consumer buildings (for example `market`, `trading_post`, and crafting buildings) do not hold explicit local stock.

## Goal
- Move from global-only resources to explicit, per-building inventories while preserving current gameplay pacing.

## Phase 1: Introduce authoritative local inventories
- Add real inventory maps to storage buildings (`stockpile`, `storage_barn`) and treat them as the source of truth.
- Keep a derived global summary for HUD/resource limits so existing systems still work during migration.
- Add save migration: old saves load global resources into available storage buildings by capacity share.

## Phase 2: Add local buffers to production/service buildings
- Add small input/output buffers to buildings that process resources (`wood_cutter`, `blacksmith`, `tailor`, `bakery`, `dairy`, etc.).
- `market` and `trading_post` gain explicit stock lists instead of reading directly from global totals.
- Production consumes from local input buffer and writes to local output buffer.

## Phase 3: Add hauling between buildings
- Implement pickup/dropoff jobs that move resources between building inventories.
- Preferred flow: producer output buffer -> storage/market/trading_post -> consumer input buffer.
- Add simple hauling priorities so starvation/firewood jobs beat low-priority goods.

## Phase 4: UI + balancing
- Info panel shows exact inventory for selected building (no estimate label).
- Storage visuals use exact local contents.
- Rebalance capacities and spoilage once inventories are physically distributed.
