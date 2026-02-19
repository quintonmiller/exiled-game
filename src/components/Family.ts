import { EntityId } from '../types';

export interface FamilyComponent {
  partnerId: EntityId | null;
  childrenIds: EntityId[];
  homeId: EntityId | null;
}
