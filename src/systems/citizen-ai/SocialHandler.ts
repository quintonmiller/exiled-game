import type { Game } from '../../Game';
import type { NavigationHelpers } from './NavigationHelpers';
import { EntityId } from '../../types';
import {
  BuildingType,
  SOCIAL_CHAT_RADIUS, SOCIAL_CHAT_CHANCE, SOCIAL_CHAT_DURATION,
  CHAT_HAPPINESS_GAIN,
  TAVERN_HAPPINESS_PER_TICK, TAVERN_VISIT_CHANCE,
  AI_TICK_INTERVAL,
  TRAIT_SOCIAL_CHANCE_MULT, TRAIT_HAPPINESS_GAIN_MULT,
  REL_GAIN_SOCIAL_CHAT,
} from '../../constants';
import { getTraitMult, incrementRelationship } from './CitizenUtils';

export class SocialHandler {
  constructor(private game: Game, private nav: NavigationHelpers) {}

  /** Try to visit a completed tavern with a barkeep for evening relaxation */
  tryVisitTavern(id: EntityId, citizen: any, needs: any, movement: any): boolean {
    if (Math.random() > TAVERN_VISIT_CHANCE) return false;

    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return false;

    for (const [bldId, bld] of buildings) {
      if (bld.type !== BuildingType.TAVERN || !bld.completed) continue;
      // Tavern needs a barkeep to be active
      const workerCount = bld.assignedWorkers?.length || 0;
      if (workerCount === 0) continue;

      if (this.nav.isNearBuilding(id, bldId)) {
        // At tavern — gain happiness
        citizen.activity = 'drinking';
        this.nav.enterBuilding(id, bldId);
        needs.happiness = Math.min(100, needs.happiness + TAVERN_HAPPINESS_PER_TICK * AI_TICK_INTERVAL);
        needs.lastSocialTick = this.game.state.tick;
        movement.stuckTicks = 0;
        return true;
      }

      // Go to tavern
      citizen.activity = 'drinking';
      if (this.nav.goToBuilding(id, bldId)) return true;
    }
    return false;
  }

  /** Try to chat with a nearby citizen */
  trySocialize(id: EntityId, citizen: any, needs: any): boolean {
    // Trait affects social chance
    const socialMult = getTraitMult(citizen, TRAIT_SOCIAL_CHANCE_MULT);
    if (Math.random() > SOCIAL_CHAT_CHANCE * socialMult) return false;

    const pos = this.game.world.getComponent<any>(id, 'position')!;
    const citizens = this.game.world.getComponentStore<any>('citizen');
    const positions = this.game.world.getComponentStore<any>('position');
    if (!citizens || !positions) return false;

    for (const [otherId] of citizens) {
      if (otherId === id) continue;
      const otherPos = positions.get(otherId);
      if (!otherPos) continue;

      const dx = Math.abs(pos.tileX - otherPos.tileX);
      const dy = Math.abs(pos.tileY - otherPos.tileY);
      if (dx <= SOCIAL_CHAT_RADIUS && dy <= SOCIAL_CHAT_RADIUS) {
        // Start chatting
        citizen.chatTimer = SOCIAL_CHAT_DURATION;
        needs.lastSocialTick = this.game.state.tick;
        const happyMult = getTraitMult(citizen, TRAIT_HAPPINESS_GAIN_MULT);
        needs.happiness = Math.min(100, needs.happiness + CHAT_HAPPINESS_GAIN * happyMult);
        incrementRelationship(this.game.world, id, otherId, REL_GAIN_SOCIAL_CHAT);
        return true;
      }
    }
    return false;
  }
}
