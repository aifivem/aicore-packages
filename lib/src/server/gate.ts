import { ADMIN, CORE } from "@aicore-fivem/shared";
import { createLogger, logSafe } from "../shared";
import { resourceExport } from "../fivem/exports";
import { RateLimit, SourceLock } from "./rateLimit";

const core = resourceExport(CORE.resource);

const log = createLogger(GetCurrentResourceName());

/**
 * A check a player must pass before a net event or callback runs: `true` passes, `false` refuses quietly,
 * a string refuses and is logged as the reason.
 */
export type Guard = (source: number) => boolean | string;

/** Options of every client input (net event or callback). */
export interface ClientInputOptions {
  /** Run in order; the first that does not pass refuses the call. */
  guards?: Guard[];
  /** At most `count` calls per player inside `windowMs` (events default 10 per second, callbacks 20). */
  rate?: { count: number; windowMs: number };
  /** One call at a time per player: a second one while the first still runs is dropped (async writes). */
  lock?: boolean;
}

/** Options of an input whose handler takes arguments: `args` turns the raw ones into checked values (`null` refuses). */
export interface ParsedInputOptions<
  A extends readonly unknown[],
> extends ClientInputOptions {
  args: (raw: unknown[]) => A | null;
}

/** The player is in ai-core's admin group (ACE `ai.admin` unless another ace is named). */
export const isAdmin =
  (ace: string = ADMIN.ace): Guard =>
  (source) =>
    Boolean(IsPlayerAceAllowed(String(source), ace)) || `not allowed (${ace})`;

/** The player has a character in the world (not on the character screen). */
export const hasCharacter = (): Guard => (source) =>
  core.GetCharacter(source) !== null || "no character loaded";

interface Point {
  x: number;
  y: number;
  z: number;
}

/** The player's ped is within `metres` of a point (or of the point a function returns for this player). */
export const near =
  (point: Point | ((source: number) => Point | null), metres: number): Guard =>
  (source) => {
    const target = typeof point === "function" ? point(source) : point;
    if (!target) return "no target point";
    const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
    return (
      Math.hypot(x - target.x, y - target.y, z - target.z) <= metres ||
      `too far (${metres} m)`
    );
  };

/** Every gate of this resource; one playerDropped listener frees them all (one listener per gate trips Node's limit). */
const gates = new Set<{ release(source: number): void }>();
on("playerDropped", () => {
  const source = Number(globalThis.source);
  for (const gate of gates) gate.release(source);
});

/**
 * The checks every client input passes, in this order: a real player sent it (not the resource itself), rate,
 * guards, arguments. Refusals with a reason are logged with the player and the input's name.
 */
export class ClientGate<A extends readonly unknown[]> {
  private readonly limit: RateLimit;
  private readonly lock: SourceLock | null;

  constructor(
    private readonly name: string,
    private readonly options: ClientInputOptions & {
      args?: (raw: unknown[]) => A | null;
    },
    defaultRate: number,
  ) {
    this.limit = new RateLimit(
      options.rate?.count ?? defaultRate,
      options.rate?.windowMs ?? 1_000,
    );
    this.lock = options.lock ? new SourceLock() : null;
    gates.add(this);
  }

  /** The checked arguments, or null when the call must not run. */
  check(source: number, raw: unknown[]): A | null {
    // A local emit of the same name has no player source.
    if (!(source > 0) || !GetPlayerName(String(source))) return null;
    if (!this.limit.take(source)) return null;
    for (const guard of this.options.guards ?? []) {
      const verdict = guard(source);
      if (verdict === true) continue;
      if (typeof verdict === "string") this.refuse(source, verdict);
      return null;
    }
    if (!this.options.args) return [] as unknown as A;
    const args = this.options.args(raw);
    if (args === null)
      this.refuse(
        source,
        `invalid arguments ${logSafe(JSON.stringify(raw) ?? "", 200)}`,
      );
    return args;
  }

  /** Runs `task` under the per-player lock when the input has one; `busy` when another call still runs. */
  run<T, B>(
    source: number,
    busy: B,
    task: () => Promise<T> | T,
  ): Promise<T | B> {
    return this.lock
      ? this.lock.run(source, busy, async () => task())
      : Promise.resolve(task());
  }

  release(source: number): void {
    this.limit.release(source);
    this.lock?.release(source);
  }

  private refuse(source: number, reason: string): void {
    log.warn(
      `${this.name} refused for ${GetPlayerName(String(source))} (${source}): ${reason}`,
    );
  }
}
