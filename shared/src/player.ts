/** Player and character contracts shared by ai-core, its NUI and other resources. */

export type Sex = "male" | "female"

/** A character as other resources see it. */
export interface CharacterInfo {
  id: number
  citizenid: string
  slot: number
  firstname: string
  lastname: string
  birthdate: string
  sex: Sex
}

/** A card on the character screen. */
export interface CharacterCard extends CharacterInfo {
  /** Already in the game on another client of the same account. */
  online: boolean
  /** Primary job label, for the card. */
  job: string | null
  cash: number
  bank: number
  lastPlayed: number | null
}

export interface ScenePoint {
  x: number
  y: number
  z: number
  heading: number
}

/** One place in the character screen scene: a character stands there, the camera frames it when it is picked. */
export interface SceneSpot {
  /** The ped's position (its root, as `GetEntityCoords` reads it) and heading. */
  ped: ScenePoint
  /** Idle animation dictionary and clip ("" = none). */
  anim: string
  clip: string
  /** Metres from the look-at point to the camera. */
  camDistance: number
  /** Camera height as a slope (0 = level with the look-at point, 0.5 = up by half the distance). */
  camHeight: number
  /** Degrees around the ped from its front (0 = straight in front). */
  camAngle: number
  /** Metres above the ped's root the camera looks at. */
  targetHeight: number
  /** Degrees the camera slowly swings left and right (0 = still). */
  sway: number
  /** Background blur (depth of field): in focus from `blurNear` to `blurFar` metres, strength 0-100. */
  blur: boolean
  blurNear: number
  blurFar: number
  blurStrength: number
}

/** The in-world scene behind the character screen (panel setting). */
export interface CharacterScene {
  /** Camera field of view in degrees. */
  fov: number
  /** Local time and weather while the screen is open (`enabled: false` keeps the server's). */
  time: { enabled: boolean; hour: number; minute: number; weather: string }
  /** Spot N holds the character of slot N. */
  spots: SceneSpot[]
}

/** The server's name and look on full-screen menus (panel setting). */
export interface Branding {
  name: string
  subtitle: string
  tagline: string
  taglineSub: string
  /** Background image of full-screen menus (files in ai-core's web/public/backgrounds); the character screen shows it only when its scene cannot be built. */
  background: "skyline" | "wet-drive"
}

export interface CharacterScreen {
  branding: Branding
  slots: number
  characters: CharacterCard[]
  canDelete: boolean
  /** Where the characters stand and how the camera frames them (panel setting). */
  scene: CharacterScene
}

export interface CreateCharacterInput {
  slot: number
  firstname: string
  lastname: string
  /** YYYY-MM-DD */
  birthdate: string
  sex: Sex
}

/** Answer of the character screen actions: `ok`, or a lang key telling why not. */
export type CharacterActionResult = { ok: true } | { ok: false; error: string }

export interface JobMembership {
  job: string
  grade: number
}

export interface GangMembership {
  gang: string
  grade: number
}

export interface SpawnPoint {
  x: number
  y: number
  z: number
  heading: number
  model: string
}

/** The local player's often read values, kept by ai-core's one watcher (lib `cache`); `false` = none. */
export interface PlayerCache {
  ped: number
  playerId: number
  serverId: number
  vehicle: number | false
  /** Seat in `vehicle` (-1 driver). */
  seat: number | false
  /** Weapon hash in hand; `false` when unarmed. */
  weapon: number | false
}

/** What ai-core pushes to a player's own client: one snapshot at load, then `(key, value)` deltas. */
export interface AiPlayerData {
  character: CharacterInfo | null
  money: Record<string, number>
  jobs: JobMembership[]
  duty: string | null
  gangs: GangMembership[]
  activeGang: string | null
}

export type NotificationKind = "success" | "error" | "info" | "warning"

/** A notification card (ai-core draws it); texts are already translated by the sender. */
export interface Notification {
  text: string
  title?: string
  kind: NotificationKind
  /** Milliseconds on screen (default 4000). */
  duration?: number
}
