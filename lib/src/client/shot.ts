import { cache, onCache } from "./cache";
import { TickLoop } from "./tickLoop";

type ShotHandler = (weapon: number) => void;
const handlers = new Set<ShotHandler>();

/** `IsPedShooting` is true only in the frame of the shot, so it is read every frame, but only while a weapon is held. */
const frame = new TickLoop(() => {
  const weapon = cache.weapon;
  if (weapon === false || !IsPedShooting(cache.ped)) return;
  for (const handler of handlers) handler(weapon);
});

const update = (): void =>
  frame.set(handlers.size > 0 && cache.weapon !== false);
onCache("weapon", update);

/**
 * Runs `handler(weapon)` in the frame the local ped fires a shot (stress, shot alerts). One per-frame check for the
 * resource, on only while a weapon is in hand. Keep the handler cheap (it runs inside the frame).
 */
export function onShot(handler: ShotHandler): () => void {
  handlers.add(handler);
  update();
  return () => {
    handlers.delete(handler);
    update();
  };
}
