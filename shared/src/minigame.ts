/** Minigames ai-core draws for every resource (lib `skillCheck` / `lockpick`); the answer arrives as `MENU_EVENTS.menuResult`. */

/** One ring of a skill check: the green arc's size in degrees and how many turns a second the needle makes. */
export interface SkillStage {
  area: number;
  speed: number;
}

/** A named skill check stage (ox_lib's names) or ox_lib's `{ areaSize, speedMultiplier }`. */
export type SkillDifficulty =
  "easy" | "medium" | "hard" | { areaSize: number; speedMultiplier: number };

export const SKILL_STAGES: Record<"easy" | "medium" | "hard", SkillStage> = {
  easy: { area: 50, speed: 0.6 },
  medium: { area: 40, speed: 0.85 },
  hard: { area: 25, speed: 1 },
};

/** Lockpick difficulty: the sweet spot's width in degrees of the pick's half circle. */
export const LOCKPICK_AREAS: Record<"easy" | "medium" | "hard", number> = {
  easy: 18,
  medium: 11,
  hard: 6,
};

export type LockpickResult = "opened" | "broken" | "cancelled";

export type MinigameRequest =
  | { kind: "skillCheck"; stages: SkillStage[]; keys: string[] }
  | { kind: "lockpick"; pins: number; area: number; picks: number };

/** A progress bar a server flow runs on a player's client (lib `progressFor`, ai-core's client draws it). */
export interface ServerProgress {
  label: string;
  /** Milliseconds. */
  duration: number;
  anim?: { dict: string; clip: string; flag?: number };
  scenario?: string;
  allowVehicle?: boolean;
  canCancel?: boolean;
  freeze?: boolean;
  disable?: { move?: boolean; car?: boolean; mouse?: boolean; combat?: boolean };
  /** The player turns to this point first. */
  face?: { x: number; y: number; z: number };
}
