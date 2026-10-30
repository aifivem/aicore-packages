/**
 * ai-core's appearance layer: a character's stored look and putting a look on a ped, through whichever clothing
 * script runs (ai-appearance, tgiann-clothing). `docs/compat/appearance.md`.
 */

/**
 * A look as the appearance layer hands it out: the ped model (hash) and the clothing script's own data, opaque to
 * everyone else (give it back to `ApplyAppearance` unchanged).
 */
export interface CharacterAppearance {
  model: number;
  data: unknown;
}

/** GlobalState key: the resource name of the clothing script behind the appearance layer (unset while none runs). */
export const APPEARANCE_STATE_KEY = "ai:appearance";

/** One clothing script on ai-core's server (`resource/server/appearance/`). */
export interface AppearanceAdapter {
  resource: string;
  version?: string;
  /** The stored look of a character (loaded or not), null when it has none. */
  load(charId: number): Promise<CharacterAppearance | null>;
}

/** The same clothing script on ai-core's client (`resource/client/appearance/`). */
export interface AppearanceClientAdapter {
  resource: string;
  version?: string;
  /** Puts the script's look data on a ped whose model already matches. */
  apply(ped: number, data: unknown): void;
  /** The look data a ped wears now, null when the script cannot tell. */
  read?(ped: number): unknown;
}

/** A look from another resource or the network: a model hash and some data, else null. */
export function toCharacterAppearance(
  value: unknown,
): CharacterAppearance | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const { model, data } = value as { model?: unknown; data?: unknown };
  return Number.isInteger(model) && model !== 0 && data != null
    ? { model: model as number, data }
    : null;
}
