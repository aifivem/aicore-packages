import {
  CORE,
  type Warrant,
  type WarrantAdd,
  type WarrantPage,
  type WarrantResult,
  type WarrantTarget,
} from "@aifivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** A callback export as a promise (no promise crosses a resource boundary). */
const ask = <T>(call: (done: (value: T) => void) => void): Promise<T> =>
  new Promise((resolve) => call(resolve));

/**
 * ai-core's own warrants (by character, loaded or not; logged on ai-core's `warrants` channel). Whether they count in
 * `mdt.hasWarrant` is ai-core's panel setting `warrants` (`docs/compat/mdt.md`).
 */
export const warrants = {
  /** Issues a warrant (`minutes` null or left out = until cleared): `{ ok, id }` or `{ ok: false, error }` (ai-core lang key). */
  add: (warrant: WarrantAdd): Promise<WarrantResult> =>
    ask((done) => core.AddWarrant(warrant, done)),
  /** Clears one active warrant; false when no active warrant has that id. */
  clear: (id: number, by?: number | string): Promise<boolean> =>
    ask((done) => core.ClearWarrant(id, by, done)),
  /** Clears every active warrant of a character; resolves how many. */
  clearAll: (target: WarrantTarget, by?: number | string): Promise<number> =>
    ask((done) => core.ClearWarrants(target, by, done)),
  /** A character's active warrants, newest first; null when the target names no character. */
  of: (target: WarrantTarget): Promise<Warrant[] | null> =>
    ask((done) => core.GetWarrants(target, done)),
  /** Every active warrant, newest first, 25 a page (`cursor` = the last page's `next`). */
  page: (cursor?: number | null): Promise<WarrantPage> =>
    ask((done) => core.ListWarrants(cursor, done)),
};
