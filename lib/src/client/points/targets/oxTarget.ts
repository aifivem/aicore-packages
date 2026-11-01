import { callExport } from "../../../fivem/exports";
import type { TargetAdapter } from "./adapter";
import { oxOption } from "./optionShape";

/** The ox_target API, answered under `name` (ox_target, ai-target, tgiann-target and tgiann-radialmenu-target). */
export function oxApi(name: string): TargetAdapter {
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
export const sleeplessInteract = ((): TargetAdapter => {
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
