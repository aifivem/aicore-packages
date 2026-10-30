import { every } from "./scheduler";

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

const PRUNE_MS = 30_000;
const isServer = IsDuplicityVersion();

/** Shared base: values by id, listeners, the parse. */
abstract class Mirror<I, T> {
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

/** One key of entity state bags (`fuel`, `ai:owned`...), by network id. */
export class EntityState<T> extends Mirror<number, T> {
  /** The entity handle each value belongs to: a reused network id with another handle is read again. */
  private readonly handles = new Map<number, number>();

  constructor(key: string, parse: StateParse<T>) {
    super(key, parse);
    AddStateBagChangeHandler(
      key,
      "",
      (bag: string, _key: string, value: unknown) => {
        if (!bag.startsWith("entity:")) return;
        const netId = Number(bag.slice(7));
        this.handles.set(netId, GetEntityFromStateBagName(bag));
        this.store(netId, value);
      },
    );
    if (isServer)
      on("entityRemoved", (entity: number) =>
        this.forget(NetworkGetNetworkIdFromEntity(entity)),
      );
    else every(PRUNE_MS, () => this.prune(), { name: `state ${key}` });
  }

  /** The value on an entity (undefined: none or not networked). */
  get(entity: number): T | undefined {
    if (!entity) return undefined;
    const netId = NetworkGetNetworkIdFromEntity(entity);
    const handle = this.handles.get(netId);
    if (handle === entity) return this.values.get(netId);
    if (handle === 0 && this.values.has(netId)) {
      // The value arrived before the entity existed here.
      this.handles.set(netId, entity);
      return this.values.get(netId);
    }
    // First read of this entity (resource started after it was set, or a reused network id): read the bag once.
    this.handles.set(netId, entity);
    const value = this.parseRaw(Entity(entity).state[this.key]);
    this.values.set(netId, value);
    return value;
  }

  protected put(entity: number, value: T | undefined): void {
    const netId = NetworkGetNetworkIdFromEntity(entity);
    this.handles.set(netId, entity);
    this.apply(netId, value);
  }

  /** The value by network id, as far as this side knows it. */
  getByNetId(netId: number): T | undefined {
    return this.values.get(netId);
  }

  protected forget(netId: number): void {
    this.values.delete(netId);
    this.handles.delete(netId);
  }

  private parseRaw(raw: unknown): T | undefined {
    return raw == null ? undefined : this.parse(raw);
  }

  /** Clients never hear about entities leaving their scope: drop the ones that no longer exist here. */
  private prune(): void {
    for (const netId of this.values.keys())
      if (!DoesEntityExist(NetworkGetEntityFromNetworkId(netId)))
        this.forget(netId);
  }
}

/** One key of player state bags (`dead`, `cuffed`, pma-voice's `proximity`...), by server id. */
export class PlayerState<T> extends Mirror<number, T> {
  private readonly seen = new Set<number>();

  constructor(key: string, parse: StateParse<T>) {
    super(key, parse);
    AddStateBagChangeHandler(
      key,
      "",
      (bag: string, _key: string, value: unknown) => {
        if (!bag.startsWith("player:")) return;
        const id = Number(bag.slice(7));
        this.seen.add(id);
        this.store(id, value);
      },
    );
    if (isServer)
      on("playerDropped", () => this.forget(Number(globalThis.source)));
  }

  /** The value of a player by server id (the local player: `cache.serverId`). */
  get(serverId: number): T | undefined {
    if (!this.seen.has(serverId)) {
      this.seen.add(serverId);
      const raw: unknown = Player(serverId).state[this.key];
      this.values.set(serverId, raw == null ? undefined : this.parse(raw));
    }
    return this.values.get(serverId);
  }

  protected put(serverId: number, value: T | undefined): void {
    this.seen.add(serverId);
    this.apply(serverId, value);
  }

  protected forget(serverId: number): void {
    this.values.delete(serverId);
    this.seen.delete(serverId);
  }
}

/** One GlobalState key (shared state everyone needs): read once, then kept by its change handler. */
export class GlobalKey<T> extends Mirror<"global", T> {
  constructor(key: string, parse: StateParse<T>) {
    super(key, parse);
    const raw: unknown = GlobalState[key];
    this.values.set("global", raw == null ? undefined : parse(raw));
    AddStateBagChangeHandler(
      key,
      "global",
      (_bag: string, _key: string, value: unknown) =>
        this.store("global", value),
    );
  }

  get(): T | undefined {
    return this.values.get("global");
  }

  protected put(value: T | undefined): void {
    this.apply("global", value);
  }
}

type PrefixListener = (key: string, value: unknown) => void;
const prefixListeners = new Map<string, Set<PrefixListener>>();
let prefixHandler = false;

/** One wildcard handler on the global bag per resource, shared by every `GlobalGroup`. */
function listenPrefix(prefix: string, listener: PrefixListener): void {
  let set = prefixListeners.get(prefix);
  if (!set) prefixListeners.set(prefix, (set = new Set()));
  set.add(listener);
  if (prefixHandler) return;
  prefixHandler = true;
  AddStateBagChangeHandler(
    "",
    "global",
    (_bag: string, key: string, value: unknown) => {
      for (const [p, listeners] of prefixListeners)
        if (key.startsWith(p)) for (const l of listeners) l(key, value);
    },
  );
}

/** Many GlobalState keys with one prefix (`door:<id>`, `rob:<id>`), by the id after the prefix. */
export class GlobalGroup<T> extends Mirror<string, T> {
  constructor(
    readonly prefix: string,
    parse: StateParse<T>,
  ) {
    super(prefix, parse);
    const keys: unknown = GetStateBagKeys("global");
    for (const key of Array.isArray(keys) ? keys : []) {
      if (typeof key !== "string" || !key.startsWith(prefix)) continue;
      const raw: unknown = GlobalState[key];
      this.values.set(
        key.slice(prefix.length),
        raw == null ? undefined : parse(raw),
      );
    }
    listenPrefix(prefix, (key, value) =>
      this.store(key.slice(prefix.length), value),
    );
  }

  get(id: string): T | undefined {
    return this.values.get(id);
  }

  protected put(id: string, value: T | undefined): void {
    this.apply(id, value);
  }

  /** Every id with a value. */
  ids(): IterableIterator<string> {
    return this.values.keys();
  }
}
