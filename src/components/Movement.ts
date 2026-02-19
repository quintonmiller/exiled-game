import { EntityId } from '../types';

export interface MovementComponent {
  path: Array<{ x: number; y: number }>;
  speed: number;
  targetEntity: EntityId | null;
  moving: boolean;
}
