import { cellKey, gridCell } from "../../shared/grid";

export type Id = number | string;

/** What the stream needs of a world item. */
export interface AreaItem {
  readonly id: Id;
  readonly x: number;
  readonly y: number;
}

export interface Entry<T> {
  item: T;
  cx: number;
  cy: number;
  also: number | undefined;
}

/** World items by grid cell: where each item is and what lies around a point. */
export class AreaGrid<T extends AreaItem> {
  protected readonly items = new Map<Id, Entry<T>>();
  protected readonly cells = new Map<number, Set<Entry<T>>>();
  protected readonly size_: number;

  constructor(cellSize: number) {
    this.size_ = cellSize;
  }

  get size(): number {
    return this.items.size;
  }

  get(id: Id): T | undefined {
    return this.items.get(id)?.item;
  }

  *values(): Generator<T> {
    for (const entry of this.items.values()) yield entry.item;
  }

  /** The cell of a point on this stream's grid. */
  cellOf(x: number, y: number): { cx: number; cy: number } {
    return gridCell(x, y, this.size_);
  }

  /** Items in the cell of a point (a per-cell cap). */
  countAt(x: number, y: number): number {
    const { cx, cy } = this.cellOf(x, y);
    return this.cells.get(cellKey(cx, cy))?.size ?? 0;
  }

  /** Items in the cell of a point and `cells` cells around it (spacing and merge checks). */
  *around(x: number, y: number, cells = 1): Generator<T> {
    const { cx, cy } = this.cellOf(x, y);
    for (let dx = -cells; dx <= cells; dx++)
      for (let dy = -cells; dy <= cells; dy++)
        for (const entry of this.cells.get(cellKey(cx + dx, cy + dy)) ?? [])
          yield entry.item;
  }

  protected file(entry: Entry<T>): void {
    const key = cellKey(entry.cx, entry.cy);
    let set = this.cells.get(key);
    if (!set) this.cells.set(key, (set = new Set()));
    set.add(entry);
  }

  protected unfile(entry: Entry<T>): void {
    const key = cellKey(entry.cx, entry.cy);
    const set = this.cells.get(key);
    set?.delete(entry);
    if (set?.size === 0) this.cells.delete(key);
  }
}
