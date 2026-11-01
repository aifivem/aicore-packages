/** What killed a player, from the weapon hash FXServer reports. */
export type DeathCause =
  | "firearm"
  | "melee"
  | "explosion"
  | "fire"
  | "vehicle"
  | "fall"
  | "drown"
  | "animal"
  | "other";

/** Who killed a player: another player, an NPC (or its vehicle), the player themselves, or the world (a fall, drowning). */
export type DeathKiller = "player" | "npc" | "self" | "world";

/** A point in the world. */
export interface DeathPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * The details of a player's death, built by ai-core on the server from FXServer's `onPedDeath` and the synced
 * entities (never from a client's report): the 4th argument of `CORE.playerDiedEvent (source, killer, weaponHash, info)`.
 */
export interface DeathInfo {
  /** The killer's server id when another player killed them (also `killer`, the event's 2nd argument), else null. */
  killer: number | null;
  killedBy: DeathKiller;
  cause: DeathCause;
  /** The weapon hash FXServer reported (`WEAPON_FALL`, `WEAPON_RUN_OVER_BY_CAR`, a gun...). */
  weapon: number;
  /** Where the player died (rounded to 0.1 m). */
  coords: DeathPoint;
  /** Where the killing ped was (a player or an NPC), else null. */
  killerCoords: DeathPoint | null;
  /** Metres between the two (rounded to 0.1 m), else null. */
  distance: number | null;
  /** The player sat in a vehicle when they died. */
  inVehicle: boolean;
  /** The killer drove or sat in a vehicle (a drive-by, a run over). */
  killerInVehicle: boolean;
}
