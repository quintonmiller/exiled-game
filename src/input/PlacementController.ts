import type { Game } from '../Game';
import { BUILDING_DEFS } from '../data/BuildingDefs';
import { BuildingType, TILE_SIZE } from '../constants';

export class PlacementController {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  tryPlace(screenX: number, screenY: number): void {
    const placingType = this.game.state.placingBuilding;
    if (!placingType) return;

    const def = BUILDING_DEFS[placingType];
    if (!def) return;

    const tile = this.game.camera.screenToTile(screenX, screenY);
    const tx = tile.x - Math.floor(def.width / 2);
    const ty = tile.y - Math.floor(def.height / 2);

    // Check affordability
    if (this.game.getResource('log') < def.costLog) return;
    if (this.game.getResource('stone') < def.costStone) return;
    if (this.game.getResource('iron') < def.costIron) return;

    // Roads are special: just convert the tile type, no building entity
    if (placingType === BuildingType.ROAD) {
      this.placeRoad(tx, ty, def);
      return;
    }

    if (!this.canPlace(tx, ty, def)) return;

    // Create building entity
    const id = this.game.world.createEntity();

    this.game.world.addComponent(id, 'position', {
      tileX: tx, tileY: ty,
      pixelX: tx * TILE_SIZE, pixelY: ty * TILE_SIZE,
    });

    this.game.world.addComponent(id, 'building', {
      type: def.type,
      name: def.name,
      category: def.category,
      completed: def.constructionWork <= 10,
      constructionProgress: def.constructionWork <= 10 ? 1 : 0,
      constructionWork: def.constructionWork,
      width: def.width,
      height: def.height,
      maxWorkers: def.maxWorkers,
      workRadius: def.workRadius,
      assignedWorkers: [],
      costLog: def.costLog,
      costStone: def.costStone,
      costIron: def.costIron,
      materialsDelivered: false,
      isStorage: def.isStorage,
      storageCapacity: def.storageCapacity,
      residents: def.residents,
    });

    this.game.world.addComponent(id, 'renderable', {
      sprite: null,
      layer: 5,
      animFrame: 0,
      visible: true,
    });

    // Mark tiles as occupied
    this.game.tileMap.markOccupied(tx, ty, def.width, def.height, id);

    // If instant build (stockpile), initialize immediately
    if (def.constructionWork <= 10) {
      if (def.isStorage) {
        this.game.world.addComponent(id, 'storage', {
          inventory: new Map<string, number>(),
          capacity: def.storageCapacity || 5000,
        });
      }

      if (def.costLog > 0) this.game.removeResource('log', def.costLog);
      if (def.costStone > 0) this.game.removeResource('stone', def.costStone);
      if (def.costIron > 0) this.game.removeResource('iron', def.costIron);
    }
  }

  private placeRoad(x: number, y: number, def: typeof BUILDING_DEFS[string]): void {
    if (!this.game.tileMap.placeRoad(x, y)) return;

    // Deduct cost
    if (def.costLog > 0) this.game.removeResource('log', def.costLog);
    if (def.costStone > 0) this.game.removeResource('stone', def.costStone);

    // Clear pathfinding cache since road costs changed
    this.game.pathfinder.clearCache();
  }

  private canPlace(x: number, y: number, def: typeof BUILDING_DEFS[string]): boolean {
    if (!this.game.tileMap.isAreaBuildable(x, y, def.width, def.height)) return false;

    if (def.requiresWater) {
      if (!this.game.tileMap.hasAdjacentWater(x, y, def.width, def.height)) return false;
    }

    return true;
  }

  getGhostData(): Array<{ x: number; y: number; w: number; h: number; valid: boolean }> {
    const placingType = this.game.state.placingBuilding;
    if (!placingType) return [];

    const def = BUILDING_DEFS[placingType];
    if (!def) return [];

    const input = this.game.input;
    const tile = this.game.camera.screenToTile(input.mouseX, input.mouseY);
    const tx = tile.x - Math.floor(def.width / 2);
    const ty = tile.y - Math.floor(def.height / 2);

    let valid: boolean;
    if (placingType === BuildingType.ROAD) {
      // Roads can be placed on any walkable, non-water tile
      const t = this.game.tileMap.get(tx, ty);
      valid = !!t && this.game.tileMap.isWalkable(tx, ty) &&
        this.game.getResource('log') >= def.costLog;
    } else {
      valid = this.canPlace(tx, ty, def) &&
        this.game.getResource('log') >= def.costLog &&
        this.game.getResource('stone') >= def.costStone &&
        this.game.getResource('iron') >= def.costIron;
    }

    return [{ x: tx, y: ty, w: def.width, h: def.height, valid }];
  }
}
