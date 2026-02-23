import { World } from './ecs/World';
import { TileMap } from './map/TileMap';
import { Random } from './core/Random';
import { EventBus } from './core/EventBus';
import { BUILDING_DEFS } from './data/BuildingDefs';
import {
  TILE_SIZE, STARTING_ADULTS, STARTING_CHILDREN, CITIZEN_SPEED,
  Profession, ALL_TRAITS, MAX_TRAITS_PER_CITIZEN, PersonalityTrait,
  BuildingType, CITIZEN_SPAWN_OFFSET, INITIAL_HOUSE_WARMTH,
  PARTNER_PREFERENCE_OPPOSITE_SHARE, PARTNER_PREFERENCE_BOTH_SHARE,
  PARTNER_PREFERENCE_SAME_SHARE,
} from './constants';
import type { PartnerPreference } from './components/Citizen';
import { generateCitizenName, type GeneratedCitizenName } from './utils/NameGenerator';

export class EntityFactory {
  constructor(
    private world: World,
    private tileMap: TileMap,
    private rng: Random,
    private eventBus: EventBus,
  ) {}

  spawnStartingCitizens(cx: number, cy: number): void {
    for (let i = 0; i < STARTING_ADULTS + STARTING_CHILDREN; i++) {
      const isChild = i >= STARTING_ADULTS;
      const isMale = i % 2 === 0;
      const age = isChild ? this.rng.int(1, 8) : this.rng.int(18, 35);

      const ox = this.rng.int(-CITIZEN_SPAWN_OFFSET, CITIZEN_SPAWN_OFFSET);
      const oy = this.rng.int(-CITIZEN_SPAWN_OFFSET, CITIZEN_SPAWN_OFFSET);
      const tx = cx + ox;
      const ty = cy + oy;

      const id = this.world.createEntity();
      const generatedName = this.generateCitizenName(isMale);

      this.world.addComponent(id, 'position', {
        tileX: tx, tileY: ty,
        pixelX: tx * TILE_SIZE + TILE_SIZE / 2,
        pixelY: ty * TILE_SIZE + TILE_SIZE / 2,
      });

      this.world.addComponent(id, 'citizen', {
        firstName: generatedName.firstName,
        lastName: generatedName.lastName,
        name: generatedName.name,
        age,
        isMale,
        isChild,
        isEducated: false,
        isSleeping: false,
        traits: this.generateTraits(),
        partnerPreference: this.generatePartnerPreference(),
      });

      this.world.addComponent(id, 'movement', {
        path: [],
        speed: CITIZEN_SPEED,
        targetEntity: null,
        moving: false,
      });

      this.world.addComponent(id, 'worker', {
        profession: Profession.LABORER,
        workplaceId: null,
        carrying: null,
        carryAmount: 0,
        task: null,
        manuallyAssigned: false,
      });

      this.world.addComponent(id, 'needs', {
        food: 80 + this.rng.int(0, 20),
        warmth: 100,
        health: 100,
        happiness: 80 + this.rng.int(0, 20),
        energy: 80 + this.rng.int(0, 20),
      });

      this.world.addComponent(id, 'family', {
        relationshipStatus: 'single',
        partnerId: null,
        childrenIds: [],
        homeId: null,
        isPregnant: false,
        pregnancyTicks: 0,
        pregnancyPartnerId: null,
      });

      this.world.addComponent(id, 'renderable', {
        sprite: null,
        layer: 10,
        animFrame: 0,
        visible: true,
      });
    }
  }

  createStartingStockpile(cx: number, cy: number): void {
    // Place a stockpile near the center
    const sx = cx + 3;
    const sy = cy + 3;

    if (this.tileMap.isAreaBuildable(sx, sy, 4, 4)) {
      const id = this.world.createEntity();
      this.world.addComponent(id, 'position', {
        tileX: sx, tileY: sy,
        pixelX: sx * TILE_SIZE, pixelY: sy * TILE_SIZE,
      });
      this.world.addComponent(id, 'building', {
        type: BuildingType.STOCKPILE,
        completed: true,
        constructionProgress: 1,
        width: 4,
        height: 4,
        category: 'Storage',
        name: 'Stockpile',
        maxWorkers: 0,
        workRadius: 0,
        assignedWorkers: [],
        rotation: 0,
        isStorage: true,
        storageCapacity: 5000,
      });
      this.world.addComponent(id, 'storage', {
        inventory: {} as Record<string, number>,
        capacity: 5000,
      });
      this.world.addComponent(id, 'renderable', {
        sprite: null,
        layer: 5,
        animFrame: 0,
        visible: true,
      });
      this.tileMap.markOccupied(sx, sy, 4, 4, id, false); // stockpile doesn't block movement
    }
  }

  /** Spawn pre-built buildings so early game is survivable */
  createStartingBuildings(cx: number, cy: number): void {
    // House — citizens need shelter to sleep and stay warm
    this.placeStartingBuilding(BuildingType.WOODEN_HOUSE, cx - 4, cy - 1);

    // Gathering hut — immediate food source while crops grow
    this.placeStartingBuilding(BuildingType.GATHERING_HUT, cx - 4, cy + 3);
  }

  /** Place a pre-built building at the given tile, searching nearby if blocked */
  private placeStartingBuilding(type: string, tx: number, ty: number): void {
    const def = BUILDING_DEFS[type];
    if (!def) return;

    // Search in a spiral for a valid placement spot
    let px = tx;
    let py = ty;
    let placed = false;
    for (let r = 0; r < 8 && !placed; r++) {
      for (let dx = -r; dx <= r && !placed; dx++) {
        for (let dy = -r; dy <= r && !placed; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // only check perimeter
          const cx = tx + dx;
          const cy = ty + dy;
          if (this.tileMap.isAreaBuildable(cx, cy, def.width, def.height)) {
            px = cx;
            py = cy;
            placed = true;
          }
        }
      }
    }
    if (!placed) return;

    const id = this.world.createEntity();

    this.world.addComponent(id, 'position', {
      tileX: px, tileY: py,
      pixelX: px * TILE_SIZE, pixelY: py * TILE_SIZE,
    });

    this.world.addComponent(id, 'building', {
      type: def.type,
      name: def.name,
      category: def.category,
      completed: true,
      constructionProgress: 1,
      constructionWork: def.constructionWork,
      width: def.width,
      height: def.height,
      maxWorkers: def.maxWorkers,
      workRadius: def.workRadius,
      assignedWorkers: [],
      costLog: 0,
      costStone: 0,
      costIron: 0,
      materialsDelivered: true,
      isStorage: def.isStorage,
      storageCapacity: def.storageCapacity,
      residents: def.residents,
      durability: 100,
      rotation: 0,
      doorDef: def.doorDef,
    });

    this.world.addComponent(id, 'renderable', {
      sprite: null, layer: 5, animFrame: 0, visible: true,
    });

    // Producer component (all completed buildings get this)
    this.world.addComponent(id, 'producer', {
      timer: 0, active: false, workerCount: 0,
    });

    // House component
    if (type === BuildingType.WOODEN_HOUSE) {
      this.world.addComponent(id, 'house', {
        residents: [],
        firewood: 20,
        warmthLevel: INITIAL_HOUSE_WARMTH,
        maxResidents: def.residents || 5,
      });
    }

    this.tileMap.markOccupied(px, py, def.width, def.height, id, def.blocksMovement !== false);

    this.eventBus.emit('building_completed', {
      id, name: def.name, tileX: px, tileY: py,
    });
  }

  /** Generate 1-2 random personality traits (no conflicting pairs) */
  generateTraits(): string[] {
    const count = this.rng.int(1, MAX_TRAITS_PER_CITIZEN);
    const available = [...ALL_TRAITS];
    const traits: string[] = [];

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = this.rng.int(0, available.length - 1);
      const trait = available[idx];

      // Remove conflicting pairs
      traits.push(trait);
      available.splice(idx, 1);

      // Remove opposites
      if (trait === PersonalityTrait.HARDWORKING) {
        const lazyIdx = available.indexOf(PersonalityTrait.LAZY);
        if (lazyIdx >= 0) available.splice(lazyIdx, 1);
      } else if (trait === PersonalityTrait.LAZY) {
        const hwIdx = available.indexOf(PersonalityTrait.HARDWORKING);
        if (hwIdx >= 0) available.splice(hwIdx, 1);
      } else if (trait === PersonalityTrait.CHEERFUL) {
        const shyIdx = available.indexOf(PersonalityTrait.SHY);
        if (shyIdx >= 0) available.splice(shyIdx, 1);
      } else if (trait === PersonalityTrait.SHY) {
        const cheerIdx = available.indexOf(PersonalityTrait.CHEERFUL);
        if (cheerIdx >= 0) available.splice(cheerIdx, 1);
      }
    }

    return traits;
  }

  generateCitizenName(isMale: boolean): GeneratedCitizenName {
    return generateCitizenName(this.rng, isMale);
  }

  generateName(isMale: boolean): string {
    return this.generateCitizenName(isMale).name;
  }

  generatePartnerPreference(): PartnerPreference {
    const roll = this.rng.next();
    if (roll < PARTNER_PREFERENCE_OPPOSITE_SHARE) return 'opposite';
    if (roll < PARTNER_PREFERENCE_OPPOSITE_SHARE + PARTNER_PREFERENCE_BOTH_SHARE) return 'both';
    if (roll < PARTNER_PREFERENCE_OPPOSITE_SHARE + PARTNER_PREFERENCE_BOTH_SHARE + PARTNER_PREFERENCE_SAME_SHARE) return 'same';
    return 'same';
  }
}
