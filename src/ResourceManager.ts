import { World } from './ecs/World';
import {
  BASE_STORAGE_CAPACITY, ALL_FOOD_TYPES, FOOD_TYPES, COOKED_FOOD_TYPES,
} from './constants';

export class ResourceManager {
  globalResources = new Map<string, number>();

  constructor(private world: World) {}

  /** Get amount of a resource across all storage buildings + global buffer */
  getResource(type: string): number {
    let total = this.globalResources.get(type) || 0;
    const storages = this.world.getComponentStore<any>('storage');
    if (storages) {
      for (const [, storage] of storages) {
        const inv = storage.inventory as Record<string, number>;
        total += inv[type] || 0;
      }
    }
    return total;
  }

  /** Get total storage capacity from all completed storage buildings + base */
  getStorageCapacity(): number {
    let cap = BASE_STORAGE_CAPACITY;
    const storages = this.world.getComponentStore<any>('storage');
    if (storages) {
      for (const [, storage] of storages) {
        cap += storage.capacity || 0;
      }
    }
    return cap;
  }

  /** Get total resources stored across all buildings + global buffer */
  getStorageUsed(): number {
    let total = 0;
    for (const [, val] of this.globalResources) {
      total += val;
    }
    const storages = this.world.getComponentStore<any>('storage');
    if (storages) {
      for (const [, storage] of storages) {
        const inv = storage.inventory as Record<string, number>;
        for (const v of Object.values(inv)) {
          total += v;
        }
      }
    }
    return total;
  }

  /** Check if all storage is at capacity */
  isStorageFull(): boolean {
    return this.getStorageUsed() >= this.getStorageCapacity();
  }

  /** Add resource — routes to storage building with most free space first, then global buffer.
   *  Returns amount actually added. */
  addResource(type: string, amount: number): number {
    const used = this.getStorageUsed();
    const cap = this.getStorageCapacity();
    const totalSpace = Math.max(0, cap - used);
    const actual = Math.min(amount, totalSpace);
    if (actual <= 0) return 0;

    let remaining = actual;

    // Try to fill the storage building with most free space
    const storages = this.world.getComponentStore<any>('storage');
    if (storages && storages.size > 0) {
      let bestId: number | null = null;
      let bestFreeSpace = 0;
      for (const [id, storage] of storages) {
        const inv = storage.inventory as Record<string, number>;
        const invUsed = Object.values(inv).reduce((a, b) => a + b, 0);
        const free = (storage.capacity || 0) - invUsed;
        if (free > bestFreeSpace) { bestFreeSpace = free; bestId = id; }
      }
      if (bestId !== null && bestFreeSpace > 0) {
        const storage = storages.get(bestId)!;
        const inv = storage.inventory as Record<string, number>;
        const toAdd = Math.min(remaining, bestFreeSpace);
        inv[type] = (inv[type] || 0) + toAdd;
        remaining -= toAdd;
      }
    }

    // Overflow into global buffer
    if (remaining > 0) {
      const bufferUsed = [...this.globalResources.values()].reduce((a, b) => a + b, 0);
      const bufferSpace = Math.max(0, BASE_STORAGE_CAPACITY - bufferUsed);
      const toBuffer = Math.min(remaining, bufferSpace);
      if (toBuffer > 0) {
        this.globalResources.set(type, (this.globalResources.get(type) || 0) + toBuffer);
      }
    }

    return actual;
  }

  /** Remove resource — drains storage buildings first, then global buffer.
   *  Returns actual amount removed. */
  removeResource(type: string, amount: number): number {
    let remaining = amount;

    // Drain from storage buildings
    const storages = this.world.getComponentStore<any>('storage');
    if (storages) {
      for (const [, storage] of storages) {
        if (remaining <= 0) break;
        const inv = storage.inventory as Record<string, number>;
        const current = inv[type] || 0;
        if (current <= 0) continue;
        const taken = Math.min(current, remaining);
        inv[type] = current - taken;
        remaining -= taken;
      }
    }

    // Drain from global buffer
    if (remaining > 0) {
      const current = this.globalResources.get(type) || 0;
      const taken = Math.min(current, remaining);
      this.globalResources.set(type, current - taken);
      remaining -= taken;
    }

    return amount - remaining;
  }

  /** Get total food across all food types (raw + cooked) */
  getTotalFood(): number {
    let total = 0;
    for (const ft of ALL_FOOD_TYPES) {
      total += this.getResource(ft);
    }
    total += this.getResource('food'); // generic starting food
    return total;
  }

  /** Remove food (picks from available types — prefers cooked food) */
  removeFood(amount: number): number {
    let remaining = amount;
    // Try cooked food first (higher value)
    for (const ft of COOKED_FOOD_TYPES) {
      if (remaining <= 0) break;
      remaining -= this.removeResource(ft, remaining);
    }
    // Try generic food
    remaining -= this.removeResource('food', remaining);
    // Then raw food types
    for (const ft of FOOD_TYPES) {
      if (remaining <= 0) break;
      remaining -= this.removeResource(ft, remaining);
    }
    return amount - remaining;
  }

  /** Remove food and return the type consumed (prefers types not in recentDiet) */
  removeFoodPreferVariety(amount: number, recentDiet: string[]): { eaten: number; type: string } {
    // Count how often each type appears in recent diet
    const dietCounts = new Map<string, number>();
    for (const t of recentDiet) {
      dietCounts.set(t, (dietCounts.get(t) || 0) + 1);
    }

    // Sort food types by: least-recently-eaten first
    const available: { type: string; count: number }[] = [];
    if (this.getResource('food') >= amount) {
      available.push({ type: 'food', count: dietCounts.get('food') || 0 });
    }
    for (const ft of ALL_FOOD_TYPES) {
      if (this.getResource(ft) >= amount) {
        available.push({ type: ft, count: dietCounts.get(ft) || 0 });
      }
    }

    if (available.length === 0) {
      // Fall back to partial removal
      const eaten = this.removeFood(amount);
      return { eaten, type: 'food' };
    }

    // Pick the least-recently-eaten type
    available.sort((a, b) => a.count - b.count);
    const chosen = available[0];
    const eaten = this.removeResource(chosen.type, amount);
    return { eaten, type: chosen.type };
  }

  /** Build an aggregated resource map for display purposes (HUD, debug overlay) */
  buildResourceMap(): Map<string, number> {
    const result = new Map<string, number>(this.globalResources);
    const storages = this.world.getComponentStore<any>('storage');
    if (storages) {
      for (const [, storage] of storages) {
        const inv = storage.inventory as Record<string, number>;
        for (const [k, v] of Object.entries(inv)) {
          result.set(k, (result.get(k) || 0) + v);
        }
      }
    }
    return result;
  }

  /** Serialize for save — global buffer only; building inventories are saved via ECS */
  serialize(): [string, number][] {
    return [...this.globalResources];
  }

  /** Restore from save data */
  deserialize(data: [string, number][]): void {
    this.globalResources.clear();
    for (const [key, val] of data) {
      this.globalResources.set(key, val);
    }
  }
}
