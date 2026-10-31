import type { Vec3 } from "../shared/vec";
import { cache } from "./cache";

/**
 * The closest other player within `metres` of the local ped (or of `from`: a point in front for a tackle), as a server
 * id; `filter` gets the server id and the ped (alive, on foot...). null when none. Walks the streamed players only.
 */
export function nearestPlayer(
  metres: number,
  options: {
    from?: Vec3;
    filter?: (serverId: number, ped: number) => boolean;
  } = {},
): number | null {
  let x: number;
  let y: number;
  let z: number;
  if (options.from) ({ x, y, z } = options.from);
  else [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  let best: number | null = null;
  let bestDistance = metres;
  for (const player of GetActivePlayers() as number[]) {
    if (player === cache.playerId) continue;
    const ped = GetPlayerPed(player);
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(ped, false);
    const d = Math.hypot(px - x, py - y, pz - z);
    if (d > bestDistance) continue;
    const serverId = GetPlayerServerId(player);
    if (options.filter && !options.filter(serverId, ped)) continue;
    best = serverId;
    bestDistance = d;
  }
  return best;
}

/**
 * The ped of a player by server id: `cache.ped` for the local player, 0 when that player is not in scope (never the
 * local ped through `GetPlayerPed(-1)`).
 */
export function playerPed(serverId: number): number {
  if (serverId === cache.serverId) return cache.ped;
  const player = GetPlayerFromServerId(serverId);
  return player === -1 ? 0 : GetPlayerPed(player);
}
