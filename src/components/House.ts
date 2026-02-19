import { EntityId } from '../types';

export interface HouseComponent {
  residents: EntityId[];
  firewood: number;
  warmthLevel: number;
  maxResidents: number;
}
