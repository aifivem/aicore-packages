/**
 * The server's epoch clock on a client: `sync(serverNow)` takes the offset from a server's `Date.now()` (a snapshot,
 * a start message), `now()` is the server time now, `toLocal(serverTime)` the same moment on the local clock.
 */
export class ServerClock {
  private offset = 0;

  /** Takes the offset from the server's `Date.now()` just received. */
  sync(serverNow: number): void {
    this.offset = serverNow - Date.now();
  }

  /** The server's `Date.now()` right now. */
  now(): number {
    return Date.now() + this.offset;
  }

  /** A server time as a local `Date.now()` time (for countdowns on the local clock). */
  toLocal(serverTime: number): number {
    return serverTime - this.offset;
  }
}
