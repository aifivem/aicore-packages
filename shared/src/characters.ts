import type { ActionResult } from "./action";
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

/** A character a search found, loaded or not. */
export interface CharacterMatch {
  charId: number;
  citizenid: string;
  firstname: string;
  lastname: string;
  /** The player's server id while the character is loaded, else null. */
  source: number | null;
}

/** A page of a character search, newest characters first; `next` is the `cursor` of the next page, null on the last. */
export interface CharacterSearchPage {
  characters: CharacterMatch[];
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
