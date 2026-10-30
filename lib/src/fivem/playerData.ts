import type { AiPlayerData } from "@aicore-fivem/shared"

/**
 * ai-core's per-player channel: the server pushes `(key, value)` of `AiPlayerData` to the owner's client. One net
 * event carries every key, and every resource on that client receives it, so client code subscribes per key
 * instead of wiring its own `onNet` for each value.
 */
export const PLAYER_DATA_EVENT = "ai-core:client:playerData"

/** Same channel for map values (money): only the changed entries travel and the client merges them. */
export const PLAYER_DATA_PATCH_EVENT = "ai-core:client:playerDataPatch"

export type PlayerDataKey = keyof AiPlayerData
