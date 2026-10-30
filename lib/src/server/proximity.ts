import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";
import type { Vec3 } from "../shared/vec";
import { coordsOf, entityCoords } from "./position";

/**
 * Who is near whom without scanning every player: ai-core keeps which players are in each other's OneSync scope
 * (~424 m, one set of scope handlers for the whole server); a "near" question measures only those few players.
 */
const core = resourceExport(CORE.resource);

/** Players within `radius` metres of a point, measured only among `candidates`. */
function within(
  point: Vec3,
  radius: number,
  candidates: Iterable<number>,
): number[] {
  const out: number[] = [];
  for (const source of candidates) {
    const p = coordsOf(source);
    if (Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z) <= radius)
      out.push(source);
  }
  return out;
}

/** Players within `radius` (up to ~424 m) of a player, that player included. */
export function playersNear(source: number, radius: number): number[] {
  return within(coordsOf(source), radius, [
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
  return within(entityCoords(entity), radius, [
    owner,
    ...core.GetPlayersInScope(owner),
  ]);
}

/**
 * The closest other player within `metres` of `source` (up to ~424 m, OneSync scope candidates only) that passes
 * `filter` (loaded character, on foot, not cuffed...); null when none.
 */
export function nearestPlayerTo(
  source: number,
  metres: number,
  filter?: (other: number) => boolean,
): number | null {
  const from = coordsOf(source);
  let best: number | null = null;
  let bestDistance = metres;
  for (const other of core.GetPlayersInScope(source)) {
    if (other === source) continue;
    const p = coordsOf(other);
    const d = Math.hypot(p.x - from.x, p.y - from.y, p.z - from.z);
    if (d > bestDistance || (filter && !filter(other))) continue;
    best = other;
    bestDistance = d;
  }
  return best;
}
