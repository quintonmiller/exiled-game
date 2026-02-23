import { EntityId } from '../types';

export type RelationshipStatus = 'single' | 'partnered' | 'married';

export interface FamilyComponent {
  relationshipStatus: RelationshipStatus;
  partnerId: EntityId | null;
  childrenIds: EntityId[];
  homeId: EntityId | null;
  isPregnant?: boolean;
  pregnancyTicks?: number;
  pregnancyPartnerId?: EntityId | null;
  relationships?: Record<number, number>;   // entityId -> score (0-100)
  partnershipStartTick?: number;            // when current partnership began
  compatibility?: number;                   // cached compatibility with partner (0-1)
}
