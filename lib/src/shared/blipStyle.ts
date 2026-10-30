import type { DataSpec } from "@aicore-fivem/shared";
import { int, num, record } from "./read";

/** A blip's style as the panel's `blip` widget stores it. */
export interface BlipStyle {
  sprite: number;
  color: number;
  scale: number;
}

/** The panel data spec of a blip style's fields (`{ type: "object", fields: BLIP_STYLE_FIELDS }`). */
export const BLIP_STYLE_FIELDS: Record<string, DataSpec> = {
  sprite: { type: "number", min: 0, max: 1000, integer: true },
  color: { type: "number", min: 0, max: 100, integer: true },
  scale: { type: "number", min: 0.3, max: 2 },
};

/** A blip style from panel data; each missing or bad part from `fallback` (sprite 0-1000, colour 0-100, scale 0.3-2). */
export function readBlipStyle(value: unknown, fallback: BlipStyle): BlipStyle {
  const v = record(value);
  return {
    sprite: int(v.sprite, fallback.sprite, 0, 1000),
    color: int(v.color, fallback.color, 0, 100),
    scale: num(v.scale, fallback.scale, 0.3, 2),
  };
}
