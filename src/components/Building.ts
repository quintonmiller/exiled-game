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
  // ── Demolition fields ───────────────────────────────────────
  isDemolishing?: boolean;
  demolitionProgress?: number;   // 0–1
  demolitionWork?: number;
  demolitionRefundLog?: number;
  demolitionRefundStone?: number;
  demolitionRefundIron?: number;
  // ── Upgrade system fields ────────────────────────────────────
  tier?: number;                  // 1 = base, 2 = upgraded (undefined = tier 1)
  isUpgrading?: boolean;
  upgradeProgress?: number;       // 0–1
  upgradeTotalWork?: number;
  upgradeTargetType?: BuildingType; // set when upgrade starts, cleared on completion
  // ── Heated building fields (Tavern, Bakery, Chapel, Town Hall) ─
  warmthLevel?: number;           // 0–100, current heat (only for HEATED_BUILDING_TYPES)
  firewood?: number;              // firewood stocked in this building
}
