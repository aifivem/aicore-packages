import { cellKey, gridCell } from "../shared/grid";
import { coordsOf } from "./position";
import { PlayerMap } from "./players";

type Id = number | string;

/** What the stream needs of a world item. */
export interface AreaItem {
  readonly id: Id;
  readonly x: number;
  readonly y: number;
}

export interface AreaStreamOptions<T, V> {
  /** Client event: `(reset: boolean, puts: V[], removes: id[], ...extra)`. */
  event: string;
  /** What a client gets of an item. */
  view: (item: T) => V;
  /** Cell size in metres (default 64). */
  cellSize?: number;
  /** Cells around the follower's own cell it knows (default 1: the 3x3 around it). */
  range?: number;
  /** Puts per event; a long list goes as several small reliable events, which keep their order (default 50). */
  chunk?: number;
  /** A player who gets the item wherever they are (the body a player carries). */
  alsoTo?: (item: T) => number | undefined;
  /** Values appended to every event (a server clock for countdowns). */
  extra?: () => unknown[];
}

interface Entry<T> {
  item: T;
  cx: number;
  cy: number;
  also: number | undefined;
}

interface Follower {
  cx: number;
  cy: number;
}

/**
 * World items by grid cell, streamed to the players around them (the sync rule's snapshot + delta for world objects:
 * drops, plants, bodies, props). Each follower's client gets the items of the cells around its own once (`start`,
 * `reset` true), then only puts and removes: an item added, changed, moved or removed, or the follower changing cell
 * (`follow` with the client's reported cell, or `followAll` reading the server's positions). Who has an item is worked
 * out from the cells, so nothing is stored per follower and item. Followers are freed on drop.
 */
export class AreaStream<T extends AreaItem, V = T> {
  private readonly items = new Map<Id, Entry<T>>();
  private readonly cells = new Map<number, Set<Entry<T>>>();
  private readonly followers = new PlayerMap<Follower>({
    onDrop: (source, f) => this.leave(source, f),
  });
  /** Followers by their own cell. */
  private readonly inCell = new Map<number, Set<number>>();
  /** Items by their `alsoTo` player. */
  private readonly alsoOf = new Map<number, Set<Entry<T>>>();
  private readonly size_: number;
  private readonly range: number;
  private readonly chunk: number;
  /** `followAll` skipped its walk while there were no items. */
  private stale = false;

  constructor(private readonly options: AreaStreamOptions<T, V>) {
    this.size_ = options.cellSize ?? 64;
    this.range = options.range ?? 1;
    this.chunk = options.chunk ?? 50;
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

  /**
   * Adds or updates an item: the followers around it get a put (with `resend` false only those who did not have it
   * yet, for an item whose clients follow it themselves); followers that lost it when it moved get a remove.
   */
  set(item: T, resend = true): void {
    if (this.stale) this.followAll();
    const { cx, cy } = this.cellOf(item.x, item.y);
    const also = this.options.alsoTo?.(item);
    const entry = this.items.get(item.id);
    if (!entry) {
      const fresh: Entry<T> = { item, cx, cy, also: undefined };
      this.items.set(item.id, fresh);
      this.file(fresh);
      this.setAlso(fresh, also);
      const put = [this.options.view(item)];
      for (const source of this.who(cx, cy, also)) this.send(source, put, []);
      return;
    }
    const before = this.who(entry.cx, entry.cy, entry.also);
    if (entry.cx !== cx || entry.cy !== cy) {
      this.unfile(entry);
      entry.cx = cx;
      entry.cy = cy;
      this.file(entry);
    }
    entry.item = item;
    this.setAlso(entry, also);
    const after = this.who(cx, cy, also);
    const gone = [item.id];
    for (const source of before)
      if (!after.has(source)) this.send(source, [], gone);
    const put = [this.options.view(item)];
    for (const source of after)
      if (resend || !before.has(source)) this.send(source, put, []);
  }

  /** Removes an item; the followers who had it get a remove. */
  delete(id: Id): void {
    const entry = this.items.get(id);
    if (!entry) return;
    this.items.delete(id);
    this.unfile(entry);
    const gone = [id];
    for (const source of this.who(entry.cx, entry.cy, entry.also))
      this.send(source, [], gone);
    this.setAlso(entry, undefined);
  }

  /** Files many items without a message each (a load), then sends every follower its area again from scratch. */
  load(items: Iterable<T>): void {
    for (const item of items) {
      const old = this.items.get(item.id);
      if (old) {
        this.unfile(old);
        this.setAlso(old, undefined);
      }
      const { cx, cy } = this.cellOf(item.x, item.y);
      const entry: Entry<T> = { item, cx, cy, also: undefined };
      this.items.set(item.id, entry);
      this.file(entry);
      this.setAlso(entry, this.options.alsoTo?.(item));
    }
    for (const [source, f] of this.followers) this.snapshot(source, f);
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

  /** The player starts following at a point (default: the ped's server position): a snapshot of its area. */
  start(source: number, at = coordsOf(source)): void {
    const { cx, cy } = this.cellOf(at.x, at.y);
    const old = this.followers.get(source);
    if (old) this.leave(source, old);
    const f: Follower = { cx, cy };
    this.followers.set(source, f);
    this.enter(source, f);
    this.snapshot(source, f);
  }

  /** The player's cell (as its client reports it): a first one starts following, a change sends the difference. */
  follow(source: number, cx: number, cy: number): void {
    const f = this.followers.get(source);
    if (!f) {
      const fresh: Follower = { cx, cy };
      this.followers.set(source, fresh);
      this.enter(source, fresh);
      return this.snapshot(source, fresh);
    }
    this.move(source, f, cx, cy);
  }

  /**
   * `follow` for a cell a client sent: refused (false) unless it is within one cell of the ped's server position
   * (the client's cell may lag one behind).
   */
  followReported(source: number, cx: number, cy: number): boolean {
    const p = coordsOf(source);
    const real = this.cellOf(p.x, p.y);
    if (Math.abs(real.cx - cx) > 1 || Math.abs(real.cy - cy) > 1) return false;
    this.follow(source, cx, cy);
    return true;
  }

  /** Reads every follower's server position and sends the difference to those who changed cell (a timer). */
  followAll(): void {
    if (this.items.size === 0) {
      this.stale = true;
      return;
    }
    this.stale = false;
    for (const [source, f] of this.followers) {
      const p = coordsOf(source);
      const { cx, cy } = this.cellOf(p.x, p.y);
      this.move(source, f, cx, cy);
    }
  }

  /** The player stops following (logout, a private world); `tell` empties its client. */
  stop(source: number, tell = false): void {
    const f = this.followers.get(source);
    if (!f) return;
    this.followers.delete(source);
    this.leave(source, f);
    if (tell) this.emit(source, true, [], []);
  }

  following(source: number): boolean {
    return this.followers.has(source);
  }

  private move(source: number, f: Follower, cx: number, cy: number): void {
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

  private snapshot(source: number, f: Follower): void {
    const puts: V[] = [];
    const r = this.range;
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (const entry of this.cells.get(cellKey(f.cx + dx, f.cy + dy)) ??
          [])
          puts.push(this.options.view(entry.item));
    for (const entry of this.alsoOf.get(source) ?? [])
      if (Math.abs(entry.cx - f.cx) > r || Math.abs(entry.cy - f.cy) > r)
        puts.push(this.options.view(entry.item));
    this.emit(source, true, puts, []);
  }

  /** Followers whose area holds the cell, plus `also`. */
  private who(cx: number, cy: number, also: number | undefined): Set<number> {
    const out = new Set<number>();
    const r = this.range;
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (const source of this.inCell.get(cellKey(cx + dx, cy + dy)) ?? [])
          out.add(source);
    if (also !== undefined) out.add(also);
    return out;
  }

  private send(source: number, puts: V[], removes: Id[]): void {
    this.emit(source, false, puts, removes);
  }

  private emit(source: number, reset: boolean, puts: V[], removes: Id[]): void {
    const extra = this.options.extra?.() ?? [];
    const { event } = this.options;
    emitNet(event, source, reset, puts.slice(0, this.chunk), removes, ...extra);
    for (let i = this.chunk; i < puts.length; i += this.chunk)
      emitNet(event, source, false, puts.slice(i, i + this.chunk), [], ...extra);
  }

  private setAlso(entry: Entry<T>, also: number | undefined): void {
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

  private file(entry: Entry<T>): void {
    const key = cellKey(entry.cx, entry.cy);
    let set = this.cells.get(key);
    if (!set) this.cells.set(key, (set = new Set()));
    set.add(entry);
  }

  private unfile(entry: Entry<T>): void {
    const key = cellKey(entry.cx, entry.cy);
    const set = this.cells.get(key);
    set?.delete(entry);
    if (set?.size === 0) this.cells.delete(key);
  }

  private enter(source: number, f: Follower): void {
    const key = cellKey(f.cx, f.cy);
    let set = this.inCell.get(key);
    if (!set) this.inCell.set(key, (set = new Set()));
    set.add(source);
  }

  private leave(source: number, f: Follower): void {
    const key = cellKey(f.cx, f.cy);
    const set = this.inCell.get(key);
    set?.delete(source);
    if (set?.size === 0) this.inCell.delete(key);
  }
}
