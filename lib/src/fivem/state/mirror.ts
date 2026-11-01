/**
 * State bags read from memory. Reading a bag (`Entity(e).state.x`, `GlobalState.x`) builds two proxies, calls up to
 * three natives, copies the value twice under two locks in the engine and decodes msgpack every time; on a busy server
 * it waits on the network thread's lock. These classes keep one change handler per key and resource and a `Map` of the
 * values, so a read is a map lookup (entities: one `NetworkGetNetworkIdFromEntity`). Writing is server only
 * (`sv_stateBagStrictMode`): the server classes in "@aicore-fivem/lib/server" add `set`.
 */

/** Turns a replicated value into `T`; `undefined` = no (valid) value. */
export type StateParse<T> = (value: unknown) => T | undefined;
type Listener<I, T> = (id: I, value: T | undefined, old: T | undefined) => void;

export const stateNumber: StateParse<number> = (v) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
export const stateBoolean: StateParse<boolean> = (v) =>
  typeof v === "boolean" ? v : undefined;
export const stateString: StateParse<string> = (v) =>
  typeof v === "string" ? v : undefined;

/** Shared base: values by id, listeners, the parse. */
export abstract class Mirror<I, T> {
  protected readonly values = new Map<I, T | undefined>();
  private readonly listeners = new Set<Listener<I, T>>();

  constructor(
    readonly key: string,
    protected readonly parse: StateParse<T>,
  ) {}

  /** Runs `listener(id, value, old)` after a value changes (the new value is already readable). */
  onChange(listener: Listener<I, T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected store(id: I, raw: unknown): void {
    this.apply(id, raw == null ? undefined : this.parse(raw));
  }

  /** A value the server just set: readable at once, listeners run once (the change handler later finds it equal). */
  protected apply(id: I, value: T | undefined): void {
    const old = this.values.get(id);
    this.values.set(id, value);
    if (old !== value)
      for (const listener of this.listeners) listener(id, value, old);
  }
}
