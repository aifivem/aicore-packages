import type { Vec3 } from "../shared/vec";
import { cache } from "./cache";

export interface LocationName {
  street: string;
  /** The crossing street, when there is one. */
  crossing?: string;
  /** The area's label (`Vinewood Hills`). */
  zone: string;
}

/** The street, crossing and zone names at a point (default the local ped). */
export function locationName(coords?: Vec3): LocationName {
  const at = coords ?? coordsOfPed();
  const [streetHash, crossingHash] = GetStreetNameAtCoord(at.x, at.y, at.z);
  const crossing =
    crossingHash !== 0 ? GetStreetNameFromHashKey(crossingHash) : "";
  return {
    street: GetStreetNameFromHashKey(streetHash),
    crossing: crossing || undefined,
    zone: GetLabelText(GetNameOfZone(at.x, at.y, at.z)),
  };
}

function coordsOfPed(): Vec3 {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  return { x, y, z };
}

/**
 * A vehicle's display name (`Sultan RS`) from a model name, hash or vehicle entity; the model name when the game has
 * no label for it (add-on models without a text entry).
 */
export function vehicleLabel(vehicle: string | number): string {
  const model =
    typeof vehicle === "number" &&
    DoesEntityExist(vehicle) &&
    IsEntityAVehicle(vehicle)
      ? GetEntityModel(vehicle)
      : vehicle;
  const hash = typeof model === "number" ? model : GetHashKey(model);
  const name = GetDisplayNameFromVehicleModel(hash);
  const label = GetLabelText(name);
  if (label !== "NULL" && label !== "") return label;
  if (name !== "" && name !== "CARNOTFOUND") return name;
  return typeof model === "string" ? model : String(hash);
}

/** The ground height under x / y, probing down from `z` (default 1000): null while the collision there is not loaded. */
export function groundZ(x: number, y: number, z = 1000): number | null {
  const [found, ground] = GetGroundZFor_3dCoord(x, y, z, false);
  return found ? ground : null;
}
