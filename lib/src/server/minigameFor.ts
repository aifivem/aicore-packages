import {
  LIB_UI,
  LOCKPICK_AREAS,
  SKILL_STAGES,
  type MinigameRequest,
} from "@aicore-fivem/shared";
import { triggerClientCallback } from "./callback";

export type MinigameOutcome = "won" | "lost" | "broken";

export interface MinigameForOptions {
  game: "skillCheck" | "lockpick";
  difficulty?: "easy" | "medium" | "hard";
  /** Skill check rings (default 2). */
  rounds?: number;
  /** Skill check keys (default E). */
  keys?: string[];
  /** Lockpick pins (default 1) and picks the player may break (default 1). */
  pins?: number;
  picks?: number;
  /** A win answered sooner than this (ms after the request) counts as lost: the client skipped the game. */
  minMs?: number;
}

/** How long a player may play before the answer counts as lost. */
const TIMEOUT_MS = 120_000;

/**
 * Plays ai-lib's minigame on the player's client for a server flow: "won", "lost" (missed, gave up, no answer) or
 * "broken" (the lockpick's last pick broke: take the item). The answer is the client's word, so the server still
 * decides what a win gives (a chance roll, `progressFor`, its own checks). `minMs` is the floor for a win: the
 * game's fastest real play (skill check: its green arc starts at 100 degrees, at the stage's speed).
 */
export async function minigameFor(
  source: number,
  options: MinigameForOptions,
): Promise<MinigameOutcome> {
  const level = options.difficulty ?? "medium";
  const request: MinigameRequest =
    options.game === "lockpick"
      ? {
          kind: "lockpick",
          pins: Math.min(6, Math.max(1, Math.floor(options.pins ?? 1))),
          area: LOCKPICK_AREAS[level],
          picks: Math.min(10, Math.max(1, Math.floor(options.picks ?? 1))),
        }
      : {
          kind: "skillCheck",
          stages: Array.from(
            { length: Math.min(10, Math.max(1, options.rounds ?? 2)) },
            () => SKILL_STAGES[level],
          ),
          keys: options.keys ?? ["e"],
        };
  const startedAt = GetGameTimer();
  const answer = await triggerClientCallback(
    LIB_UI.minigameForCallback,
    source,
    [request],
    TIMEOUT_MS,
  ).catch(() => null);
  if (answer === true || answer === "opened")
    return GetGameTimer() - startedAt < (options.minMs ?? 0) ? "lost" : "won";
  return answer === "broken" ? "broken" : "lost";
}
