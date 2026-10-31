import { onStop } from "../fivem/byResource";
import { callExport } from "../fivem/exports";
import type { Vec3 } from "../shared/vec";

/**
 * The target scripts lib `Points` put their options on, one adapter each, in the order they win when several run
 * (`docs/compat/target.md`). The calls run in the resource that owns the points: every target ties an option's
 * functions to the calling resource and drops them when it stops, so they never go through ai-core.
 */

/** One target option in the lib's terms; each adapter turns it into its script's shape. */
export interface TargetOption {
  /** Unique across resources (`<resource>:<prompt id>`): some targets remove by it from one shared list. */
  name: string;
  label: string;
  icon?: string;
  /** How close the player must be, in metres. */
  distance: number;
  canInteract(entity: number): boolean;
  onSelect(entity: number): void;
}

/** The calls `Points` make on a target script; any of them throws "No such export" while that script loads. */
export interface TargetAdapter {
  /** False when it cannot take an option at a bare point from JavaScript (it needs a Lua vector3): such points stay prompts. */
  readonly coords: boolean;
  /** An option on a spot `radius` metres wide at `coords`; returns the handle `removeZone` takes. */
  addSphere(coords: Vec3, radius: number, option: TargetOption): unknown;
  removeZone(handle: unknown, option: TargetOption): void;
  addLocalEntity(entity: number, option: TargetOption): void;
  removeLocalEntity(entity: number, option: TargetOption): void;
  addModels(models: Array<string | number>, option: TargetOption): void;
  removeModels(models: Array<string | number>, option: TargetOption): void;
  addGlobalVehicle(option: TargetOption): void;
  removeGlobalVehicle(option: TargetOption): void;
}

export interface Target {
  /** The resource whose started state picks this target. */
  resource: string;
  adapter: TargetAdapter;
}

const entityOf = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "object" && value !== null
      ? entityOf(Reflect.get(value, "entity"))
      : 0;

/** A Font Awesome class: `store` becomes `fa-solid fa-store`, a full class stays. */
const faClass = (icon: string | undefined): string | undefined =>
  icon === undefined || icon.includes("fa-") ? icon : `fa-solid fa-${icon}`;

/** The ox_target option shape (sleepless_interact takes the same). */
const oxOption = (o: TargetOption) => ({
  name: o.name,
  label: o.label,
  icon: faClass(o.icon),
  distance: o.distance,
  canInteract: (entity: unknown) => o.canInteract(entityOf(entity)),
  onSelect: (data: unknown) => o.onSelect(entityOf(data)),
});

/** The ox_target API, answered under `name` (ox_target, ai-target, tgiann-target and tgiann-radialmenu-target). */
function oxApi(name: string): TargetAdapter {
  const call = (fn: string, ...args: unknown[]) =>
    callExport(name, fn, ...args);
  return {
    coords: true,
    addSphere: (coords, radius, o) =>
      call("addSphereZone", { coords, radius, options: [oxOption(o)] }),
    removeZone: (id) => void call("removeZone", id),
    addLocalEntity: (entity, o) =>
      void call("addLocalEntity", entity, [oxOption(o)]),
    removeLocalEntity: (entity, o) =>
      void call("removeLocalEntity", entity, o.name),
    addModels: (models, o) => void call("addModel", models, [oxOption(o)]),
    removeModels: (models, o) => void call("removeModel", models, o.name),
    addGlobalVehicle: (o) => void call("addGlobalVehicle", [oxOption(o)]),
    removeGlobalVehicle: (o) => void call("removeGlobalVehicle", o.name),
  };
}

/** sleepless_interact 2.x own API (`client/api.lua`): options at coordinates instead of zones, the ox option shape. */
const sleeplessInteract = ((): TargetAdapter => {
  const call = (fn: string, ...args: unknown[]) =>
    callExport("sleepless_interact", fn, ...args);
  return {
    coords: true,
    addSphere: (coords, _radius, o) => call("addCoords", coords, [oxOption(o)]),
    removeZone: (id, o) => void call("removeCoords", id, o.name),
    addLocalEntity: (entity, o) =>
      void call("addLocalEntity", entity, [oxOption(o)]),
    removeLocalEntity: (entity, o) =>
      void call("removeLocalEntity", entity, o.name),
    addModels: (models, o) => void call("addModel", models, [oxOption(o)]),
    removeModels: (models, o) => void call("removeModel", models, o.name),
    addGlobalVehicle: (o) => void call("addGlobalVehicle", [oxOption(o)]),
    removeGlobalVehicle: (o) => void call("removeGlobalVehicle", o.name),
  };
})();

/**
 * qb-target 5.x (`registration.lua`): options keyed by their label, zones by a global name. It keeps a stopped
 * resource's options (with dead function references), so this resource takes its own off when it stops.
 */
const qbTarget = ((): TargetAdapter => {
  const call = (fn: string, ...args: unknown[]) =>
    callExport("qb-target", fn, ...args);
  const live = new Map<string, () => void>();
  onStop(() => {
    for (const remove of live.values())
      try {
        remove();
      } catch {
        // qb-target stopped first: nothing left to take off.
      }
  });
  const keep = (key: string, remove: () => void) => live.set(key, remove);
  const drop = (key: string) => {
    live.get(key)?.();
    live.delete(key);
  };
  const params = (o: TargetOption) => ({
    distance: o.distance,
    options: [
      {
        label: o.label,
        icon: faClass(o.icon),
        action: (entity: unknown) => o.onSelect(entityOf(entity)),
        canInteract: (entity: unknown) => o.canInteract(entityOf(entity)),
      },
    ],
  });
  return {
    coords: true,
    addSphere: (coords, radius, o) => {
      call(
        "AddCircleZone",
        o.name,
        coords,
        radius,
        { name: o.name, useZ: true, debugPoly: false },
        params(o),
      );
      keep(`z:${o.name}`, () => call("RemoveZone", o.name));
      return o.name;
    },
    removeZone: (_name, o) => drop(`z:${o.name}`),
    addLocalEntity: (entity, o) => {
      call("AddTargetEntity", entity, params(o));
      keep(`e:${entity}:${o.name}`, () =>
        call("RemoveTargetEntity", entity, o.label),
      );
    },
    removeLocalEntity: (entity, o) => drop(`e:${entity}:${o.name}`),
    addModels: (models, o) => {
      call("AddTargetModel", models, params(o));
      keep(`m:${o.name}`, () => call("RemoveTargetModel", models, o.label));
    },
    removeModels: (_models, o) => drop(`m:${o.name}`),
    addGlobalVehicle: (o) => {
      call("AddGlobalVehicle", params(o));
      keep(`v:${o.name}`, () => call("RemoveGlobalVehicle", o.label));
    },
    removeGlobalVehicle: (o) => drop(`v:${o.name}`),
  };
})();

/**
 * interact (darktrovx, `client/interactions.lua`): world bubbles with options, removed by id. A point at bare
 * coordinates needs a Lua vector3, which JavaScript cannot send: those points stay prompts (the Lua lib places them).
 */
const interact = ((): TargetAdapter => {
  const call = (fn: string, ...args: unknown[]) =>
    callExport("interact", fn, ...args);
  const hashOf = (model: string | number) =>
    typeof model === "number" ? model : GetHashKey(model);
  const data = (o: TargetOption) => ({
    id: o.name,
    interactDst: o.distance,
    options: [
      {
        label: o.label,
        action: (entity: unknown) => o.onSelect(entityOf(entity)),
        canInteract: (entity: unknown) => o.canInteract(entityOf(entity)),
      },
    ],
  });
  return {
    coords: false,
    addSphere: () => null,
    removeZone: () => undefined,
    addLocalEntity: (entity, o) =>
      void call("AddLocalEntityInteraction", { ...data(o), entity }),
    removeLocalEntity: (entity, o) =>
      void call("RemoveLocalEntityInteraction", entity, o.name),
    addModels: (models, o) => {
      for (const model of models)
        call("AddModelInteraction", { ...data(o), model: hashOf(model) });
    },
    removeModels: (models, o) => {
      for (const model of models)
        call("RemoveModelInteraction", hashOf(model), o.name);
    },
    addGlobalVehicle: (o) => void call("AddGlobalVehicleInteraction", data(o)),
    removeGlobalVehicle: (o) =>
      void call("RemoveGlobalVehicleInteraction", o.name),
  };
})();

/**
 * Win order: ai-target, then TGIANN, then the others. Scripts that `provide` ox_target or qb-target come before those
 * names, because a provided name reads started too; interact goes last (it often runs next to a target as a
 * dependency of other scripts).
 */
export const TARGETS: readonly Target[] = [
  { resource: "ai-target", adapter: oxApi("ai-target") },
  // Answers the ox_target API under `tgiann-target` and `ox_target`, not under its own name.
  { resource: "tgiann-radialmenu-target", adapter: oxApi("tgiann-target") },
  { resource: "tgiann-target", adapter: oxApi("tgiann-target") },
  { resource: "sleepless_interact", adapter: sleeplessInteract },
  { resource: "ox_target", adapter: oxApi("ox_target") },
  { resource: "qb-target", adapter: qbTarget },
  { resource: "interact", adapter: interact },
];
