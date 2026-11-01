/**
 * Values a field picks from what exists in the game: items of the active inventory, jobs, gangs, money accounts.
 * A `lookup` on a text or names spec makes the server refuse anything else and the panel offer the list.
 */
/**
 * Lists the panel offers: the server's (items, jobs, gangs, accounts, started resources, online players by citizen id)
 * and the admin game's (`vehicle`: every vehicle model it has, addons included; `ped`: GTA's ped models). The server
 * cannot list game models, so those two never refuse a value.
 */
export type LookupSource =
  | "item"
  | "job"
  | "gang"
  | "account"
  | "resource"
  | "player"
  | "vehicle"
  | "ped";

/** One choice of a lookup list. */
export interface LookupOption {
  value: string;
  label: string;
  /** Jobs and gangs: the grade names, the grade number is the index (the `grade` widget lists them). */
  grades?: string[];
}

/** Every lookup list, sent with the panel when it opens. */
export type Lookups = Record<LookupSource, LookupOption[]>;
