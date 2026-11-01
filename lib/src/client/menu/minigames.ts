import {
  LOCKPICK_AREAS,
  SKILL_STAGES,
  type LockpickResult,
  type SkillDifficulty,
  type SkillStage,
} from "@aicore-fivem/shared";
import { requests, ui } from "./requests";

const stageOf = (d: SkillDifficulty): SkillStage =>
  typeof d === "string"
    ? (SKILL_STAGES[d] ?? SKILL_STAGES.easy)
    : {
        area: Math.min(180, Math.max(5, d.areaSize)),
        speed:
          SKILL_STAGES.easy.speed *
          Math.min(5, Math.max(0.2, d.speedMultiplier)),
      };

/**
 * ai-lib's skill check: a needle runs around a ring once per stage, the player presses the shown key while it is
 * on the green arc. Resolves true when every stage was hit, false on a miss, a wrong key or Escape. Stages are
 * `"easy" | "medium" | "hard"` or ox_lib's `{ areaSize, speedMultiplier }`; each stage shows one of `keys` (default E).
 * A result decides a client-side step only: the server keeps checking what it allows.
 */
export function skillCheck(
  difficulty: SkillDifficulty | SkillDifficulty[],
  keys: string[] = ["e"],
): Promise<boolean> {
  const stages = (Array.isArray(difficulty) ? difficulty : [difficulty])
    .slice(0, 20)
    .map(stageOf);
  const keyList = keys
    .filter((k) => typeof k === "string" && /^[a-z0-9]$/i.test(k))
    .map((k) => k.toLowerCase());
  return new Promise((resolve) =>
    requests.ask(
      (id) =>
        ui.OpenMinigame(id, {
          kind: "skillCheck",
          stages,
          keys: keyList.length ? keyList : ["e"],
        }),
      (value) => resolve(value === true),
    ),
  );
}

export interface LockpickOptions {
  /** Width of each pin's sweet spot (default "medium"). */
  difficulty?: "easy" | "medium" | "hard";
  /** Pins to turn one after another (default 1). */
  pins?: number;
  /** Picks the player may break before it fails as "broken" (default 1). */
  picks?: number;
}

/**
 * ai-lib's lockpick: the player moves the pick with A / D (or the arrows), holds W to turn the lock; the lock turns
 * further the closer the pick is to the hidden sweet spot, forcing it wears the pick down. Resolves "opened" when
 * every pin turned, "broken" when the last pick broke (take the item), "cancelled" on Escape.
 */
export function lockpick(
  options: LockpickOptions = {},
): Promise<LockpickResult> {
  return new Promise((resolve) =>
    requests.ask(
      (id) =>
        ui.OpenMinigame(id, {
          kind: "lockpick",
          pins: Math.min(6, Math.max(1, Math.floor(options.pins ?? 1))),
          area: LOCKPICK_AREAS[options.difficulty ?? "medium"],
          picks: Math.min(10, Math.max(1, Math.floor(options.picks ?? 1))),
        }),
      (value) =>
        resolve(value === "opened" || value === "broken" ? value : "cancelled"),
    ),
  );
}
