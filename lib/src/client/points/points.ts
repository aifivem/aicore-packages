import { onStyleChange, onTargetChange, style } from "./interact";
import { Blips } from "../blip";
import { LocalPed } from "../localPed";
import {
  ModelPoint,
  type ModelPointOptions,
  type VehiclePointOptions,
} from "./modelPoint";
import { onPromptPressed } from "../prompt";
import { Point, type PointOptions } from "./point";
import { Zones } from "../zones";

const groups = new Set<Points>();
const byPrompt = new Map<string, { press(): void }>();
let nextGroup = 0;

/**
 * Interaction points of a script (counters, shop doors, NPCs): one object per point instead of zones + prompts +
 * blips + peds by hand. Each point shows as ai-core's prompt (interaction key) or as a target option, as the owner
 * picks in ai-core's panel (Interaction); the same `onPressed` runs either way. Rebuild with `clear()` + `add()` when
 * the panel changes the points; call `refresh()` when what `canShow` reads changes (job, duty, vehicle).
 */
export class Points {
  private readonly zones = new Zones();
  private readonly blips = new Blips();
  private readonly points = new Map<string, Point>();
  private readonly modelPoints = new Map<string, ModelPoint>();
  private readonly prefix = `pt${++nextGroup}:`;

  constructor() {
    groups.add(this);
  }

  /** Adds (or replaces) a point. */
  add(id: string, options: PointOptions): void {
    this.remove(id);
    const point = new Point(this.prefix + id, options);
    this.points.set(id, point);
    byPrompt.set(point.promptId, point);
    if (options.ped) {
      const ped = options.ped;
      point.ped = new LocalPed({
        ...ped,
        coords: ped.coords ?? { ...options.coords, heading: 0 },
        onSpawn: () => point.attach(style()),
        onDespawn: () => point.detach(),
      });
    }
    if (options.blip)
      this.blips.add(id, {
        ...options.blip,
        coords: options.blip.coords ?? options.coords,
      });
    this.zones.add(id, {
      shape:
        options.height !== undefined
          ? {
              type: "cylinder",
              center: options.coords,
              radius: options.radius ?? 2,
              height: options.height,
            }
          : {
              type: "sphere",
              center: options.coords,
              radius: options.radius ?? 2,
            },
      interval: options.interval,
      onEnter: () => {
        point.inside = true;
        point.sync(style());
        options.onEnter?.();
      },
      onExit: () => {
        point.inside = false;
        point.sync(style());
        options.onExit?.();
      },
    });
    point.attach(style());
  }

  /** Adds (or replaces) a point on every world object of some models (ATMs, vending machines). */
  addModel(id: string, options: ModelPointOptions): void {
    this.remove(id);
    const point = new ModelPoint(this.prefix + id, options);
    this.modelPoints.set(id, point);
    byPrompt.set(point.promptId, point);
    point.attach(style());
  }

  /**
   * Adds (or replaces) a point on every vehicle (trunk, hood, push): a global vehicle option in target mode, a prompt
   * at the nearest networked vehicle within `radius` otherwise. `canShow` and `onPressed` get the vehicle.
   */
  addVehicle(id: string, options: VehiclePointOptions): void {
    this.addModel(id, { ...options, models: [], vehicles: true });
  }

  remove(id: string): void {
    const model = this.modelPoints.get(id);
    if (model) {
      model.detach();
      byPrompt.delete(model.promptId);
      this.modelPoints.delete(id);
    }
    const point = this.points.get(id);
    if (!point) return;
    this.zones.remove(id);
    point.detach();
    point.sync("target");
    point.ped?.remove();
    this.blips.remove(id);
    byPrompt.delete(point.promptId);
    this.points.delete(id);
  }

  clear(): void {
    for (const id of [...this.points.keys(), ...this.modelPoints.keys()])
      this.remove(id);
  }

  /**
   * Checks `canShow` and a function `label` again (prompt mode; targets ask `canShow` when opened and get a changed
   * label re-registered). Call it from a lib state class's `onChange` (the new value is readable there).
   */
  refresh(id?: string): void {
    const mode = style();
    const one = id !== undefined ? this.points.get(id) : undefined;
    for (const [mid, model] of this.modelPoints)
      if (id === undefined || id === mid) model.refresh(mode);
    for (const point of one
      ? [one]
      : id === undefined
        ? this.points.values()
        : []) {
      point.sync(mode);
      if (
        point.style(mode) === "target" &&
        typeof point.options.label === "function" &&
        point.targetLabel !== point.text()
      ) {
        point.detach();
        point.attach(mode);
      }
    }
  }

  isInside(id: string): boolean {
    return this.points.get(id)?.inside ?? false;
  }

  /** Puts every point on the current interaction style (style switch, target resource restart). */
  restyle(): void {
    const mode = style();
    for (const point of this.points.values()) {
      point.detach();
      point.attach(mode);
      point.sync(mode);
    }
    for (const model of this.modelPoints.values()) model.restyle(mode);
  }
}

onPromptPressed((id) => byPrompt.get(id)?.press());
const restyleAll = () => {
  for (const group of groups) group.restyle();
};
onStyleChange(restyleAll);
onTargetChange(restyleAll);
