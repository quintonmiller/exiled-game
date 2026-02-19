import { EntityId } from '../types';
import { SPATIAL_CELL_SIZE } from '../constants';

export class SpatialHash {
  private cells = new Map<number, Set<EntityId>>();
  private entityCells = new Map<EntityId, number>();
  private cellSize: number;
  private width: number;

  constructor(mapWidth: number, cellSize: number = SPATIAL_CELL_SIZE) {
    this.cellSize = cellSize;
    this.width = Math.ceil(mapWidth / cellSize);
  }

  private key(cellX: number, cellY: number): number {
    return cellY * this.width + cellX;
  }

  private cellCoord(tileCoord: number): number {
    return Math.floor(tileCoord / this.cellSize);
  }

  insert(id: EntityId, tileX: number, tileY: number): void {
    this.remove(id);
    const k = this.key(this.cellCoord(tileX), this.cellCoord(tileY));
    if (!this.cells.has(k)) this.cells.set(k, new Set());
    this.cells.get(k)!.add(id);
    this.entityCells.set(id, k);
  }

  remove(id: EntityId): void {
    const k = this.entityCells.get(id);
    if (k !== undefined) {
      this.cells.get(k)?.delete(id);
      this.entityCells.delete(id);
    }
  }

  update(id: EntityId, tileX: number, tileY: number): void {
    const newKey = this.key(this.cellCoord(tileX), this.cellCoord(tileY));
    const oldKey = this.entityCells.get(id);
    if (oldKey === newKey) return;
    this.insert(id, tileX, tileY);
  }

  /** Get all entities within tile radius */
  queryRadius(centerX: number, centerY: number, radius: number): EntityId[] {
    const result: EntityId[] = [];
    const minCX = this.cellCoord(centerX - radius);
    const maxCX = this.cellCoord(centerX + radius);
    const minCY = this.cellCoord(centerY - radius);
    const maxCY = this.cellCoord(centerY + radius);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) {
          for (const id of cell) result.push(id);
        }
      }
    }
    return result;
  }

  /** Get entities in a specific cell */
  queryCell(tileX: number, tileY: number): EntityId[] {
    const cell = this.cells.get(this.key(this.cellCoord(tileX), this.cellCoord(tileY)));
    return cell ? [...cell] : [];
  }

  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }
}
