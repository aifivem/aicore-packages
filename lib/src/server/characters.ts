import {
  CORE,
  type CharacterInfoPatch,
  type CharacterResult,
  type CharacterSearchPage,
  type MembersPage,
  type OfflineCharacter,
  type StoredCharacter,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** A callback export as a promise (no promise crosses a resource boundary; the lib wraps it on the caller's side). */
const ask = <T>(call: (done: (value: T) => void) => void): Promise<T> =>
  new Promise((resolve) => call(resolve));

/**
 * Characters by id through ai-core, loaded or not: a loaded one goes through its live state (memory, deltas), a
 * stored one is changed in the DB while ai-core holds it (it cannot load meanwhile). Writes answer `{ ok }` or
 * `{ ok: false, error }` with an ai-core lang key.
 */
export const characters = {
  /**
   * Moves a stored character's spawn point (a sleeping body that was carried away); ai-core writes it once no load
   * or unload save holds the character. False when the character is loaded or the values are wrong.
   */
  setOfflinePosition: (
    charId: number,
    position: { x: number; y: number; z: number; heading?: number },
  ): boolean => core.SetOfflinePosition(charId, position),
  /** Info, money, jobs, gangs, metadata and position of a character; null when unknown or deleted. */
  get: (charId: number): Promise<OfflineCharacter | null> =>
    ask((done) => core.GetOfflineCharacter(charId, done)),
  /**
   * Characters by a typed text, loaded or not: first / last name prefixes ("first last" too), citizenid, fivem /
   * license / discord id; 25 a page, newest first (`cursor` = the last page's `next`).
   */
  search: (text: string, cursor?: number): Promise<CharacterSearchPage> =>
    ask((done) => core.SearchCharacters(text, done, cursor)),
  /** The characters of an account id or of every account with a license (`license:abc` or `abc`). */
  ofUser: (user: number | string): Promise<StoredCharacter[]> =>
    ask((done) => core.GetCharactersOfUser(user, done)),
  /** Holders of a job, loaded or not, a page at a time (`after` = the last page's `next`). */
  jobMembers: (
    job: string,
    after?: number,
    limit?: number,
  ): Promise<MembersPage> =>
    ask((done) => core.GetJobMembers(job, done, after, limit)),
  gangMembers: (
    gang: string,
    after?: number,
    limit?: number,
  ): Promise<MembersPage> =>
    ask((done) => core.GetGangMembers(gang, done, after, limit)),
  /** Money of a character loaded or not, with a ledger row (`reason` defaults to the calling resource). */
  addMoney: (
    charId: number,
    account: string,
    amount: number,
    reason?: string,
  ): Promise<CharacterResult> =>
    ask((done) => core.AddOfflineMoney(charId, account, amount, reason, done)),
  /** Refused below zero unless the account type allows it. */
  removeMoney: (
    charId: number,
    account: string,
    amount: number,
    reason?: string,
  ): Promise<CharacterResult> =>
    ask((done) =>
      core.RemoveOfflineMoney(charId, account, amount, reason, done),
    ),
  setMoney: (
    charId: number,
    account: string,
    amount: number,
    reason?: string,
  ): Promise<CharacterResult> =>
    ask((done) => core.SetOfflineMoney(charId, account, amount, reason, done)),
  /** Adds or regrades a job under the panel's job rules. */
  setJob: (
    charId: number,
    job: string,
    grade: number,
  ): Promise<CharacterResult> =>
    ask((done) => core.SetOfflineJob(charId, job, grade, done)),
  removeJob: (charId: number, job: string): Promise<CharacterResult> =>
    ask((done) => core.RemoveOfflineJob(charId, job, done)),
  setGang: (
    charId: number,
    gang: string,
    grade: number,
  ): Promise<CharacterResult> =>
    ask((done) => core.SetOfflineGang(charId, gang, grade, done)),
  removeGang: (charId: number, gang: string): Promise<CharacterResult> =>
    ask((done) => core.RemoveOfflineGang(charId, gang, done)),
  /** One metadata value (null removes it). */
  setMeta: (
    charId: number,
    key: string,
    value: unknown,
  ): Promise<CharacterResult> =>
    ask((done) => core.SetOfflineMeta(charId, key, value, done)),
  /** Name, birth date, nationality, sex (sex only while not loaded), each checked like the creation form. */
  setInfo: (
    charId: number,
    patch: CharacterInfoPatch,
  ): Promise<CharacterResult> =>
    ask((done) => core.SetCharacterInfo(charId, patch, done)),
  /** Soft delete; refused while the character is loaded. */
  remove: (charId: number, by?: number | string): Promise<CharacterResult> =>
    ask((done) => core.DeleteCharacter(charId, by, done)),
  /** Seconds played by a loaded player (server id) or a character, loaded or not; null when unknown. */
  playTime: (target: number | { charId: number }): Promise<number | null> =>
    ask((done) => core.GetPlayTime(target, done)),
  /** Writes a loaded player's position and metadata now; false when not loaded. */
  save: (source: number): Promise<boolean> =>
    ask((done) => core.SavePlayer(source, done)),
  /** Turns a loaded player's paycheck off or on until the character unloads; false when not loaded. */
  setPaycheck: (source: number, on: boolean): boolean =>
    core.SetPaycheckEnabled(source, on),
  isPaid: (source: number): boolean => core.IsPaycheckEnabled(source),
};
