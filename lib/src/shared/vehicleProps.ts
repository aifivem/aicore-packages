/**
 * A vehicle's look and tuning as plain data (colours, mods, extras, livery, wheels, neon, tint, plate), read from and
 * written to an entity. Stored JSON carries `v: 1`.
 */
export interface VehicleProps {
  v: 1;
  model: number;
  plate: string;
  plateIndex: number;
  colors: [number, number];
  extraColors: [number, number];
  customPrimary: [number, number, number] | null;
  customSecondary: [number, number, number] | null;
  wheelType: number;
  windowTint: number;
  livery: number;
  /** Mod type -> index (-1 = stock); toggle mods (turbo 18, xenon 22, ...) as 0 / 1. */
  mods: Record<number, number>;
  xenonColor: number;
  neon: [boolean, boolean, boolean, boolean];
  neonColor: [number, number, number];
  tyreSmoke: [number, number, number];
  extras: Record<number, boolean>;
  dirt: number;
  engineHealth: number;
  bodyHealth: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nums = (v: unknown, n: number): number[] | null => (Array.isArray(v) && v.length === n && v.every((x) => typeof x === "number") ? v : null);

/** Stored or received props, checked; null when the shape is not ours. */
export function toVehicleProps(v: unknown): VehicleProps | null {
  if (!isObj(v) || v.v !== 1 || typeof v.model !== "number" || typeof v.plate !== "string") return null;
  const colors = nums(v.colors, 2);
  const extraColors = nums(v.extraColors, 2);
  const neonColor = nums(v.neonColor, 3);
  const tyreSmoke = nums(v.tyreSmoke, 3);
  if (!colors || !extraColors || !neonColor || !tyreSmoke || !isObj(v.mods) || !isObj(v.extras) || !Array.isArray(v.neon)) return null;
  const mods: Record<number, number> = {};
  for (const [k, x] of Object.entries(v.mods)) if (typeof x === "number") mods[Number(k)] = x;
  const extras: Record<number, boolean> = {};
  for (const [k, x] of Object.entries(v.extras)) if (typeof x === "boolean") extras[Number(k)] = x;
  const n = (x: unknown, d: number) => (typeof x === "number" ? x : d);
  const rgb = (x: unknown) => nums(x, 3) as [number, number, number] | null;
  return {
    v: 1,
    model: v.model,
    plate: v.plate.slice(0, 8),
    plateIndex: n(v.plateIndex, 0),
    colors: [colors[0] ?? 0, colors[1] ?? 0],
    extraColors: [extraColors[0] ?? 0, extraColors[1] ?? 0],
    customPrimary: rgb(v.customPrimary),
    customSecondary: rgb(v.customSecondary),
    wheelType: n(v.wheelType, 0),
    windowTint: n(v.windowTint, -1),
    livery: n(v.livery, -1),
    mods,
    xenonColor: n(v.xenonColor, 255),
    neon: [0, 1, 2, 3].map((i) => v.neon instanceof Array && v.neon[i] === true) as VehicleProps["neon"],
    neonColor: [neonColor[0] ?? 255, neonColor[1] ?? 0, neonColor[2] ?? 255],
    tyreSmoke: [tyreSmoke[0] ?? 255, tyreSmoke[1] ?? 255, tyreSmoke[2] ?? 255],
    extras,
    dirt: n(v.dirt, 0),
    engineHealth: n(v.engineHealth, 1000),
    bodyHealth: n(v.bodyHealth, 1000),
  };
}
