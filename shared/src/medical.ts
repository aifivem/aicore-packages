/** One death / ambulance script behind ai-core's medical layer (`resource/server/medical/`). */
export interface MedicalAdapter {
  resource: string;
  version?: string;
  /** False when the player was not down. */
  revive(source: number): boolean;
  heal(source: number): void;
  isDead(source: number): boolean;
}

/** A death script's client half for ai-core's client medical layer. */
export interface MedicalClientAdapter {
  resource: string;
  /** The local player is down (dead or last stand). */
  isDead(): boolean;
  /** Calls `changed` when that may have changed (a state bag, player data); registered once at start. */
  watch(changed: () => void): void;
}
