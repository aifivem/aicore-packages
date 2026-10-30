import type { DataSpec, WidgetSpec } from "@aicore-fivem/shared";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** An NPC standing at a place (a shopkeeper, a clerk): its model, an optional idle scenario and where it stands. */
export interface PlacePed {
  model: string;
  scenario?: string;
  coords?: { x: number; y: number; z: number; heading: number };
}

/** Idle scenarios offered in the panel ("" = stands still). */
const SCENARIOS = [
  "",
  "WORLD_HUMAN_STAND_IMPATIENT",
  "WORLD_HUMAN_CLIPBOARD",
  "WORLD_HUMAN_STAND_MOBILE",
  "WORLD_HUMAN_AA_COFFEE",
  "WORLD_HUMAN_SMOKING",
  "WORLD_HUMAN_GUARD_STAND",
  "WORLD_HUMAN_COP_IDLES",
  "WORLD_HUMAN_HANG_OUT_STREET",
] as const;

/** The data spec of a place's `ped` section (optional: a place without one has no NPC). */
export const PLACE_PED_SPEC: DataSpec = {
  type: "object",
  optional: true,
  fields: {
    model: { type: "text", max: 64, optional: true },
    scenario: { type: "enum", values: [...SCENARIOS], optional: true },
    coords: { type: "vec4", optional: true },
  },
};

/** The panel fields of a place's NPC (labels and hints are ai-core's generic panel texts). */
export function placePedFields(path = "ped"): WidgetSpec[] {
  return [
    {
      widget: "model",
      kind: "ped",
      path: `${path}.model`,
      label: "ADMIN_F_PED_MODEL",
      hint: "ADMIN_H_PED_MODEL",
      placeholder: "ADMIN_PH_PED_MODEL",
    },
    {
      widget: "select",
      path: `${path}.scenario`,
      label: "ADMIN_F_PED_SCENARIO",
      hint: "ADMIN_H_PED_SCENARIO",
      options: SCENARIOS.map((value) => ({
        value,
        label: value ? `ADMIN_O_SCENARIO_${value}` : "ADMIN_O_SCENARIO_NONE",
      })),
    },
    {
      widget: "point",
      path: `${path}.coords`,
      heading: true,
      ground: true,
      label: "ADMIN_F_PED_POSITION",
      hint: "ADMIN_H_PED_POSITION",
    },
  ];
}

/** A place's NPC from panel data; null when it has no model (no NPC). */
export function readPlacePed(value: unknown): PlacePed | null {
  if (
    !isRecord(value) ||
    typeof value.model !== "string" ||
    !value.model.trim()
  )
    return null;
  const c = value.coords;
  const coords =
    isRecord(c) &&
    [c.x, c.y, c.z, c.heading].every((n) => typeof n === "number")
      ? {
          x: Number(c.x),
          y: Number(c.y),
          z: Number(c.z),
          heading: Number(c.heading),
        }
      : undefined;
  return {
    model: value.model.trim(),
    scenario:
      typeof value.scenario === "string" && value.scenario
        ? value.scenario
        : undefined,
    coords,
  };
}
