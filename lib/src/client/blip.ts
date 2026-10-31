/** Map blips with a name, kept per id so a script can rebuild them when its panel data changes. */

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BlipOptions {
  coords: Vec3;
  /** Shown in the map legend (already translated); without it the game's default name for the sprite. */
  label?: string;
  sprite: number;
  color: number;
  /** Default 0.8. */
  scale?: number;
  /** Only on the minimap when close (default true). */
  shortRange?: boolean;
  /** `SetBlipDisplay` (default 4: map and minimap). */
  display?: number;
  /** A GPS route to the blip: true in the game's route colour, a number for that route colour. */
  route?: boolean | number;
}

import type { BlipStyle } from "../shared/blipStyle";

export type { BlipStyle };

const LABEL = `AI_BLIP_${GetCurrentResourceName()}`;
AddTextEntry(LABEL, "~a~");

/** Creates a named blip at a point and returns its handle (`RemoveBlip` it, or use `Blips`). */
export function createBlip(options: BlipOptions): number {
  const { x, y, z } = options.coords;
  const blip = AddBlipForCoord(x, y, z);
  SetBlipSprite(blip, options.sprite);
  SetBlipColour(blip, options.color);
  SetBlipScale(blip, options.scale ?? 0.8);
  SetBlipDisplay(blip, options.display ?? 4);
  SetBlipAsShortRange(blip, options.shortRange ?? true);
  if (options.label !== undefined) {
    BeginTextCommandSetBlipName(LABEL);
    AddTextComponentSubstringPlayerName(options.label);
    EndTextCommandSetBlipName(blip);
  }
  if (options.route !== undefined && options.route !== false) {
    SetBlipRoute(blip, true);
    if (options.route !== true) SetBlipRouteColour(blip, options.route);
  }
  return blip;
}

/** A script's blips by id: `add` replaces a blip with the same id, `clear` removes them all (a panel rebuild). */
export class Blips {
  private readonly blips = new Map<string, number>();

  add(id: string, options: BlipOptions): number {
    this.remove(id);
    const blip = createBlip(options);
    this.blips.set(id, blip);
    return blip;
  }

  get(id: string): number | undefined {
    return this.blips.get(id);
  }

  remove(id: string): void {
    const blip = this.blips.get(id);
    if (blip === undefined) return;
    RemoveBlip(blip);
    this.blips.delete(id);
  }

  clear(): void {
    for (const blip of this.blips.values()) RemoveBlip(blip);
    this.blips.clear();
  }
}
