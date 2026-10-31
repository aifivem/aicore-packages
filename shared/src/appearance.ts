/**
 * ai-core's appearance layer: a character's stored look, putting a look on a ped, the clothing menus and job outfits,
 * through whichever clothing script runs (ai-appearance, tgiann-clothing). `docs/compat/appearance.md`.
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
  /** Opens one of the script's menus for the local player; absent or false when it has no such menu. */
  openMenu?(menu: ClothingMenu): boolean;
  /** Puts a job outfit on the local player until `reloadSkin` (not saved as the player's own look). */
  wearOutfit?(outfit: JobOutfit): void;
  /** Puts the local player's saved look back on (takes a job outfit off). */
  reloadSkin?(): void;
}

/** A clothing script menu other scripts open: the clothing shop, the barber, the player's saved outfits. */
export type ClothingMenu = "clothing" | "barber" | "outfits";
export const CLOTHING_MENUS: readonly ClothingMenu[] = [
  "clothing",
  "barber",
  "outfits",
];

/** One piece of a job outfit: a component or prop id, its collection name (`""` = base game) and local index. */
export interface OutfitPiece {
  id: number;
  collection: string;
  /** Local drawable index in the collection; -1 takes a prop off. */
  index: number;
  texture: number;
}

/** A job outfit (uniform) for the freemode model the player wears: only the listed pieces change. */
export interface JobOutfit {
  components: OutfitPiece[];
  props: OutfitPiece[];
}

function toPieces(value: unknown, max: number, prop: boolean): OutfitPiece[] {
  if (!Array.isArray(value)) return [];
  const pieces: OutfitPiece[] = [];
  for (const v of value as unknown[]) {
    if (typeof v !== "object" || v === null) continue;
    const { id, collection, index, texture } = v as Record<string, unknown>;
    if (
      Number.isInteger(id) &&
      (id as number) >= 0 &&
      (id as number) <= max &&
      typeof collection === "string" &&
      collection.length <= 64 &&
      Number.isInteger(index) &&
      (index as number) >= (prop ? -1 : 0) &&
      (index as number) < 1024
    )
      pieces.push({
        id: id as number,
        collection,
        index: index as number,
        texture:
          Number.isInteger(texture) && (texture as number) >= 0
            ? (texture as number)
            : 0,
      });
  }
  return pieces;
}

/** A job outfit from another resource: valid pieces only (components 0-11, props 0-13), null when none is left. */
export function toJobOutfit(value: unknown): JobOutfit | null {
  if (typeof value !== "object" || value === null) return null;
  const { components, props } = value as Record<string, unknown>;
  const outfit = {
    components: toPieces(components, 11, false),
    props: toPieces(props, 13, true),
  };
  return outfit.components.length || outfit.props.length ? outfit : null;
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
