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
}
