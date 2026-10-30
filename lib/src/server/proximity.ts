import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

/**
 * Who is near whom without scanning every player: ai-core keeps which players are in each other's OneSync scope
 * (~424 m, one set of scope handlers for the whole server); a "near" question measures only those few players.
 */
const core = resourceExport(CORE.resource);

type Vec = { x: number; y: number; z: number };

const posOf = (source: number): Vec => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return { x, y, z };
};

/** Players within `radius` metres of a point, measured only among `candidates`. */
function within(
  point: Vec,
  radius: number,
  candidates: Iterable<number>,
): number[] {
  const out: number[] = [];
  for (const source of candidates) {
    const p = posOf(source);
    if (Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z) <= radius)
      out.push(source);
  }
  return out;
}

/** Players within `radius` (up to ~424 m) of a player, that player included. */
export function playersNear(source: number, radius: number): number[] {
  return within(posOf(source), radius, [
    source,
    ...core.GetPlayersInScope(source),
  ]);
}

/**
 * Players within `radius` (up to ~424 m) of a networked entity: its owner (a player near it) and the players in that
 * owner's scope. An entity nobody owns (the server) has nobody near it.
 */
export function playersNearEntity(entity: number, radius: number): number[] {
  if (!DoesEntityExist(entity)) return [];
  const owner = NetworkGetEntityOwner(entity);
  if (owner <= 0) return [];
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
  return within({ x, y, z }, radius, [owner, ...core.GetPlayersInScope(owner)]);
}
