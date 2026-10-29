import type { AiPlayerData } from "@aicore-fivem/shared";
import { isRecord } from "../shared";
import { PLAYER_DATA_EVENT, PLAYER_DATA_PATCH_EVENT, type PlayerDataKey } from "../fivem/playerData";
import { onServerEvent } from "./netEvent";

type Handler = (value: unknown) => void;

const values = new Map<string, unknown>();
const handlers = new Map<string, Set<Handler>>();
let listening = false;

function deliver(key: string, value: unknown): void {
  values.set(key, value);
  for (const handler of handlers.get(key) ?? []) handler(value);
}

function listen(): void {
  if (listening) return;
  listening = true;
  onServerEvent(PLAYER_DATA_EVENT, { args: ([key, value]) => (typeof key === "string" ? [key, value] : null) }, (key, value) => deliver(key, value));
  onServerEvent(
    PLAYER_DATA_PATCH_EVENT,
    { args: ([key, patch]) => (typeof key === "string" && isRecord(patch) ? [key, patch] : null) },
    (key, patch) => {
      const current = values.get(key);
      deliver(key, { ...(isRecord(current) ? current : {}), ...patch });
    },
  );
}

/**
 * Calls `handler` every time ai-core pushes `key` for this player. Returns an unsubscribe function. Values pushed
 * before this resource started are not replayed: read the current state once from ai-core's `GetPlayerData` export.
 */
export function onPlayerData<K extends PlayerDataKey>(key: K, handler: (value: AiPlayerData[K]) => void): () => void {
  listen();
  const set = handlers.get(key) ?? new Set<Handler>();
  set.add(handler as Handler);
  handlers.set(key, set);
  return () => set.delete(handler as Handler);
}

/** The last value pushed since this resource started, or undefined. */
export function getPlayerData<K extends PlayerDataKey>(key: K): AiPlayerData[K] | undefined {
  listen();
  return values.get(key) as AiPlayerData[K] | undefined;
}

/** Seeds the values (from ai-core's `GetPlayerData` export) when this resource starts after the player loaded. */
export function seedPlayerData(data: Partial<AiPlayerData>): void {
  listen();
  for (const [key, value] of Object.entries(data)) if (!values.has(key)) values.set(key, value);
}
