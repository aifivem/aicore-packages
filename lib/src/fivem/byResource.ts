/** The resource that called the current export (this resource when called from its own code). */
export function caller(): string {
  const invoking = GetInvokingResource();
  return invoking !== null && invoking !== undefined && invoking !== ""
    ? invoking
    : GetCurrentResourceName();
}

/** One resource-stop listener for every owner map of this resource. */
const stopHandlers: Array<(resource: string) => void> = [];
let listening = false;
function onStop(handler: (resource: string) => void): void {
  stopHandlers.push(handler);
  if (listening) return;
  listening = true;
  const event = IsDuplicityVersion() ? "onResourceStop" : "onClientResourceStop";
  on(event, (resource: string) => {
    for (const stop of stopHandlers) stop(resource);
  });
}

/**
 * Entries owned by the resources that registered them (an export provider's prompts, hints, items): a stopping
 * resource's entries go at once. `dropResource` is O(entries of that resource).
 */
export class ByResource<K, V> {
  private readonly byOwner = new Map<string, Map<K, V>>();
  private readonly owners = new Map<K, string>();

  constructor(
    private readonly options: {
      onDrop?: (resource: string, key: K, value: V) => void;
    } = {},
  ) {
    onStop((resource) => this.dropResource(resource));
  }

  /** Sets the entry under `owner` (default: the calling resource), moving it from another owner. */
  set(key: K, value: V, owner = caller()): void {
    const previous = this.owners.get(key);
    if (previous !== undefined && previous !== owner)
      this.byOwner.get(previous)?.delete(key);
    let map = this.byOwner.get(owner);
    if (!map) this.byOwner.set(owner, (map = new Map()));
    map.set(key, value);
    this.owners.set(key, owner);
  }

  get(key: K): V | undefined {
    const owner = this.owners.get(key);
    return owner === undefined ? undefined : this.byOwner.get(owner)?.get(key);
  }

  ownerOf(key: K): string | undefined {
    return this.owners.get(key);
  }

  delete(key: K): boolean {
    const owner = this.owners.get(key);
    if (owner === undefined) return false;
    this.owners.delete(key);
    const map = this.byOwner.get(owner);
    map?.delete(key);
    if (map?.size === 0) this.byOwner.delete(owner);
    return true;
  }

  *values(): Generator<V> {
    for (const map of this.byOwner.values()) yield* map.values();
  }

  *entries(): Generator<[K, V]> {
    for (const map of this.byOwner.values()) yield* map.entries();
  }

  get size(): number {
    return this.owners.size;
  }

  /** Drops every entry of a resource (`onDrop` per entry). */
  dropResource(resource: string): void {
    const map = this.byOwner.get(resource);
    if (!map) return;
    this.byOwner.delete(resource);
    for (const [key, value] of map) {
      this.owners.delete(key);
      this.options.onDrop?.(resource, key, value);
    }
  }
}

/**
 * Flags set by resources for a reason (`<resource>:<reason>`: HUD hidden, sync paused): `any` is true while one is
 * set; a stopping resource's flags go. `onChange` hears `any` flip.
 */
export class Reasons {
  private readonly set_ = new Set<string>();
  private readonly listeners: Array<(any: boolean) => void> = [];

  constructor() {
    onStop((resource) => {
      const before = this.any;
      for (const key of this.set_)
        if (key.startsWith(`${resource}:`)) this.set_.delete(key);
      this.notify(before);
    });
  }

  get any(): boolean {
    return this.set_.size > 0;
  }

  /** Whether a reason (of `owner`, default the calling resource) is set. */
  has(reason: string, owner = caller()): boolean {
    return this.set_.has(`${owner}:${reason}`);
  }

  set(reason: string, on: boolean, owner = caller()): void {
    const before = this.any;
    const key = `${owner}:${reason}`;
    if (on) this.set_.add(key);
    else this.set_.delete(key);
    this.notify(before);
  }

  onChange(handler: (any: boolean) => void): void {
    this.listeners.push(handler);
  }

  private notify(before: boolean): void {
    if (before === this.any) return;
    for (const listener of this.listeners) listener(this.any);
  }
}

/** A vehicle's plate as keys use it (trimmed, upper case; GTA pads plates with spaces). */
export const plateOf = (vehicle: number): string =>
  GetVehicleNumberPlateText(vehicle).trim().toUpperCase();
