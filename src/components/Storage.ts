import { ResourceType } from '../constants';

export interface StorageComponent {
  inventory: Map<ResourceType, number>;
  capacity: number;
}
