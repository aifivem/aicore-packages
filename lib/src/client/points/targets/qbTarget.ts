import { onStop } from "../../../fivem/byResource";
import { callExport } from "../../../fivem/exports";
import type { TargetAdapter, TargetOption } from "./adapter";
import { entityOf, faClass } from "./optionShape";

/**
 * qb-target 5.x (`registration.lua`): options keyed by their label, zones by a global name. It keeps a stopped
 * resource's options (with dead function references), so this resource takes its own off when it stops.
 */
export const qbTarget = ((): TargetAdapter => {
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
