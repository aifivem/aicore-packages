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
