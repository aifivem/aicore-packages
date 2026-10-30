import { PlayerMap } from "./players";

interface Pending<T> {
  token: number;
  data: T;
  startedAt: number;
  durationMs: number;
}

/**
 * Actions waiting for a player's client (progress bar, dialog), one per player: `start` hands out a token the client
 * sends back, `take` ends the action when the token matches and enough of the time passed. Freed when the player
 * drops. Create once at module level.
 */
export class PendingActions<T> {
  private readonly actions = new PlayerMap<Pending<T>>();
  private readonly minRatio: number;
  private next = 0;

  /** `take` refuses an answer that comes before `minRatio` (default 0.8) of the action's duration. */
  constructor(options: { minRatio?: number } = {}) {
    this.minRatio = options.minRatio ?? 0.8;
  }

  /** Starts the player's action (replacing a running one) and answers its token (1 to 2^31-1, `readId` parses it). */
  start(source: number, data: T, durationMs: number): number {
    this.next = this.next >= 2_147_483_647 ? 1 : this.next + 1;
    this.actions.set(source, {
      token: this.next,
      data,
      startedAt: GetGameTimer(),
      durationMs,
    });
    return this.next;
  }

  /**
   * The action's data when `token` is the running one and enough time passed; null otherwise. A wrong token leaves the
   * running action alone (a stale or forged token never cancels it); a matching one ends it, too fast or not.
   */
  take(source: number, token: number): T | null {
    const action = this.actions.get(source);
    if (!action || action.token !== token) return null;
    this.actions.delete(source);
    return GetGameTimer() - action.startedAt >=
      action.durationMs * this.minRatio
      ? action.data
      : null;
  }

  /** The running action's data without ending it, or null. */
  peek(source: number): T | null {
    return this.actions.get(source)?.data ?? null;
  }

  /** Ends the player's action without a result. */
  cancel(source: number): void {
    this.actions.delete(source);
  }

  /** How many actions run now. */
  get size(): number {
    return this.actions.size;
  }
}
