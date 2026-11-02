import type { ActionResult } from "./action";

/** ai-core's own warrants (`ai_core_warrants`): set by admins, the police job menu or any script through lib `warrants`. */
export interface Warrant {
  id: number;
  charId: number;
  reason: string;
  /** Who issued it: an officer's character, an admin or a resource name. */
  by: string;
  /** Epoch ms. */
  created: number;
  /** Epoch ms; null = until cleared. */
  expires: number | null;
}

/** A row of the active list: the warrant and its character. */
export interface WarrantRow extends Warrant {
  citizenid: string;
  name: string;
}

/** A page of active warrants, newest first; `next` is the cursor of the next page (null: last page). */
export interface WarrantPage {
  warrants: WarrantRow[];
  next: number | null;
}

/** A character: a loaded player's server id, a citizenid or `{ charId }`. */
export type WarrantTarget = number | string | { charId: number };

/** A new warrant; `minutes` left out or null = until cleared, `by` an officer's server id or a name. */
export interface WarrantAdd {
  target: WarrantTarget;
  reason: string;
  minutes?: number | null;
  by?: number | string;
}

/** `AddWarrant`'s answer: the new id, or an ai-core lang key. */
export type WarrantResult = ActionResult<{ id: number }>;

/**
 * How ai-core's MDT layer answers a warrant check (panel setting `warrants`): `auto` = the MDT's warrants while it
 * answers warrant checks, else ai-core's own; `both` = either; `mdt` = only the MDT's.
 */
export type WarrantMode = "auto" | "both" | "mdt";

/** Lengths offered by the admin panel and the police menu (lang `..._D_<id>`); null = until cleared. */
export const WARRANT_DURATIONS = [
  { id: "1H", minutes: 60 },
  { id: "6H", minutes: 360 },
  { id: "1D", minutes: 1440 },
  { id: "3D", minutes: 4320 },
  { id: "1W", minutes: 10_080 },
  { id: "CLEARED", minutes: null },
] as const satisfies ReadonlyArray<{ id: string; minutes: number | null }>;

/** Active warrants one character may hold; a full list refuses new ones. */
export const MAX_WARRANTS = 20;

/** ai-core's warrant exports (server). Callbacks: no promise crosses a resource boundary. */
export type WarrantServerExports = {
  /** Issues a warrant; `done` gets `{ ok, id }` or `{ ok: false, error }` (an ai-core lang key). */
  AddWarrant(warrant: WarrantAdd, done?: (result: WarrantResult) => void): void;
  /** Clears one active warrant; `done(false)` when no active warrant has that id. */
  ClearWarrant(
    id: number,
    by?: number | string,
    done?: (cleared: boolean) => void,
  ): void;
  /** Clears every active warrant of a character; `done` gets how many. */
  ClearWarrants(
    target: WarrantTarget,
    by?: number | string,
    done?: (count: number) => void,
  ): void;
  /** A character's active warrants, newest first; null when the target names no character. */
  GetWarrants(
    target: WarrantTarget,
    done: (warrants: Warrant[] | null) => void,
  ): void;
  /** Every active warrant, newest first, 25 a page (`cursor` = the last page's `next`). */
  ListWarrants(
    cursor: number | null | undefined,
    done: (page: WarrantPage) => void,
  ): void;
};
