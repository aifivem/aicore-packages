import { PlayerMap } from "./players";

/**
 * Players who receive one key's deltas (a lot's cars, a character's screen): one key per player, `watch` replaces
 * the old one; freed on drop, empty sets deleted. Every operation is O(1). Create once at module level.
 */
export class KeyWatchers<K> {
  private readonly byKey = new Map<K, Set<number>>();
  private readonly keys = new PlayerMap<K>({
    onDrop: (source, key) => this.leave(source, key),
  });

  /** The player watches `key` (and stops watching the one before). */
  watch(source: number, key: K): void {
    this.stop(source);
    this.keys.set(source, key);
    let set = this.byKey.get(key);
    if (!set) this.byKey.set(key, (set = new Set()));
    set.add(source);
  }

  /** The player stops watching. */
  stop(source: number): void {
    const key = this.keys.get(source);
    if (key === undefined) return;
    this.keys.delete(source);
    this.leave(source, key);
  }

  /** The players watching `key`, undefined when none. */
  of(key: K): ReadonlySet<number> | undefined {
    return this.byKey.get(key);
  }

  /** The key the player watches. */
  keyOf(source: number): K | undefined {
    return this.keys.get(source);
  }

  private leave(source: number, key: K): void {
    const set = this.byKey.get(key);
    if (!set) return;
    set.delete(source);
    if (set.size === 0) this.byKey.delete(key);
  }
}
