/** Player and character contracts shared by ai-core, its NUI and other resources. */

export type Sex = "male" | "female";

/** A character as other resources see it. */
export interface CharacterInfo {
  id: number;
  citizenid: string;
  slot: number;
  firstname: string;
  lastname: string;
  birthdate: string;
  sex: Sex;
}

/** A card on the character screen. */
export interface CharacterCard extends CharacterInfo {
  /** Already in the game on another client of the same account. */
  online: boolean;
  /** Primary job label, for the card. */
  job: string | null;
  cash: number;
  bank: number;
  lastPlayed: number | null;
}

export interface ScenePoint {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** The server's name and look on full-screen menus (panel setting). */
export interface Branding {
  name: string;
  subtitle: string;
  tagline: string;
  taglineSub: string;
  /** Background image of full-screen menus (files in ai-core's web/public/backgrounds). */
  background: "skyline" | "wet-drive";
}

export interface CharacterScreen {
  branding: Branding;
  slots: number;
  characters: CharacterCard[];
  canDelete: boolean;
  /** Where the preview ped stands and the camera looks from (panel setting). */
  scene: { ped: ScenePoint; camera: ScenePoint; fov: number };
}

export interface CreateCharacterInput {
  slot: number;
  firstname: string;
  lastname: string;
  /** YYYY-MM-DD */
  birthdate: string;
  sex: Sex;
}

/** Answer of the character screen actions: `ok`, or a lang key telling why not. */
export type CharacterActionResult = { ok: true } | { ok: false; error: string };

export interface JobMembership {
  job: string;
  grade: number;
}

export interface GangMembership {
  gang: string;
  grade: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
  model: string;
}

/** The local player's often read values, kept by ai-core's one watcher (lib `cache`); `false` = none. */
export interface PlayerCache {
  ped: number;
  playerId: number;
  serverId: number;
  vehicle: number | false;
  /** Seat in `vehicle` (-1 driver). */
  seat: number | false;
  /** Weapon hash in hand; `false` when unarmed. */
  weapon: number | false;
}

/** What ai-core pushes to a player's own client: one snapshot at load, then `(key, value)` deltas. */
export interface AiPlayerData {
  character: CharacterInfo | null;
  money: Record<string, number>;
  jobs: JobMembership[];
  duty: string | null;
  gangs: GangMembership[];
  activeGang: string | null;
}

export type NotificationKind = "success" | "error" | "info" | "warning";

/** A notification card (ai-core draws it); texts are already translated by the sender. */
export interface Notification {
  text: string;
  title?: string;
  kind: NotificationKind;
  /** Milliseconds on screen (default 4000). */
  duration?: number;
}
