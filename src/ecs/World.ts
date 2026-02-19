import { EntityId } from '../types';

export class World {
  private nextId: EntityId = 1;
  private entities = new Set<EntityId>();
  private components = new Map<string, Map<EntityId, any>>();

  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    for (const store of this.components.values()) {
      store.delete(id);
    }
  }

  entityExists(id: EntityId): boolean {
    return this.entities.has(id);
  }

  addComponent<T>(entityId: EntityId, componentType: string, data: T): void {
    if (!this.components.has(componentType)) {
      this.components.set(componentType, new Map());
    }
    this.components.get(componentType)!.set(entityId, data);
  }

  removeComponent(entityId: EntityId, componentType: string): void {
    this.components.get(componentType)?.delete(entityId);
  }

  getComponent<T>(entityId: EntityId, componentType: string): T | undefined {
    return this.components.get(componentType)?.get(entityId) as T | undefined;
  }

  hasComponent(entityId: EntityId, componentType: string): boolean {
    return this.components.get(componentType)?.has(entityId) ?? false;
  }

  getComponentStore<T>(componentType: string): Map<EntityId, T> | undefined {
    return this.components.get(componentType) as Map<EntityId, T> | undefined;
  }

  /** Get all entities that have ALL specified component types */
  query(...componentTypes: string[]): EntityId[] {
    if (componentTypes.length === 0) return [...this.entities];

    const stores = componentTypes.map(t => this.components.get(t));
    if (stores.some(s => !s)) return [];

    // Start with smallest store for efficiency
    const sorted = stores
      .map((s, i) => ({ store: s!, type: componentTypes[i] }))
      .sort((a, b) => a.store.size - b.store.size);

    const result: EntityId[] = [];
    for (const [id] of sorted[0].store) {
      if (sorted.every(({ store }) => store.has(id))) {
        result.push(id);
      }
    }
    return result;
  }

  /** Get all entity IDs */
  getAllEntities(): EntityId[] {
    return [...this.entities];
  }

  getEntityCount(): number {
    return this.entities.size;
  }
}
