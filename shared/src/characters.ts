import type { ActionResult } from "./action";
import type { GangDefinition, JobDefinition } from "./exports";
import type { CharacterInfo, GangMembership, JobMembership } from "./player";

/** A character with its account id (`ai_core_users.id`). */
export type CharacterWithUser = CharacterInfo & { userId: number };

/** A stored character of an account (`GetCharactersOfUser`); `lastPlayed` in epoch ms, null = never played. */
export interface StoredCharacter extends CharacterWithUser {
  lastPlayed: number | null;
}

/** Everything ai-core keeps about one character, loaded or not (`GetOfflineCharacter`). */
export interface OfflineCharacter {
  info: CharacterWithUser;
  /** Balance by account type. */
  money: Record<string, number>;
  jobs: JobMembership[];
  gangs: GangMembership[];
  activeGang: string | null;
  metadata: Record<string, unknown>;
  position: { x: number; y: number; z: number; heading: number } | null;
  /** Last save (epoch ms); null = never played. */
  lastSeen: number | null;
  /** The player's server id while the character is loaded, else null. */
  source: number | null;
}

/** One holder of a job or gang (`GetJobMembers` / `GetGangMembers`), loaded or not. */
export interface GroupMember {
  charId: number;
  citizenid: string;
  firstname: string;
  lastname: string;
  grade: number;
  /** The player's server id while the character is loaded, else null. */
  source: number | null;
}

/** A page of members by character id; `next` is the `after` of the next page, null on the last one. */
export interface MembersPage {
  members: GroupMember[];
  next: number | null;
}

/** What a character write answers: ok, or a lang key of ai-core (`locales/en.json`). */
export type CharacterResult = ActionResult;

/** The character fields `SetCharacterInfo` changes; each one is checked like the creation form. */
export interface CharacterInfoPatch {
  firstname?: string;
  lastname?: string;
  birthdate?: string;
  nationality?: string;
  sex?: "male" | "female";
}

/** Identifier types a ban matches, as the connection gate sees them (values without the `type:` prefix). */
export const BAN_IDENTIFIERS = ["fivem", "license", "discord", "ip"] as const;
export type BanIdentifier = (typeof BAN_IDENTIFIERS)[number];

/** An active ban (`IsBanned`, `GetBans`). Times in epoch ms; `expires` null = permanent. */
export interface BanInfo {
  /** 0 until the row is written (the ban already holds). */
  id: number;
  identifiers: Partial<Record<BanIdentifier, string>>;
  /** The player's name when banned. */
  name: string;
  reason: string;
  by: string;
  created: number;
  expires: number | null;
}

/** Who to ban or check: an online player's server id, or identifiers (`license:abc` or `abc` under its type). */
export type BanTarget =
  number | { identifiers: Partial<Record<BanIdentifier, string>> };

/** One page of active bans, newest first. */
export interface BansPage {
  bans: BanInfo[];
  total: number;
}

/** ai-core's server exports for stored characters, bans, script job / gang definitions and player extras. */
export type CharacterServerExports = {
  /** A character with money, memberships, metadata and position; loaded ones answer from memory. `done(null)`: unknown or deleted. */
  GetOfflineCharacter(
    charId: number,
    done: (character: OfflineCharacter | null) => void,
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
