/** Server-only helpers. Import from "@aicore-fivem/lib/server". */

import type { AiPlayerData } from "@aicore-fivem/shared";
import {
  PLAYER_DATA_EVENT,
  PLAYER_DATA_PATCH_EVENT,
  type PlayerDataKey,
} from "../fivem/playerData";

/** The player who sent the net event being handled. Read it before the first `await`: FiveM resets it. */
export function eventSource(): number {
  return Number(globalThis.source);
}

/** Whether the player is still connected. */
export function isOnline(source: number): boolean {
  return Boolean(GetPlayerName(String(source)));
}

/**
 * Runs database writes one after another (memory is the truth, the table follows in order). A failed write is
 * logged with `label` and does not stop the ones after it. `idle()` resolves when all queued writes are done.
 */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly onError: (label: string, error: unknown) => void,
  ) {}

  push(label: string, task: () => Promise<unknown>): void {
    this.tail = this.tail.then(task).then(
      () => undefined,
      (error: unknown) => this.onError(label, error),
    );
  }

  idle(): Promise<void> {
    return this.tail;
  }
}

/** Pushes one value of `AiPlayerData` to its owner's client (`onPlayerData` there). Only ai-core calls this. */
export function sendPlayerData<K extends PlayerDataKey>(
  source: number,
  key: K,
  value: AiPlayerData[K],
): void {
  emitNet(PLAYER_DATA_EVENT, source, key, value);
}

/** Pushes only the changed entries of a map value (money); the client merges them into what it has. */
export function patchPlayerData<K extends PlayerDataKey>(
  source: number,
  key: K,
  patch: Partial<AiPlayerData[K]>,
): void {
  emitNet(PLAYER_DATA_PATCH_EVENT, source, key, patch);
}

export { RateLimit, SourceLock } from "./rateLimit";
export { DataFile } from "./dataFile";
export { AdminPanel } from "./admin/panel";
export { aiLog, aiLogChannels } from "./log";
export { notify } from "./notify";
export { inventory } from "./inventory";
export { online } from "./online";
export { vehicleKeys } from "./vehicleKeys";
export { spawnVehicle, vehicleType, type SpawnVehicleOptions } from "./vehicle";
export { playersNear, playersNearEntity } from "./proximity";
export {
  addCommand,
  type CommandArgs,
  type CommandHandler,
  type CommandOptions,
} from "./command";
export { onClientCallback, triggerClientCallback } from "./callback";
export { onClientEvent } from "./netEvent";
export {
  ClientGate,
  hasCharacter,
  isAdmin,
  near,
  type ClientInputOptions,
  type Guard,
  type ParsedInputOptions,
} from "./gate";
export { createDatabaseTables } from "./database";
export {
  callExport,
  isResourceStarted,
  optionalExport,
  provideExport,
  registerExport,
  resourceExport,
} from "../fivem/exports";
export { createLocale, loadLocaleTexts, LOCALE_CONVAR } from "../fivem/locale";
export { EntityState, GlobalGroup, GlobalKey, PlayerState } from "./state";
export { stateBoolean, stateNumber, stateString, type StateParse } from "../fivem/state";
