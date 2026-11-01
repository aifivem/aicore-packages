import type { CharacterAppearance } from "../appearance";

/** ai-core's layers over other scripts: prison, weather and time, medical, appearance, stress (part of `AiCoreServerExports`). */
export type CoreLayerServerExports = {
  /** Prison layer (lib `prison`): the first running prison script answers. */
  JailPlayer(source: number, minutes: number, by?: number): boolean;
  ReleasePlayer(source: number): boolean;
  GetJailTime(source: number): number;

  /** Time and weather of whatever weather script runs (the qb-weathersync contract); null / false while none runs. */
  GetWeather(): string | null;
  SetWeather(type: string): boolean;
  GetTime(): { hour: number; minute: number } | null;
  SetTime(hour: number, minute?: number): boolean;
  SetBlackout(on: boolean): boolean;
  FreezeTime(on: boolean): boolean;

  /** The death / ambulance script ai-core's medical layer forwards to, or null. */
  GetMedicalSystem(): string | null;
  /** Gets a downed player up where they lie; false when not down or no death script runs. */
  RevivePlayer(source: number): boolean;
  /** Full health for a player who is not down; false when no death script runs. */
  HealPlayer(source: number): boolean;
  IsPlayerDead(source: number): boolean;

  /** The clothing script ai-core's appearance layer reads looks from (ai-appearance, tgiann-clothing), or null. */
  GetAppearanceSystem(): string | null;
  /**
   * Reads a character's stored look (loaded or not) from the active clothing script; `done` gets it, or null when the
   * character has none or no clothing script runs. A callback, not a promise: no promise crosses a resource boundary.
   */
  GetCharacterAppearance(
    charId: number,
    done: (look: CharacterAppearance | null) => void,
  ): void;

  /** The HUD ai-core's stress layer gives stress to (ai-hud, a QB-style HUD), or null. */
  GetStressSystem(): string | null;
  /** Adds stress to a player (a negative amount relieves it) through whichever HUD keeps it; false without one. */
  AddStress(source: number, amount: number): boolean;
  /** Fills a player's hunger and thirst through the HUD that keeps them (metadata without one); false when not loaded. */
  RefillNeeds(source: number): boolean;
  /** Adds hunger or thirst (0-100 scale, a negative amount takes it away) through the same HUD; false when refused. */
  AddNeed(source: number, need: "hunger" | "thirst", amount: number): boolean;
};
