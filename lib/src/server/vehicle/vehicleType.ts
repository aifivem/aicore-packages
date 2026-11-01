import { CORE } from "@aicore-fivem/shared";
import { triggerClientCallback } from "../callback";

/** Every type `CreateVehicleServerSetter` takes; a client answering anything else is ignored. */
const TYPES = new Set([
  "automobile",
  "bike",
  "boat",
  "heli",
  "plane",
  "submarine",
  "trailer",
  "train",
]);
/** Model hash -> spawn type two different players' clients agreed on (the server cannot read a vehicle class). */
const types = new Map<number, string>();
/** Model hash -> type -> the first player whose client answered it, until a second player confirms one. */
const votes = new Map<number, Map<string, number>>();

/** A model name or hash as the signed 32-bit hash `GetHashKey` gives (a hash written unsigned is the same model). */
export const modelHash = (model: string | number): number =>
  typeof model === "number" ? model | 0 : GetHashKey(model) | 0;

/**
 * The `CreateVehicleServerSetter` type of a model (name or hash) asked from a player's client (ai-core answers); null:
 * no such vehicle. An answer serves only that player's spawn until a second player's client gives the same one, then
 * it is kept for everyone: one modified client can break only its own spawns, never a model for the server.
 */
export async function vehicleType(
  model: string | number,
  asker: number,
): Promise<string | null> {
  const hash = modelHash(model);
  const known = types.get(hash);
  if (known !== undefined) return known;
  const answer = await triggerClientCallback(CORE.vehicleTypeCallback, asker, [
    model,
  ]).catch(() => null);
  if (typeof answer !== "string" || !TYPES.has(answer)) return null;
  const seen = votes.get(hash) ?? new Map<string, number>();
  const first = seen.get(answer);
  if (first !== undefined && first !== asker) {
    types.set(hash, answer);
    votes.delete(hash);
  } else {
    seen.set(answer, asker);
    votes.set(hash, seen);
  }
  return answer;
}
