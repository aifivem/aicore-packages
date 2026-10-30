import type { AiPlayerData } from "@aicore-fivem/shared";
import { isRecord } from "../shared";
import {
  PLAYER_DATA_EVENT,
  PLAYER_DATA_PATCH_EVENT,
  type PlayerDataKey,
} from "../fivem/playerData";
import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";
import { onServerEvent } from "./netEvent";

const core = resourceExport(CORE.resource);

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
  // A resource started after the player loaded: the values pushed before come once from ai-core's export.
  try {
    const data: unknown = core.GetPlayerData();
    if (isRecord(data))
      for (const [key, value] of Object.entries(data))
        if (!values.has(key)) values.set(key, value);
  } catch {
    // ai-core's client is not up yet: its pushes fill the values.
  }
  onServerEvent(
    PLAYER_DATA_EVENT,
    { args: ([key, value]) => (typeof key === "string" ? [key, value] : null) },
    (key, value) => deliver(key, value),
  );
  onServerEvent(
    PLAYER_DATA_PATCH_EVENT,
    {
      args: ([key, patch]) =>
        typeof key === "string" && isRecord(patch) ? [key, patch] : null,
    },
    (key, patch) => {
      const current = values.get(key);
      deliver(key, { ...(isRecord(current) ? current : {}), ...patch });
    },
  );
}

/**
 * Calls `handler` every time ai-core pushes `key` for this player. Returns an unsubscribe function. Values pushed
 * before this resource started are read once from ai-core (`getPlayerData` has them), not replayed to `handler`.
 */
export function onPlayerData<K extends PlayerDataKey>(
  key: K,
  handler: (value: AiPlayerData[K]) => void,
): () => void {
  listen();
  const set = handlers.get(key) ?? new Set<Handler>();
  set.add(handler as Handler);
  handlers.set(key, set);
  return () => set.delete(handler as Handler);
}

/** The last value pushed since this resource started, or undefined. */
export function getPlayerData<K extends PlayerDataKey>(
  key: K,
): AiPlayerData[K] | undefined {
  listen();
  return values.get(key) as AiPlayerData[K] | undefined;
}

/** Seeds the values by hand (the lib already seeds itself from ai-core's `GetPlayerData` on first use). */
export function seedPlayerData(data: Partial<AiPlayerData>): void {
  listen();
  for (const [key, value] of Object.entries(data))
    if (!values.has(key)) values.set(key, value);
}
