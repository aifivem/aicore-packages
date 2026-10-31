import { LIB_UI } from "@aicore-fivem/shared";
import { callExport, isResourceStarted } from "../fivem/exports";
import { createLogger } from "../shared";
import type { ZoneShape } from "../shared/zone";
import { ZoneEngine, type ZoneOptions } from "./zoneEngine";

export type { ZoneShape, ZoneOptions };

/**
 * Zones are checked by ai-lib for every resource: FiveM enters a resource's JS every frame while it has any timer, so
 * one checker for all costs one resource's frame time instead of every resource's. A resource checks its own zones
 * only while ai-lib does not run (client still loading, ai-lib restarting) and hands them back when it starts.
 */
const RESOURCE = GetCurrentResourceName();
const HOST = LIB_UI.resource;
const log = createLogger(RESOURCE);

class Entry {
  inside = false;
  constructor(
    readonly key: string,
    readonly options: ZoneOptions,
  ) {}
}

/** Every zone of this resource by its key (`<group>:<id>`), so ai-lib's enter / exit events find it. */
const entries = new Map<string, Entry>();
const local = new ZoneEngine();
let hosted = false;
/** ai-lib reads started but its exports are not there yet (client loading): wait for its start event. */
let waiting = false;

function setInside(entry: Entry, inside: boolean): void {
  if (entry.inside === inside) return;
  entry.inside = inside;
  try {
    if (inside) entry.options.onEnter?.();
    else entry.options.onExit?.();
  } catch (error) {
    log.error("zone handler failed", error);
  }
}

function addLocal(entry: Entry): void {
  local.add(
    entry.key,
    {
      shape: entry.options.shape,
      interval: entry.options.interval,
      onEnter: () => setInside(entry, true),
      onExit: () => setInside(entry, false),
    },
    entry.inside,
  );
}

/** Hands one zone to ai-lib; false while it cannot take it (not started, or its exports not there yet). */
function addHosted(entry: Entry): boolean {
  try {
    callExport(
      HOST,
      "AddZone",
      entry.key,
      entry.options.shape,
      entry.options.interval ?? 500,
      entry.inside,
    );
    return true;
  } catch (error) {
    if (!String(error).includes("No such export")) throw error;
    waiting = true;
    return false;
  }
}

/** ai-lib takes every zone over; the local checker stops. */
function handOver(): void {
  if (RESOURCE === HOST || waiting || !isResourceStarted(HOST)) return;
  for (const entry of entries.values())
    if (!addHosted(entry)) return takeBack();
  hosted = true;
  for (const key of entries.keys()) local.remove(key, true);
}

/** ai-lib is gone: this resource checks its zones again, from the state ai-lib last reported. */
function takeBack(): void {
  hosted = false;
  for (const entry of entries.values()) addLocal(entry);
}

if (RESOURCE !== HOST) {
  on(LIB_UI.zoneEvent, (owner: unknown, key: unknown, inside: unknown) => {
    if (owner !== RESOURCE || typeof key !== "string") return;
    const entry = entries.get(key);
    if (entry && hosted) setInside(entry, inside === true);
  });
  on("onClientResourceStart", (resource: string) => {
    if (resource !== HOST) return;
    waiting = false;
    handOver();
  });
  on("onClientResourceStop", (resource: string) => {
    if (resource === HOST && hosted) takeBack();
  });
}

let nextGroup = 0;

/**
 * The zones of one feature (`add` / `remove` by id, `onEnter` / `onExit` per zone). Checked by ai-lib's one checker
 * (each zone at its own interval, never per frame), or by this resource while ai-lib does not run.
 */
export class Zones {
  private readonly prefix = `${++nextGroup}:`;
  private readonly ids = new Set<string>();

  /** Adds (or replaces) a zone. A replaced zone the player was in fires its onExit first. */
  add(id: string, options: ZoneOptions): void {
    this.remove(id);
    const entry = new Entry(this.prefix + id, options);
    entries.set(entry.key, entry);
    this.ids.add(id);
    if (!hosted) {
      handOver();
      if (!hosted) return addLocal(entry);
    }
    if (!addHosted(entry)) {
      takeBack();
      return;
    }
  }

  remove(id: string): void {
    const key = this.prefix + id;
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    this.ids.delete(id);
    if (hosted) {
      try {
        callExport(HOST, "RemoveZone", key);
      } catch {
        // ai-lib stopped meanwhile: its zones went with it.
      }
    } else local.remove(key, true);
    setInside(entry, false);
  }

  /** Removes every zone (exits fire for the ones the player is in). */
  clear(): void {
    for (const id of [...this.ids]) this.remove(id);
  }

  isInside(id: string): boolean {
    return entries.get(this.prefix + id)?.inside ?? false;
  }

  get size(): number {
    return this.ids.size;
  }
}
