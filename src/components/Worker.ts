import { Profession, ResourceType } from '../constants';
import { EntityId } from '../types';

export interface WorkerComponent {
  profession: Profession;
  workplaceId: EntityId | null;
  carrying: ResourceType | null;
  carryAmount: number;
  task: string | null;
  manuallyAssigned: boolean;
  helperWorkplaceId?: EntityId; // set when quota-met, cleared when limit lifts
  depositTargetId?: EntityId | null; // nearest storage building to deposit gathered resources
  demolitionCarryQueue?: Array<{ type: ResourceType; amount: number }>;
}
