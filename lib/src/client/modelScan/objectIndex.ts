import { cellKey } from "../../shared";

/** Pool entries the object index reads per scan, so a big pool is spread over several scans. */
const INDEX_CHUNK = 300;
/** Indexed objects are filtered by where they stood when found; this margin covers ones moved since. */
export const MOVE_MARGIN = 2;
/** Grid cell of the object index, in metres: at least the largest radius plus the margin, so 3 x 3 cells cover it. */
export const CELL = 64;

/**
 * The objects whose model a many-model point wants (364 chair models, say): one closest-object query per model and
 * scan costs milliseconds, so the object pool is walked instead, a chunk per scan, and only matching objects are kept
 * with the place they stood.
 */
export class ObjectIndex {
  /** Matching objects found by the last complete walk, by grid cell: entity, then x, y, z. */
  cells = new Map<number, number[]>();
  private pool: number[] = [];
  private next = 0;
  private found = new Map<number, number[]>();

  advance(wanted: Set<number>): void {
    if (this.next >= this.pool.length) {
      this.cells = this.found;
      this.found = new Map();
      this.pool = GetGamePool("CObject") as number[];
      this.next = 0;
    }
    const end = Math.min(this.pool.length, this.next + INDEX_CHUNK);
    for (let i = this.next; i < end; i++) {
      const entity = this.pool[i] ?? 0;
      if (!entity || !wanted.has(GetEntityModel(entity))) continue;
      const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
      const key = cellKey(Math.floor(x / CELL), Math.floor(y / CELL));
      const cell = this.found.get(key);
      if (cell) cell.push(entity, x, y, z);
      else this.found.set(key, [entity, x, y, z]);
    }
    this.next = end;
  }
}
