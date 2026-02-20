import type { Game } from '../Game';
import {
  EDUCATION_BONUS, CONSTRUCTION_WORK_RATE, EDUCATED_CONSTRUCTION_BONUS,
  INITIAL_HOUSE_WARMTH, TRAIT_WORK_SPEED_BONUS, PersonalityTrait,
  PROFESSION_SKILL_MAP, SKILL_EFFICIENCY_PER_LEVEL, SkillType,
} from '../constants';

export class ConstructionSystem {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    const world = this.game.world;
    const buildings = world.getComponentStore<any>('building');
    if (!buildings) return;

    for (const [id, bld] of buildings) {
      if (bld.completed) continue;

      // Check if any laborers are nearby
      const bPos = world.getComponent<any>(id, 'position')!;
      const workers = this.findNearbyWorkers(bPos.tileX, bPos.tileY, bld.width, bld.height);

      if (workers.length === 0) continue;

      // Check if construction materials are available
      if (bld.constructionProgress === 0 && !bld.materialsDelivered) {
        // Deduct materials on first work
        const def = bld;
        const hasLog = this.game.getResource('log') >= (def.costLog || 0);
        const hasStone = this.game.getResource('stone') >= (def.costStone || 0);
        const hasIron = this.game.getResource('iron') >= (def.costIron || 0);

        if (hasLog && hasStone && hasIron) {
          this.game.removeResource('log', def.costLog || 0);
          this.game.removeResource('stone', def.costStone || 0);
          this.game.removeResource('iron', def.costIron || 0);
          bld.materialsDelivered = true;
        } else {
          continue; // Can't build without materials
        }
      }

      if (!bld.materialsDelivered && bld.constructionProgress === 0) continue;

      // Advance construction
      let workRate = workers.length * CONSTRUCTION_WORK_RATE;

      // Educated workers build faster + personality trait bonus
      for (const wId of workers) {
        const cit = world.getComponent<any>(wId, 'citizen');
        if (cit?.isEducated) workRate += EDUCATED_CONSTRUCTION_BONUS;
        // Trait work speed bonus
        if (cit?.traits) {
          for (const trait of cit.traits) {
            const bonus = TRAIT_WORK_SPEED_BONUS[trait as PersonalityTrait];
            if (bonus) workRate += CONSTRUCTION_WORK_RATE * bonus;
          }
        }
        // Skill level bonus (building skill)
        const workerComp = world.getComponent<any>(wId, 'worker');
        if (workerComp?.skills) {
          const skillType = PROFESSION_SKILL_MAP[workerComp.profession] || SkillType.BUILDING;
          const buildSkill = workerComp.skills[SkillType.BUILDING];
          if (buildSkill) {
            workRate += CONSTRUCTION_WORK_RATE * buildSkill.level * SKILL_EFFICIENCY_PER_LEVEL;
          }
        }
      }

      bld.constructionProgress += workRate / (bld.constructionWork || 100);

      if (bld.constructionProgress >= 1) {
        bld.constructionProgress = 1;
        bld.completed = true;

        this.game.eventBus.emit('building_completed', {
          id, name: bld.name, tileX: bPos.tileX, tileY: bPos.tileY,
        });

        // Add producer component if this building produces resources
        this.initCompletedBuilding(id, bld);
      }
    }
  }

  private findNearbyWorkers(bx: number, by: number, bw: number, bh: number): number[] {
    const world = this.game.world;
    const result: number[] = [];
    const positions = world.getComponentStore<any>('position');
    const workers = world.getComponentStore<any>('worker');
    if (!positions || !workers) return result;

    for (const [id, worker] of workers) {
      const pos = positions.get(id);
      if (!pos) continue;

      // Check if within 2 tiles of building
      const dx = pos.tileX - bx;
      const dy = pos.tileY - by;
      if (dx >= -2 && dx <= bw + 1 && dy >= -2 && dy <= bh + 1) {
        result.push(id);
      }
    }
    return result;
  }

  private initCompletedBuilding(id: number, bld: any): void {
    const world = this.game.world;

    // Add storage component for storage buildings
    if (bld.isStorage || bld.storageCapacity) {
      if (!world.hasComponent(id, 'storage')) {
        world.addComponent(id, 'storage', {
          inventory: new Map<string, number>(),
          capacity: bld.storageCapacity || 5000,
        });
      }
    }

    // Add producer component for production buildings
    world.addComponent(id, 'producer', {
      timer: 0,
      active: false,
      workerCount: 0,
    });

    // Add house component for houses
    if (bld.type === 'wooden_house') {
      world.addComponent(id, 'house', {
        residents: [],
        firewood: 0,
        warmthLevel: INITIAL_HOUSE_WARMTH,
        maxResidents: bld.residents || 5,
      });
    }
  }
}
