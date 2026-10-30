import { CORE, type PlayerCache } from "@aicore-fivem/shared";

/** The unarmed "weapon" hash: cached as `false`. */
const UNARMED = GetHashKey("WEAPON_UNARMED") | 0;

/** The weapon in a ped's hand, `false` when unarmed. */
export function readWeapon(ped: number): number | false {
  const weapon = GetSelectedPedWeapon(ped) | 0;
  return weapon === UNARMED ? false : weapon;
}

/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
export function readPlayerState(ped: number): Pick<PlayerCache, "vehicle" | "seat" | "weapon"> {
  const vehicle = GetVehiclePedIsIn(ped, false);
  let seat: number | false = false;
  if (vehicle) {
    for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
      if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
      seat = i;
      break;
    }
  }
  return { vehicle: vehicle || false, seat, weapon: readWeapon(ped) };
}

/**
 * The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
 * read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
 * a local event, so no resource polls for these itself. Read only.
 */
const ped = PlayerPedId();
export const cache: PlayerCache = { ped, playerId: PlayerId(), serverId: GetPlayerServerId(PlayerId()), ...readPlayerState(ped) };

type Handler = (value: unknown, old: unknown) => void;
const handlers = new Map<string, Set<Handler>>();

const valid = (key: keyof PlayerCache, value: unknown): boolean =>
  key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;

on(CORE.clientCacheEvent, (key: unknown, value: unknown) => {
  if (typeof key !== "string" || !(key in cache)) return;
  const name = key as keyof PlayerCache;
  if (!valid(name, value) || cache[name] === value) return;
  const old = cache[name];
  (cache as unknown as Record<string, unknown>)[name] = value;
  for (const handler of handlers.get(name) ?? []) handler(value, old);
});

/** Runs `handler(value, old)` whenever a cached value changes (entering a vehicle, a new ped after a model swap...). */
export function onCache<K extends keyof PlayerCache>(key: K, handler: (value: PlayerCache[K], old: PlayerCache[K]) => void): void {
  let set = handlers.get(key);
  if (!set) handlers.set(key, (set = new Set()));
  set.add(handler as Handler);
}
