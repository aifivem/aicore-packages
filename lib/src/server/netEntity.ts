import { readId } from "../shared/strict";

/**
 * The live entity behind a client's network id, or 0 (not a positive integer, not networked, gone, or not of `type`:
 * 1 ped, 2 vehicle, 3 object; any type when omitted).
 */
export function entityFromNet(netId: unknown, type?: 1 | 2 | 3): number {
  if (readId(netId) === null) return 0;
  const entity = NetworkGetEntityFromNetworkId(netId as number);
  if (!entity || !DoesEntityExist(entity)) return 0;
  return type === undefined || GetEntityType(entity) === type ? entity : 0;
}

/** The live vehicle behind a client's network id, or 0 (not a positive integer, not networked, gone, not a vehicle). */
export const vehicleFromNet = (netId: unknown): number =>
  entityFromNet(netId, 2);

/** The live ped behind a client's network id, or 0 (not a positive integer, not networked, gone, not a ped). */
export const pedFromNet = (netId: unknown): number => entityFromNet(netId, 1);
