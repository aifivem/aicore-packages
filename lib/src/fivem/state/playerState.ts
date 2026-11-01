import { Mirror, type StateParse } from "./mirror";

const isServer = IsDuplicityVersion();

/** Every player state of this resource: one `playerDropped` listener forgets the leaver in all of them. */
const playerStates = new Set<{ dropPlayer(serverId: number): void }>();
let dropListener = false;

/** One key of player state bags (`dead`, `cuffed`, pma-voice's `proximity`...), by server id. */
export class PlayerState<T> extends Mirror<number, T> {
  private readonly seen = new Set<number>();

  constructor(key: string, parse: StateParse<T>) {
    super(key, parse);
    AddStateBagChangeHandler(
      key,
      "",
      (bag: string, _key: string, value: unknown) => {
        if (!bag.startsWith("player:")) return;
        const id = Number(bag.slice(7));
        this.seen.add(id);
        this.store(id, value);
      },
    );
    if (!isServer) return;
    playerStates.add(this);
    if (dropListener) return;
    dropListener = true;
    // One listener for every instance: more than 10 on one event print Node's MaxListenersExceededWarning.
    on("playerDropped", () => {
      const id = Number(globalThis.source);
      for (const state of playerStates) state.dropPlayer(id);
    });
  }

  /** A player left (the shared drop listener calls it). */
  dropPlayer(serverId: number): void {
    this.forget(serverId);
  }

  /** The value of a player by server id (the local player: `cache.serverId`). */
  get(serverId: number): T | undefined {
    if (!this.seen.has(serverId)) {
      this.seen.add(serverId);
      const raw: unknown = Player(serverId).state[this.key];
      this.values.set(serverId, raw == null ? undefined : this.parse(raw));
    }
    return this.values.get(serverId);
  }

  protected put(serverId: number, value: T | undefined): void {
    this.seen.add(serverId);
    this.apply(serverId, value);
  }

  protected forget(serverId: number): void {
    this.values.delete(serverId);
    this.seen.delete(serverId);
  }
}
