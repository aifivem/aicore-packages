import { callExport } from "../../../fivem/exports";
import type { TargetAdapter, TargetOption } from "./adapter";
import { entityOf } from "./optionShape";

/**
 * interact (darktrovx, `client/interactions.lua`): world bubbles with options, removed by id. A point at bare
 * coordinates needs a Lua vector3, which JavaScript cannot send: those points stay prompts (the Lua lib places them).
 */
export const interact = ((): TargetAdapter => {
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
