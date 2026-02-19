import type { Game } from '../Game';
import { TICKS_PER_YEAR, CHILD_AGE, OLD_AGE, TILE_SIZE, Profession, CITIZEN_SPEED, BuildingType, MAP_WIDTH, MAP_HEIGHT } from '../constants';

// Nomad arrival interval: roughly every 2-4 game years
const NOMAD_CHECK_INTERVAL = 500; // ticks between checks
const NOMAD_BASE_CHANCE = 0.01;   // chance per check (~once every ~1-2 years)
const NOMAD_DISEASE_CHANCE = 0.15; // 15% chance nomads bring disease

export class PopulationSystem {
  private game: Game;
  private tickCounter = 0;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    this.tickCounter++;

    // Aging: every TICKS_PER_YEAR ticks, age everyone
    if (this.tickCounter % TICKS_PER_YEAR === 0) {
      this.ageCitizens();
    }

    // Family formation + births: check every 100 ticks
    if (this.tickCounter % 100 === 0) {
      this.formFamilies();
      this.checkBirths();
      this.assignHomes();
      this.autoAssignWorkers();
      this.educateChildren();
    }

    // Nomad arrivals
    if (this.tickCounter % NOMAD_CHECK_INTERVAL === 0 && this.tickCounter > TICKS_PER_YEAR) {
      this.checkNomadArrival();
    }
  }

  private ageCitizens(): void {
    const world = this.game.world;
    const citizens = world.getComponentStore<any>('citizen');
    if (!citizens) return;

    for (const [id, cit] of citizens) {
      cit.age++;

      // Child → adult
      if (cit.age >= CHILD_AGE && cit.isChild) {
        cit.isChild = false;
        // Give them a worker component if they don't have one
        if (!world.hasComponent(id, 'worker')) {
          world.addComponent(id, 'worker', {
            profession: Profession.LABORER,
            workplaceId: null,
            carrying: null,
            carryAmount: 0,
            task: null,
          });
        }
      }

      // Old age death chance
      if (cit.age > OLD_AGE) {
        const deathChance = (cit.age - OLD_AGE) * 0.02;
        if (this.game.rng.chance(deathChance)) {
          const needs = world.getComponent<any>(id, 'needs');
          if (needs) needs.health = 0; // Will be cleaned up by NeedsSystem
        }
      }
    }
  }

  private formFamilies(): void {
    const world = this.game.world;
    const citizens = world.query('citizen', 'family');

    const singles: { id: number; isMale: boolean }[] = [];

    for (const id of citizens) {
      const cit = world.getComponent<any>(id, 'citizen')!;
      const fam = world.getComponent<any>(id, 'family')!;

      if (!cit.isChild && cit.age >= 16 && fam.partnerId === null) {
        singles.push({ id, isMale: cit.isMale });
      }
    }

    const males = singles.filter(s => s.isMale);
    const females = singles.filter(s => !s.isMale);

    const pairs = Math.min(males.length, females.length);
    for (let i = 0; i < pairs; i++) {
      const maleId = males[i].id;
      const femaleId = females[i].id;

      const maleFam = world.getComponent<any>(maleId, 'family')!;
      const femaleFam = world.getComponent<any>(femaleId, 'family')!;

      maleFam.partnerId = femaleId;
      femaleFam.partnerId = maleId;
    }
  }

  private checkBirths(): void {
    const world = this.game.world;
    const citizens = world.query('citizen', 'family', 'position');

    for (const id of citizens) {
      const cit = world.getComponent<any>(id, 'citizen')!;
      const fam = world.getComponent<any>(id, 'family')!;

      // Only females can give birth
      if (cit.isMale || cit.isChild) continue;
      if (fam.partnerId === null) continue;
      if (fam.childrenIds.length >= 3) continue; // Max 3 children per couple

      // Birth chance per check
      if (this.game.rng.chance(0.03)) {
        // Check if family has a home
        if (fam.homeId === null) continue;

        const house = world.getComponent<any>(fam.homeId, 'house');
        if (!house) continue;
        if (house.residents.length >= house.maxResidents) continue;

        // Create baby
        const pos = world.getComponent<any>(id, 'position')!;
        const baby = this.spawnCitizen(pos.tileX, pos.tileY, true);

        fam.childrenIds.push(baby);
        house.residents.push(baby);

        // Set baby's home
        const babyFam = world.getComponent<any>(baby, 'family');
        if (babyFam) babyFam.homeId = fam.homeId;

        this.game.state.totalBirths++;
        this.game.eventBus.emit('citizen_born', { id: baby });
      }
    }
  }

  private spawnCitizen(tileX: number, tileY: number, isChild: boolean): number {
    const world = this.game.world;
    const id = world.createEntity();
    const isMale = this.game.rng.chance(0.5);

    world.addComponent(id, 'position', {
      tileX, tileY,
      pixelX: tileX * TILE_SIZE + TILE_SIZE / 2,
      pixelY: tileY * TILE_SIZE + TILE_SIZE / 2,
    });

    const maleNames = ['John', 'William', 'Thomas', 'Richard', 'Henry', 'Robert', 'Edward', 'George', 'James', 'Arthur'];
    const femaleNames = ['Mary', 'Elizabeth', 'Anne', 'Margaret', 'Catherine', 'Jane', 'Alice', 'Eleanor', 'Rose', 'Sarah'];

    world.addComponent(id, 'citizen', {
      name: isMale ? this.game.rng.pick(maleNames) : this.game.rng.pick(femaleNames),
      age: isChild ? 1 : this.game.rng.int(18, 30),
      isMale,
      isChild,
      isEducated: false,
      isSleeping: false,
    });

    world.addComponent(id, 'movement', {
      path: [],
      speed: CITIZEN_SPEED,
      targetEntity: null,
      moving: false,
    });

    world.addComponent(id, 'needs', {
      food: 80,
      warmth: 100,
      health: 100,
      happiness: 80,
      energy: 80,
      recentDiet: [],
    });

    world.addComponent(id, 'family', {
      partnerId: null,
      childrenIds: [],
      homeId: null,
    });

    world.addComponent(id, 'renderable', {
      sprite: null,
      layer: 10,
      animFrame: 0,
      visible: true,
    });

    if (!isChild) {
      world.addComponent(id, 'worker', {
        profession: Profession.LABORER,
        workplaceId: null,
        carrying: null,
        carryAmount: 0,
        task: null,
      });
    }

    return id;
  }

  private assignHomes(): void {
    const world = this.game.world;
    const houses = world.getComponentStore<any>('house');
    const families = world.getComponentStore<any>('family');
    if (!houses || !families) return;

    // Find homeless citizens with partners
    for (const [id, fam] of families) {
      if (fam.homeId !== null) continue;
      const cit = world.getComponent<any>(id, 'citizen');
      if (!cit || cit.isChild) continue;

      // Find house with space
      for (const [houseId, house] of houses) {
        const bld = world.getComponent<any>(houseId, 'building');
        if (!bld?.completed) continue;
        if (house.residents.length >= house.maxResidents) continue;

        // Assign to this house
        fam.homeId = houseId;
        house.residents.push(id);

        // Also assign partner
        if (fam.partnerId !== null) {
          const partnerFam = world.getComponent<any>(fam.partnerId, 'family');
          if (partnerFam && partnerFam.homeId === null) {
            partnerFam.homeId = houseId;
            house.residents.push(fam.partnerId);
          }
        }
        break;
      }
    }
  }

  /** Auto-assign idle laborers to buildings that need workers */
  private autoAssignWorkers(): void {
    const world = this.game.world;
    const buildings = world.getComponentStore<any>('building');
    const workers = world.getComponentStore<any>('worker');
    if (!buildings || !workers) return;

    // Find buildings needing workers
    for (const [bldId, bld] of buildings) {
      if (!bld.completed || bld.maxWorkers === 0) continue;

      const currentWorkers = bld.assignedWorkers?.length || 0;
      if (currentWorkers >= bld.maxWorkers) continue;

      const bPos = world.getComponent<any>(bldId, 'position');
      if (!bPos) continue;

      // Find idle laborers, prefer nearest
      const candidates: Array<{ id: number; dist: number }> = [];
      for (const [wId, worker] of workers) {
        if (worker.workplaceId !== null) continue;
        if (worker.profession !== Profession.LABORER) continue;

        const cit = world.getComponent<any>(wId, 'citizen');
        if (!cit || cit.isChild) continue;

        const wPos = world.getComponent<any>(wId, 'position');
        if (!wPos) continue;

        const d = Math.abs(wPos.tileX - bPos.tileX) + Math.abs(wPos.tileY - bPos.tileY);
        candidates.push({ id: wId, dist: d });
      }

      // Sort by distance, assign nearest first
      candidates.sort((a, b) => a.dist - b.dist);

      for (const candidate of candidates) {
        if ((bld.assignedWorkers?.length || 0) >= bld.maxWorkers) break;

        // Quick reachability check: verify pathfinding can find a route
        const wPos = world.getComponent<any>(candidate.id, 'position');
        const targetX = bPos.tileX + Math.floor((bld.width || 1) / 2);
        const targetY = bPos.tileY + (bld.height || 1);
        const pathResult = this.game.pathfinder.findPath(wPos.tileX, wPos.tileY, targetX, targetY);
        if (!pathResult.found) continue; // Skip unreachable buildings

        const worker = workers.get(candidate.id)!;
        worker.workplaceId = bldId;
        worker.profession = this.getProfessionForBuilding(bld.type);
        if (!bld.assignedWorkers) bld.assignedWorkers = [];
        bld.assignedWorkers.push(candidate.id);
      }
    }
  }

  private educateChildren(): void {
    const world = this.game.world;
    const buildings = world.getComponentStore<any>('building');
    if (!buildings) return;

    // Check if school exists and has a teacher
    let hasSchool = false;
    for (const [, bld] of buildings) {
      if (bld.type === BuildingType.SCHOOL && bld.completed) {
        const workerCount = bld.assignedWorkers?.length || 0;
        if (workerCount > 0) {
          hasSchool = true;
          break;
        }
      }
    }

    if (!hasSchool) return;

    // Educate children who are old enough
    const citizens = world.getComponentStore<any>('citizen');
    if (!citizens) return;

    for (const [, cit] of citizens) {
      if (cit.isChild && cit.age >= CHILD_AGE - 1 && !cit.isEducated) {
        cit.isEducated = true;
      }
    }
  }

  private checkNomadArrival(): void {
    // Only arrive if there's a trading post
    const hasPost = this.hasBuildingType(BuildingType.TRADING_POST);
    const chance = hasPost ? NOMAD_BASE_CHANCE * 2 : NOMAD_BASE_CHANCE;

    if (!this.game.rng.chance(chance)) return;

    // Spawn 2-5 nomads near map edge
    const count = this.game.rng.int(2, 5);
    const edge = this.game.rng.int(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    let sx: number, sy: number;

    switch (edge) {
      case 0: sx = this.game.rng.int(20, MAP_WIDTH - 20); sy = 5; break;
      case 1: sx = MAP_WIDTH - 5; sy = this.game.rng.int(20, MAP_HEIGHT - 20); break;
      case 2: sx = this.game.rng.int(20, MAP_WIDTH - 20); sy = MAP_HEIGHT - 5; break;
      default: sx = 5; sy = this.game.rng.int(20, MAP_HEIGHT - 20); break;
    }

    // Find walkable tile near the edge point
    for (let r = 0; r < 10; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (this.game.tileMap.isWalkable(sx + dx, sy + dy)) {
            sx = sx + dx;
            sy = sy + dy;
            r = 10; dy = r; dx = r; // break all loops
          }
        }
      }
    }

    const nomadIds: number[] = [];
    for (let i = 0; i < count; i++) {
      const ox = this.game.rng.int(-2, 2);
      const oy = this.game.rng.int(-2, 2);
      const nx = Math.max(1, Math.min(MAP_WIDTH - 2, sx + ox));
      const ny = Math.max(1, Math.min(MAP_HEIGHT - 2, sy + oy));
      const nomadId = this.spawnCitizen(nx, ny, false);
      nomadIds.push(nomadId);
    }

    // Small chance nomads bring disease
    if (this.game.rng.chance(NOMAD_DISEASE_CHANCE)) {
      const sickId = this.game.rng.pick(nomadIds);
      const needs = this.game.world.getComponent<any>(sickId, 'needs');
      if (needs) {
        needs.isSick = true;
        needs.diseaseTicks = 0;
      }
    }

    this.game.eventBus.emit('nomads_arrived', { count });
  }

  private hasBuildingType(type: string): boolean {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return false;
    for (const [, bld] of buildings) {
      if (bld.type === type && bld.completed) return true;
    }
    return false;
  }

  private getProfessionForBuilding(type: string): string {
    const map: Record<string, string> = {
      [BuildingType.CROP_FIELD]: Profession.FARMER,
      [BuildingType.GATHERING_HUT]: Profession.GATHERER,
      [BuildingType.HUNTING_CABIN]: Profession.HUNTER,
      [BuildingType.FISHING_DOCK]: Profession.FISHERMAN,
      [BuildingType.FORESTER_LODGE]: Profession.FORESTER,
      [BuildingType.WOOD_CUTTER]: Profession.WOOD_CUTTER,
      [BuildingType.BLACKSMITH]: Profession.BLACKSMITH,
      [BuildingType.TAILOR]: Profession.TAILOR,
      [BuildingType.HERBALIST]: Profession.HERBALIST,
      [BuildingType.MARKET]: Profession.VENDOR,
      [BuildingType.SCHOOL]: Profession.TEACHER,
      [BuildingType.TRADING_POST]: Profession.TRADER,
    };
    return map[type] || Profession.LABORER;
  }
}
