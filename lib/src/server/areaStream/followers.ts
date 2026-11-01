import { PlayerMap } from "../players";
import { cellKey } from "../../shared/grid";
import { AreaGrid, type AreaItem, type Entry, type Id } from "./grid";
import type { AreaStreamOptions } from "./options";

export interface Follower {
  cx: number;
  cy: number;
}

/** The players following a stream: who is in which cell, who has an item, and the messages they get. */
export class AreaFollowers<T extends AreaItem, V> extends AreaGrid<T> {
  protected readonly followers = new PlayerMap<Follower>({
    onDrop: (source, f) => this.leave(source, f),
  });
  /** Followers by their own cell. */
  protected readonly inCell = new Map<number, Set<number>>();
  /** Items by their `alsoTo` player; a dropped player's are let go (a new player reusing the id never gets them). */
  protected readonly alsoOf = new PlayerMap<Set<Entry<T>>>({
    onDrop: (_source, entries) => {
      for (const entry of entries) entry.also = undefined;
    },
  });
  protected readonly range: number;
  protected readonly chunk: number;

  constructor(protected readonly options: AreaStreamOptions<T, V>) {
    super(options.cellSize ?? 64);
    this.range = options.range ?? 1;
    this.chunk = options.chunk ?? 50;
  }

  /** The players whose client has the item now. */
  recipients(id: Id): Set<number> {
    const entry = this.items.get(id);
    return entry ? this.who(entry.cx, entry.cy, entry.also) : new Set();
  }

  /** Whether the player's client has the item now. */
  knows(source: number, id: Id): boolean {
    const entry = this.items.get(id);
    if (!entry) return false;
    if (entry.also === source) return true;
    const f = this.followers.get(source);
    return (
      f !== undefined &&
      Math.abs(f.cx - entry.cx) <= this.range &&
      Math.abs(f.cy - entry.cy) <= this.range
    );
  }

  following(source: number): boolean {
    return this.followers.has(source);
  }

  protected move(source: number, f: Follower, cx: number, cy: number): void {
    if (f.cx === cx && f.cy === cy) return;
    const r = this.range;
    const removes: Id[] = [];
    const puts: V[] = [];
    // Cells of the old area outside the new one, and the other way round.
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        const ox = f.cx + dx;
        const oy = f.cy + dy;
        if (Math.abs(ox - cx) > r || Math.abs(oy - cy) > r)
          for (const entry of this.cells.get(cellKey(ox, oy)) ?? [])
            if (entry.also !== source) removes.push(entry.item.id);
        const nx = cx + dx;
        const ny = cy + dy;
        if (Math.abs(nx - f.cx) > r || Math.abs(ny - f.cy) > r)
          for (const entry of this.cells.get(cellKey(nx, ny)) ?? [])
            if (entry.also !== source) puts.push(this.options.view(entry.item));
      }
    this.leave(source, f);
    f.cx = cx;
    f.cy = cy;
    this.enter(source, f);
    if (puts.length > 0 || removes.length > 0) this.send(source, puts, removes);
  }

  protected snapshot(source: number, f: Follower): void {
    const puts: V[] = [];
    const r = this.range;
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (const entry of this.cells.get(cellKey(f.cx + dx, f.cy + dy)) ?? [])
          puts.push(this.options.view(entry.item));
    for (const entry of this.alsoOf.get(source) ?? [])
      if (Math.abs(entry.cx - f.cx) > r || Math.abs(entry.cy - f.cy) > r)
        puts.push(this.options.view(entry.item));
    this.emit(source, true, puts, []);
  }

  /** Followers whose area holds the cell, plus `also`. */
  protected who(cx: number, cy: number, also: number | undefined): Set<number> {
    const out = new Set<number>();
    const r = this.range;
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (const source of this.inCell.get(cellKey(cx + dx, cy + dy)) ?? [])
          out.add(source);
    if (also !== undefined) out.add(also);
    return out;
  }

  protected send(source: number, puts: V[], removes: Id[]): void {
    this.emit(source, false, puts, removes);
  }

  protected emit(source: number, reset: boolean, puts: V[], removes: Id[]): void {
    const extra = this.options.extra?.() ?? [];
    const { event } = this.options;
    emitNet(event, source, reset, puts.slice(0, this.chunk), removes, ...extra);
    for (let i = this.chunk; i < puts.length; i += this.chunk)
      emitNet(
        event,
        source,
        false,
        puts.slice(i, i + this.chunk),
        [],
        ...extra,
      );
  }

  protected setAlso(entry: Entry<T>, also: number | undefined): void {
    if (entry.also === also) return;
    if (entry.also !== undefined) {
      const set = this.alsoOf.get(entry.also);
      set?.delete(entry);
      if (set?.size === 0) this.alsoOf.delete(entry.also);
    }
    entry.also = also;
    if (also === undefined) return;
    let set = this.alsoOf.get(also);
    if (!set) this.alsoOf.set(also, (set = new Set()));
    set.add(entry);
  }


  protected enter(source: number, f: Follower): void {
    const key = cellKey(f.cx, f.cy);
    let set = this.inCell.get(key);
    if (!set) this.inCell.set(key, (set = new Set()));
    set.add(source);
  }

  protected leave(source: number, f: Follower): void {
    const key = cellKey(f.cx, f.cy);
    const set = this.inCell.get(key);
    set?.delete(source);
    if (set?.size === 0) this.inCell.delete(key);
  }
}
