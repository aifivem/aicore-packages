import {
  EntityState as EntityMirror,
  GlobalGroup as GlobalGroupMirror,
  GlobalKey as GlobalKeyMirror,
  PlayerState as PlayerMirror,
} from "../fivem/state";

/**
 * The server side of the state classes: the same memory reads plus `set`, the only way state bags are written
 * (`sv_stateBagStrictMode`: clients ask through a callback, the server sets). A set is readable at once here (the
 * engine applies it later when any change handler exists), and replicates to the clients that need it.
 */

/** One key of entity state bags; `set` replicates to players with the entity in scope. */
export class EntityState<T> extends EntityMirror<T> {
  set(entity: number, value: T | undefined): void {
    if (!DoesEntityExist(entity)) return;
    Entity(entity).state.set(this.key, value ?? null, true);
    this.put(entity, value);
  }
}

/** One key of player state bags; `set` replicates to that player and the players near them. */
export class PlayerState<T> extends PlayerMirror<T> {
  set(source: number, value: T | undefined): void {
    Player(source).state.set(this.key, value ?? null, true);
    this.put(source, value);
  }
}

/** One GlobalState key; `set` replicates to everyone. Only for state every player needs. */
export class GlobalKey<T> extends GlobalKeyMirror<T> {
  set(value: T | undefined): void {
    GlobalState.set(this.key, value ?? null, true);
    this.put(value);
  }
}

/** Many GlobalState keys with one prefix; `set(id, value)` replicates `<prefix><id>` to everyone. */
export class GlobalGroup<T> extends GlobalGroupMirror<T> {
  set(id: string, value: T | undefined): void {
    GlobalState.set(this.prefix + id, value ?? null, true);
    this.put(id, value);
  }
}
