import type { Game } from '../Game';
import { BuildingType, ResourceType, FOOD_TYPES, FOOD_SPOILAGE_RATE, BARN_SPOILAGE_MULT } from '../constants';

export class StorageSystem {
  private game: Game;
  private tickCounter = 0;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    this.tickCounter++;
    // Only run every 30 ticks (3 seconds)
    if (this.tickCounter % 30 !== 0) return;

    this.restockHouses();
    this.distributeFromMarket();
    this.spoilFood();
  }

  /** Restock houses with firewood from global supply */
  private restockHouses(): void {
    const world = this.game.world;
    const houses = world.getComponentStore<any>('house');
    if (!houses) return;

    for (const [id, house] of houses) {
      // Restock firewood
      if (house.firewood < 10) {
        const needed = 20 - house.firewood;
        const delivered = this.game.removeResource(ResourceType.FIREWOOD, needed);
        house.firewood += delivered;
      }

      // Update warmth level based on firewood
      if (house.firewood > 0) {
        house.warmthLevel = Math.min(100, house.warmthLevel + 2);
        house.firewood -= 0.05;
        if (house.firewood < 0) house.firewood = 0;
      } else {
        house.warmthLevel = Math.max(0, house.warmthLevel - 5);
      }
    }
  }

  /** Markets distribute goods to nearby citizens */
  private distributeFromMarket(): void {
    const world = this.game.world;
    const buildings = world.getComponentStore<any>('building');
    if (!buildings) return;

    for (const [id, bld] of buildings) {
      if (bld.type !== BuildingType.MARKET || !bld.completed) continue;

      const pos = world.getComponent<any>(id, 'position');
      if (!pos) continue;

      const citizens = world.query('citizen', 'position', 'needs');
      for (const cId of citizens) {
        const cPos = world.getComponent<any>(cId, 'position')!;
        const dx = cPos.tileX - pos.tileX;
        const dy = cPos.tileY - pos.tileY;
        if (Math.abs(dx) <= (bld.workRadius || 40) && Math.abs(dy) <= (bld.workRadius || 40)) {
          const needs = world.getComponent<any>(cId, 'needs')!;
          needs.happiness = Math.min(100, needs.happiness + 0.5);
        }
      }
    }
  }

  /** Food spoils over time — barns reduce spoilage, stockpiles don't */
  private spoilFood(): void {
    // Check if player has any storage barns (reduce spoilage)
    const hasBarn = this.hasBuildingType(BuildingType.STORAGE_BARN);
    const spoilageMult = hasBarn ? BARN_SPOILAGE_MULT : 1.0;

    // Spoil each food type
    const allFoodTypes = ['food', ...FOOD_TYPES];
    for (const type of allFoodTypes) {
      const current = this.game.getResource(type);
      if (current > 0) {
        const spoiled = Math.max(0.1, current * FOOD_SPOILAGE_RATE * spoilageMult);
        this.game.removeResource(type, spoiled);
      }
    }
  }

  private hasBuildingType(type: string): boolean {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return false;
    for (const [, bld] of buildings) {
      if (bld.type === type && bld.completed) return true;
    }
    return false;
  }
}
