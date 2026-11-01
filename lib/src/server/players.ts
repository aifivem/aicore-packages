import { CORE, type CharacterInfo } from "@aicore-fivem/shared";
import { createLogger } from "../shared";
import { online } from "./online/online";

const log = createLogger(GetCurrentResourceName());

/** Every per-player store of this resource; one playerDropped listener frees them all (one listener each trips Node's limit). */
const dropped = new Set<(source: number) => void>();
let listening = false;

function onDropped(fn: (source: number) => void): void {
  if (!listening) {
    listening = true;
    on("playerDropped", () => {
      const source = Number(globalThis.source);
      for (const handler of dropped) handler(source);
    });
  }
  dropped.add(fn);
}

/**
 * A Map keyed by player source that empties itself when the player drops (one shared playerDropped listener).
 * Create it once at module level: every instance stays registered for the resource's life.
 */
export class PlayerMap<V> extends Map<number, V> {
  constructor(options: { onDrop?: (source: number, value: V) => void } = {}) {
    super();
    onDropped((source) => {
      if (!this.has(source)) return;
      const value = this.get(source) as V;
      this.delete(source);
      options.onDrop?.(source, value);
    });
  }
}

/** Per-player cooldowns on the game clock, freed when the player drops. Create once at module level. */
export class Cooldowns {
  private readonly until = new PlayerMap<number>();

  /** No cooldown runs for the player. */
  ready(source: number): boolean {
    return this.left(source) === 0;
  }

  /** Starts (or restarts) the player's cooldown for `ms`. */
  start(source: number, ms: number): void {
    this.until.set(source, GetGameTimer() + ms);
  }

  /** Starts the cooldown when it is ready and answers true; false while one still runs. */
  take(source: number, ms: number): boolean {
    if (!this.ready(source)) return false;
    this.start(source, ms);
    return true;
  }

  /** Milliseconds left, 0 when ready. */
  left(source: number): number {
    const until = this.until.get(source);
    if (until === undefined) return 0;
    const left = until - GetGameTimer();
    if (left > 0) return left;
    this.until.delete(source);
    return 0;
  }

  /** Ends the player's cooldown. */
  clear(source: number): void {
    this.until.delete(source);
  }
}

/**
 * Cooldowns by a key that outlives the connection, on the game clock: a character id (a reconnect keeps the
 * cooldown) or an entity. Expired entries are swept when the map has doubled since the last sweep (amortized O(1)
 * per `start`). Create once at module level.
 */
export class KeyedCooldowns<K = number> {
  private readonly until = new Map<K, number>();
  private sweepAt = 64;

  /** No cooldown runs for the key. */
  ready(key: K): boolean {
    return this.left(key) === 0;
  }

  /** Starts (or restarts) the key's cooldown for `ms`; 0 or less ends it. */
  start(key: K, ms: number): void {
    if (ms <= 0) {
      this.until.delete(key);
      return;
    }
    if (this.until.size >= this.sweepAt) this.sweep();
    this.until.set(key, GetGameTimer() + ms);
  }

  /** Starts the cooldown when it is ready and answers true; false while one still runs. */
  take(key: K, ms: number): boolean {
    if (!this.ready(key)) return false;
    this.start(key, ms);
    return true;
  }

  /** Milliseconds left, 0 when ready. */
  left(key: K): number {
    const until = this.until.get(key);
    if (until === undefined) return 0;
    const left = until - GetGameTimer();
    if (left > 0) return left;
    this.until.delete(key);
    return 0;
  }

  /** Ends the key's cooldown. */
  clear(key: K): void {
    this.until.delete(key);
  }

  private sweep(): void {
    const now = GetGameTimer();
    for (const [key, until] of this.until)
      if (until <= now) this.until.delete(key);
    this.sweepAt = Math.max(64, this.until.size * 2);
  }
}

export interface CharacterHandlers {
  /** A character entered the world; also once at start for every character loaded before this resource (re)started. */
  loaded?: (source: number, character: CharacterInfo) => void | Promise<void>;
  /** The character left: logout or character switch (`"switch"`) or a drop (`"dropped"`); each `loaded` gets exactly one. */
  unloaded?: (
    source: number,
    charId: number,
    reason: "dropped" | "switch",
  ) => void;
}

/**
 * A loaded character's lifecycle from ai-core's events. `loaded` replays the characters already in the world after
 * a restart (from lib `online`, on the next tick so the caller's module has finished loading); no extra
 * playerDropped handler is needed next to it.
 */
export function onCharacter(handlers: CharacterHandlers): void {
  // source -> charId of each `loaded` delivered, so every one gets its `unloaded` and the replay skips repeats.
  const live = new Map<number, number>();
  const deliver = (source: number, character: CharacterInfo): void => {
    live.set(source, character.id);
    if (!handlers.loaded) return;
    try {
      const result = handlers.loaded(source, character);
      if (result instanceof Promise)
        result.catch((error: unknown) =>
          log.error(`character loaded handler failed for ${source}`, error),
        );
    } catch (error) {
      log.error(`character loaded handler failed for ${source}`, error);
    }
  };
  const end = (
    source: number,
    charId: number,
    reason: "dropped" | "switch",
  ): void => {
    if (!live.delete(source)) return;
    try {
      handlers.unloaded?.(source, charId, reason);
    } catch (error) {
      log.error(`character unloaded handler failed for ${source}`, error);
    }
  };
  on(CORE.playerLoadedEvent, (source: number, character: CharacterInfo) => {
    const previous = live.get(source);
    if (previous !== undefined) end(source, previous, "switch");
    deliver(source, character);
  });
  on(
    CORE.playerUnloadedEvent,
    (source: number, charId: number, reason: unknown) =>
      end(source, charId, reason === "dropped" ? "dropped" : "switch"),
  );
  // ai-core unloads on drop itself; this only catches a drop whose unload never came (ai-core stopping).
  onDropped((source) =>
    setImmediate(() => {
      const charId = live.get(source);
      if (charId !== undefined) end(source, charId, "dropped");
    }),
  );
  setImmediate(() => {
    for (const source of online.sources()) {
      if (live.has(source)) continue;
      const character = online.character(source);
      if (character) deliver(source, character);
    }
  });
}
