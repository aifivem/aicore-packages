import { createLogger } from "../shared";
import { requestAnimDict, requestModel } from "./streaming";
import { Zones } from "./zones";

const log = createLogger(GetCurrentResourceName());

export interface LocalPedOptions {
  model: string;
  coords: { x: number; y: number; z: number; heading: number };
  /** `coords.z` is the floor (panel points): the ped stands on it. Otherwise z is the ped's own root. Default true. */
  ground?: boolean;
  /** A scenario it plays (`WORLD_HUMAN_CLIPBOARD`), or an animation loop. */
  scenario?: string;
  anim?: { dict: string; clip: string };
  /** Spawned when the player comes this close, removed past it (default 50 m). */
  distance?: number;
  /**
   * Attached to an entity (a bed, a vehicle, another ped) at a bone with an offset and rotation; `entity` may be a
   * function read at each spawn (an entity found from a network id). Not frozen while attached. `coords` stays where
   * the ped is created and the distance is measured from.
   */
  attach?: {
    entity: number | (() => number);
    /** Bone index (`GetEntityBoneIndexByName`, `GetPedBoneIndex`); default 0, the entity's root. */
    bone?: number;
    offset?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
  };
  /** Sitting in a vehicle seat (-1 driver, 0 front passenger...); `vehicle` may be a function read at each spawn. */
  seat?: { vehicle: number | (() => number); seat: number };
  /** After the ped appears (target options, props) and before it goes. */
  onSpawn?: (ped: number) => void;
  onDespawn?: (ped: number) => void;
}

/** One zone set for every local ped of this resource: peds exist only while their player is near. */
const zones = new Zones();
let nextId = 0;

/**
 * A ped only this client sees (a shopkeeper, a job NPC): created when the player comes near, deleted when they leave,
 * frozen, invincible and deaf to events. Never networked, so strict entity lockdown does not matter.
 */
export class LocalPed {
  private readonly id = `ped:${++nextId}`;
  private handle = 0;
  private wanted = false;

  constructor(private readonly options: LocalPedOptions) {
    const { x, y, z } = options.coords;
    zones.add(this.id, {
      shape: {
        type: "sphere",
        center: { x, y, z },
        radius: options.distance ?? 50,
      },
      interval: 1000,
      onEnter: () => void this.spawn(),
      onExit: () => this.despawn(),
    });
  }

  /** The ped while it exists, else 0. */
  get entity(): number {
    return this.handle;
  }

  /** Deletes the ped for good. */
  remove(): void {
    zones.remove(this.id);
    this.despawn();
  }

  private async spawn(): Promise<void> {
    this.wanted = true;
    const o = this.options;
    try {
      const hash = await requestModel(o.model);
      if (o.anim) await requestAnimDict(o.anim.dict);
      // The player may have left while the model loaded.
      if (!this.wanted || this.handle) return;
      const { x, y, z, heading } = o.coords;
      const ped = CreatePed(
        4,
        hash,
        x,
        y,
        o.ground === false ? z : z - 1,
        heading,
        false,
        false,
      );
      SetModelAsNoLongerNeeded(hash);
      if (!this.place(ped)) FreezeEntityPosition(ped, true);
      SetEntityInvincible(ped, true);
      SetBlockingOfNonTemporaryEvents(ped, true);
      SetPedCanRagdoll(ped, false);
      if (o.scenario) TaskStartScenarioInPlace(ped, o.scenario, 0, true);
      else if (o.anim)
        TaskPlayAnim(
          ped,
          o.anim.dict,
          o.anim.clip,
          8,
          8,
          -1,
          1,
          0,
          false,
          false,
          false,
        );
      this.handle = ped;
      o.onSpawn?.(ped);
    } catch (error) {
      log.error(`local ped ${o.model} could not be created`, error);
    }
  }

  /** Puts the new ped into its seat or attaches it; false when it stands free (no target entity right now). */
  private place(ped: number): boolean {
    const read = (e: number | (() => number)) =>
      typeof e === "function" ? e() : e;
    const { seat, attach } = this.options;
    if (seat) {
      const vehicle = read(seat.vehicle);
      if (!vehicle || !DoesEntityExist(vehicle)) return false;
      SetPedIntoVehicle(ped, vehicle, seat.seat);
      return true;
    }
    if (!attach) return false;
    const entity = read(attach.entity);
    if (!entity || !DoesEntityExist(entity)) return false;
    const o = attach.offset ?? { x: 0, y: 0, z: 0 };
    const r = attach.rotation ?? { x: 0, y: 0, z: 0 };
    AttachEntityToEntity(
      ped,
      entity,
      attach.bone ?? 0,
      o.x,
      o.y,
      o.z,
      r.x,
      r.y,
      r.z,
      false,
      false,
      false,
      false,
      2,
      true,
    );
    return true;
  }

  private despawn(): void {
    this.wanted = false;
    if (!this.handle) return;
    const ped = this.handle;
    this.handle = 0;
    this.options.onDespawn?.(ped);
    DeleteEntity(ped);
  }
}

on("onResourceStop", (resource: string) => {
  if (resource === GetCurrentResourceName()) zones.clear();
});
