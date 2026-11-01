import type {
  BanEdit,
  BanInfo,
  BanListPage,
  BanQuery,
  BanRecord,
  BansPage,
  BanTarget,
} from "../bans";
import type {
  CharacterInfoPatch,
  CharacterResult,
  CharacterSearchPage,
  MembersPage,
  OfflineCharacter,
  StoredCharacter,
} from "../characters";
import type { GangDefinition, JobDefinition } from "../definitions";

/** ai-core's server exports for stored characters, bans, script job / gang definitions and player extras. */
export type CharacterServerExports = {
  /** A character with money, memberships, metadata and position; loaded ones answer from memory. `done(null)`: unknown or deleted. */
  GetOfflineCharacter(
    charId: number,
    done: (character: OfflineCharacter | null) => void,
  ): void;
  /**
   * Characters by a typed text, loaded or not (the admin panel's rules: first / last name prefixes, "first last",
   * citizenid, fivem / license / discord id), 25 a page newest first (`cursor` = the last page's `next`).
   */
  SearchCharacters(
    text: string,
    done: (page: CharacterSearchPage) => void,
    cursor?: number,
  ): void;
  /** The characters of an account by its id or a license (`license:abc` or `abc`), by slot. */
  GetCharactersOfUser(
    user: number | string,
    done: (characters: StoredCharacter[]) => void,
  ): void;
  /** Holders of a job, loaded or not, by character id (`after` = the last page's `next`; `limit` 1-500, default 100). */
  GetJobMembers(
    job: string,
    done: (page: MembersPage) => void,
    after?: number,
    limit?: number,
  ): void;
  GetGangMembers(
    gang: string,
    done: (page: MembersPage) => void,
    after?: number,
    limit?: number,
  ): void;

  /** Money of a character loaded or not (a loaded one goes through its wallet). `amount` a whole number > 0. */
  AddOfflineMoney(
    charId: number,
    account: string,
    amount: number,
    reason?: string,
    done?: (result: CharacterResult) => void,
  ): void;
  /** Refused below zero (unless the account type allows it), like the live path. */
  RemoveOfflineMoney(
    charId: number,
    account: string,
    amount: number,
    reason?: string,
    done?: (result: CharacterResult) => void,
  ): void;
  SetOfflineMoney(
    charId: number,
    account: string,
    amount: number,
    reason?: string,
    done?: (result: CharacterResult) => void,
  ): void;
  /** Adds or regrades a job (`maxJobs` / `multiJob` rules of the panel); the unemployed job is never stored. */
  SetOfflineJob(
    charId: number,
    job: string,
    grade: number,
    done?: (result: CharacterResult) => void,
  ): void;
  RemoveOfflineJob(
    charId: number,
    job: string,
    done?: (result: CharacterResult) => void,
  ): void;
  SetOfflineGang(
    charId: number,
    gang: string,
    grade: number,
    done?: (result: CharacterResult) => void,
  ): void;
  RemoveOfflineGang(
    charId: number,
    gang: string,
    done?: (result: CharacterResult) => void,
  ): void;
  /** One metadata value (null removes the key); the value must be JSON. */
  SetOfflineMeta(
    charId: number,
    key: string,
    value: unknown,
    done?: (result: CharacterResult) => void,
  ): void;
  /** Name, birth date, nationality, sex (sex only while not loaded: the ped model follows it). */
  SetCharacterInfo(
    charId: number,
    patch: CharacterInfoPatch,
    done?: (result: CharacterResult) => void,
  ): void;
  /** Soft delete (the row stays for logs); refused while the character is loaded. Fires `CORE.characterDeletedEvent`. */
  DeleteCharacter(
    charId: number,
    by?: number | string,
    done?: (result: CharacterResult) => void,
  ): void;

  /** Bans an online player (dropped at once) or identifiers; `minutes` left out = permanent. False on wrong arguments. */
  BanPlayer(
    target: BanTarget,
    reason: string,
    minutes?: number,
    by?: number | string,
    done?: (banId: number | null) => void,
  ): boolean;
  /** Lifts an active ban; false when no active ban has that id. */
  UnbanPlayer(banId: number, by?: number | string): boolean;
  IsBanned(target: BanTarget): BanInfo | null;
  /** Active bans, newest first, 50 per page (page 1 first). */
  GetBans(page?: number): BansPage;
  /** Every ban (active, expired, revoked) matching any identifier of the target, newest first, at most 100. */
  GetBanHistory(target: BanTarget, done: (bans: BanRecord[]) => void): void;
  /** A page of bans by state and search (`BanQuery`); `done(null)` on a wrong query or a failed read. */
  ListBans(query: BanQuery, done: (page: BanListPage | null) => void): void;
  /** Changes an active ban's reason and / or end; false when no active ban has that id or the edit is wrong. */
  EditBan(banId: number, edit: BanEdit, by?: number | string): boolean;

  /** A job of the calling resource (gone when it stops); refused (lang key) when the panel has that job or another resource owns it. */
  RegisterJobDefinition(
    name: string,
    definition: JobDefinition,
  ): CharacterResult;
  /** Removes a job the calling resource registered; false otherwise. */
  RemoveJobDefinition(name: string): boolean;
  RegisterGangDefinition(
    name: string,
    definition: GangDefinition,
  ): CharacterResult;
  RemoveGangDefinition(name: string): boolean;

  /** Turns a loaded player's paycheck off or on (runtime, until the character unloads); false when not loaded. */
  SetPaycheckEnabled(source: number, on: boolean): boolean;
  IsPaycheckEnabled(source: number): boolean;
  /**
   * Played seconds (saved metadata `playtime` plus the running session): a server id answers at once (null when not
   * loaded); `{ charId }` answers at once while loaded, else returns null and `done` gets the stored value.
   */
  GetPlayTime(
    target: number | { charId: number },
    done?: (seconds: number | null) => void,
  ): number | null;
  /** Saves a loaded player's position and metadata now and waits for their queued writes; `done(false)` when not loaded. */
  SavePlayer(source: number, done?: (ok: boolean) => void): void;
};
