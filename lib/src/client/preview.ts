import { onStop } from "../fivem/byResource";
import { requestModel } from "./streaming";

/**
 * A local preview vehicle (showrooms): `show` puts a model at a point, frozen, invincible, locked and clean; the
 * latest call wins (an older one still loading its model does nothing). Deleted on `clear()` and when the resource
 * stops. Nothing networked.
 */
export class PreviewVehicle {
  /** The vehicle shown now, 0 when none. */
  vehicle = 0;
  private token = 0;

  constructor() {
    onStop(() => this.clear());
  }

  /** Shows `model` at `at` (`setup` dresses it: colours, plate, props); resolves the vehicle, or 0 when replaced. */
  async show(
    model: string | number,
    at: { x: number; y: number; z: number; heading: number },
    setup?: (vehicle: number) => void,
  ): Promise<number> {
    const token = ++this.token;
    const hash = await requestModel(model).catch(() => 0);
    if (!hash || token !== this.token) return 0;
    this.remove();
    const vehicle = CreateVehicle(hash, at.x, at.y, at.z, at.heading, false, false);
    SetModelAsNoLongerNeeded(hash);
    SetVehicleOnGroundProperly(vehicle);
    FreezeEntityPosition(vehicle, true);
    SetEntityInvincible(vehicle, true);
    SetVehicleDoorsLocked(vehicle, 2);
    SetVehicleDirtLevel(vehicle, 0);
    setup?.(vehicle);
    this.vehicle = vehicle;
    return vehicle;
  }

  /** Removes the preview and cancels a show still loading. */
  clear(): void {
    this.token++;
    this.remove();
  }

  private remove(): void {
    if (this.vehicle && DoesEntityExist(this.vehicle))
      DeleteEntity(this.vehicle);
    this.vehicle = 0;
  }
}
