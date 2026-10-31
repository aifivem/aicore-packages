import { waitFor } from "../shared/wait";

/** The local entity of a network id once it exists on this client, or 0 after `timeoutMs` (default 5 s). */
export async function waitForEntity(
  netId: number,
  timeoutMs = 5000,
): Promise<number> {
  return waitFor(
    () =>
      NetworkDoesEntityExistWithNetworkId(netId)
        ? NetToEnt(netId) || undefined
        : undefined,
    timeoutMs,
  ).catch(() => 0);
}

/**
 * The local entity of a network id right now, or 0 (not on this client, or not of `type`: 1 ped, 2 vehicle, 3 object;
 * any type when omitted).
 */
export function entityFromNetId(netId: number, type?: 1 | 2 | 3): number {
  if (!NetworkDoesEntityExistWithNetworkId(netId)) return 0;
  const entity = NetToEnt(netId);
  if (!entity) return 0;
  return type === undefined || GetEntityType(entity) === type ? entity : 0;
}
