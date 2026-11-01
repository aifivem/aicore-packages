import { coordsOf } from "../position";
import { AreaFollowers, type Follower } from "./followers";
import type { AreaItem, Entry, Id } from "./grid";

/**
 * World items by grid cell, streamed to the players around them (the sync rule's snapshot + delta for world objects:
 * drops, plants, bodies, props). Each follower's client gets the items of the cells around its own once (`start`,
 * `reset` true), then only puts and removes: an item added, changed, moved or removed, or the follower changing cell
 * (`follow` with the client's reported cell, or `followAll` reading the server's positions). Who has an item is worked
 * out from the cells, so nothing is stored per follower and item. Followers are freed on drop.
 */
export class AreaStream<T extends AreaItem, V = T> extends AreaFollowers<
  T,
  V
> {
  /** `followAll` skipped its walk while there were no items. */
  private stale = false;

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
}
