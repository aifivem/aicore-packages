import { LIB_UI } from "@aicore-fivem/shared";
import { callExport, isResourceStarted } from "../../fivem/exports";
import type { ModelScanDef } from "../modelScan/def";
import { ModelScanner } from "../modelScan/scanner";

/**
 * Prompt-mode model points are scanned by ai-lib for every resource, like zones (`zones.ts`): FiveM enters a
 * resource's JS every frame while it has any timer, so one scan for all costs one resource's frame time instead of
 * every resource's. ai-lib tells the owner which object is nearest when it changes; label, `canShow` and the action
 * stay here. A resource scans its own points only while ai-lib does not run and hands them back when it starts.
 */
const RESOURCE = GetCurrentResourceName();
const HOST = LIB_UI.resource;

class Entry {
  entity = 0;
  constructor(
    readonly key: string,
    readonly def: ModelScanDef,
    readonly onNearest: (entity: number) => void,
  ) {}
}

const entries = new Map<string, Entry>();
const local = new ModelScanner();
let hosted = false;
/** ai-lib reads started but its exports are not there yet (client loading): wait for its start event. */
let waiting = false;

function setNearest(entry: Entry, entity: number): void {
  if (entry.entity === entity) return;
  entry.entity = entity;
  entry.onNearest(entity);
}

function addLocal(entry: Entry): void {
  local.add(
    entry.key,
    entry.def,
    (entity) => setNearest(entry, entity),
    entry.entity,
  );
}

/** Hands one point to ai-lib; false while it cannot take it (not started, or its exports not there yet). */
function addHosted(entry: Entry): boolean {
  try {
    callExport(HOST, "AddModelPoint", entry.key, entry.def, entry.entity);
    return true;
  } catch (error) {
    if (!String(error).includes("No such export")) throw error;
    waiting = true;
    return false;
  }
}

/** ai-lib takes every point over; the local scan stops. */
function handOver(): void {
  if (RESOURCE === HOST || waiting || !isResourceStarted(HOST)) return;
  for (const entry of entries.values())
    if (!addHosted(entry)) return takeBack();
  hosted = true;
  for (const key of entries.keys()) local.remove(key);
}

/** ai-lib is gone: this resource scans its points again, from the state ai-lib last reported. */
function takeBack(): void {
  hosted = false;
  for (const entry of entries.values()) addLocal(entry);
}

if (RESOURCE !== HOST) {
  on(
    LIB_UI.modelPointEvent,
    (owner: unknown, key: unknown, entity: unknown) => {
      if (owner !== RESOURCE || typeof key !== "string" || !hosted) return;
      const entry = entries.get(key);
      if (entry)
        setNearest(entry, Number.isInteger(entity) ? (entity as number) : 0);
    },
  );
  on("onClientResourceStart", (resource: string) => {
    if (resource !== HOST) return;
    waiting = false;
    handOver();
  });
  on("onClientResourceStop", (resource: string) => {
    if (resource === HOST && hosted) takeBack();
  });
}

/** Starts scanning for a model point (`key` unique in this resource); `onNearest` gets each change (0 = none near). */
export function scanModelPoint(
  key: string,
  def: ModelScanDef,
  onNearest: (entity: number) => void,
): void {
  stopModelPoint(key);
  const entry = new Entry(key, def, onNearest);
  entries.set(key, entry);
  if (!hosted) {
    handOver();
    if (!hosted) return addLocal(entry);
  }
  if (!addHosted(entry)) takeBack();
}

/** Stops scanning for a model point (no last `onNearest`). */
export function stopModelPoint(key: string): void {
  if (!entries.delete(key)) return;
  if (!hosted) return local.remove(key);
  try {
    callExport(HOST, "RemoveModelPoint", key);
  } catch {
    // ai-lib stopped meanwhile: its points went with it.
  }
}
