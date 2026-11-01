import { every } from "../scheduler/every";
import { Mirror, type StateParse } from "./mirror";

const PRUNE_MS = 30_000;
const isServer = IsDuplicityVersion();

/** One key of entity state bags (`fuel`, `ai:owned`...), by network id. */
export class EntityState<T> extends Mirror<number, T> {
  /** The entity handle each value belongs to: a reused network id with another handle is read again. */
  private readonly handles = new Map<number, number>();

  constructor(key: string, parse: StateParse<T>) {
    super(key, parse);
    AddStateBagChangeHandler(
      key,
      "",
      (bag: string, _key: string, value: unknown) => {
        if (!bag.startsWith("entity:")) return;
        const netId = Number(bag.slice(7));
        this.handles.set(netId, GetEntityFromStateBagName(bag));
        this.store(netId, value);
      },
    );
    if (isServer)
      on("entityRemoved", (entity: number) =>
        this.forget(NetworkGetNetworkIdFromEntity(entity)),
      );
    else every(PRUNE_MS, () => this.prune(), { name: `state ${key}` });
  }

  /** The value on an entity (undefined: none or not networked). */
  get(entity: number): T | undefined {
    if (!entity) return undefined;
    const netId = NetworkGetNetworkIdFromEntity(entity);
    const handle = this.handles.get(netId);
    if (handle === entity) return this.values.get(netId);
    if (handle === 0 && this.values.has(netId)) {
      // The value arrived before the entity existed here.
      this.handles.set(netId, entity);
      return this.values.get(netId);
    }
    // First read of this entity (resource started after it was set, or a reused network id): read the bag once.
    this.handles.set(netId, entity);
    const value = this.parseRaw(Entity(entity).state[this.key]);
    this.values.set(netId, value);
    return value;
  }

  protected put(entity: number, value: T | undefined): void {
    const netId = NetworkGetNetworkIdFromEntity(entity);
    this.handles.set(netId, entity);
    this.apply(netId, value);
  }

  /** The value by network id, as far as this side knows it. */
  getByNetId(netId: number): T | undefined {
    return this.values.get(netId);
  }

  protected forget(netId: number): void {
    this.values.delete(netId);
    this.handles.delete(netId);
  }

  private parseRaw(raw: unknown): T | undefined {
    return raw == null ? undefined : this.parse(raw);
  }

  /** Clients never hear about entities leaving their scope: drop the ones that no longer exist here. */
  private prune(): void {
    for (const netId of this.values.keys())
      if (!DoesEntityExist(NetworkGetEntityFromNetworkId(netId)))
        this.forget(netId);
  }
}
