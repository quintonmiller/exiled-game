import { BuildingType, BuildingCategory } from '../constants';
import { EntityId } from '../types';

export interface BuildingComponent {
  type: BuildingType;
  name: string;
  category: BuildingCategory;
  completed: boolean;
  constructionProgress: number;
  constructionWork: number;
  width: number;
  height: number;
  maxWorkers: number;
  workRadius: number;
  assignedWorkers: EntityId[];
  materialsDelivered: boolean;
  costLog: number;
  costStone: number;
  costIron: number;
}
