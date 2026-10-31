import {
  activeTarget,
  onStyleChange,
  onTargetChange,
  readAllowed,
  pointStyle,
  readLabel,
  register,
  runPress,
  style,
  unregister,
  type Registration,
  type Style,
} from "./interact";
import { Blips, type BlipOptions } from "./blip";
import { LocalPed, type LocalPedOptions } from "./localPed";
import {
  ModelPoint,
  type ModelPointOptions,
  type VehiclePointOptions,
} from "./modelPoint";
import { hidePrompt, onPromptPressed, showPrompt } from "./prompt";
import type { PromptAnchor } from "@aicore-fivem/shared";
import type { TargetOption } from "./targets";
import { Zones } from "./zones";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PointOptions {
  coords: Vec3;
  /** The prompt text or target option label (already translated); a function is read again on enter and `refresh()` (text that follows a state). */
  label: string | (() => string);
  /** Font Awesome name of the target option (`fa-solid fa-store` or `store`). */
  icon?: string;
  /** How close the player must be, in metres (default 2). */
  radius?: number;
  /** A cylinder instead of a ball: metres up and down from `coords` (rooms, stations, floors above). */
  height?: number;
  /** Target mode: size of the spot players aim at, in metres (default 1; a room-sized point wants more). */
  targetRadius?: number;
  /** Always a prompt, whatever the owner picked: actions done from a vehicle (fuel pumps, car washes, drive-ins). */
  promptOnly?: boolean;
  /** A target option whenever a target resource runs, whatever the owner picked (seats); else the prompt. */
  preferTarget?: boolean;
  /** As a prompt: drawn over `coords` (or the point / entity spots a function gives when it shows) in the world instead of the right-hand list (doors). */
  world?: boolean | (() => PromptAnchor);
  /** Zone check interval in ms (default 500). */
  interval?: number;
  /** Whether the point is offered now (job, duty, in a vehicle...). Prompts re-check it on `refresh()`. */
  canShow?: () => boolean;
  /** The player used the point. A returned promise blocks this resource's other points until it settles. */
  onPressed: () => unknown;
  /** Inside the radius / left it, whatever the interaction style (markers, previews). */
  onEnter?: () => void;
  onExit?: () => void;
  /** A ped standing at the point (at `coords` unless it has its own); targets go on the ped. */
  ped?: Omit<LocalPedOptions, "coords" | "onSpawn" | "onDespawn"> & {
    coords?: LocalPedOptions["coords"];
  };
  /** A map blip at the point (or at its own `coords`); its `label` is the map name (the place's name, not the prompt text). */
  blip?: Omit<BlipOptions, "coords"> & { coords?: Vec3 };
}

const RESOURCE = GetCurrentResourceName();
const groups = new Set<Points>();
const byPrompt = new Map<string, { press(): void }>();
let nextGroup = 0;

class Point {
  inside = false;
  ped: LocalPed | null = null;
  /** The target option while the point is on a target (a spot, or its ped). */
  registration: Registration | null = null;
  /** The prompt text on screen, null while hidden. */
  shown: string | null = null;
  /** The label the target option was registered with. */
  targetLabel: string | null = null;

  constructor(
    readonly promptId: string,
    readonly options: PointOptions,
  ) {}

  text(): string {
    return readLabel(this.options.label);
  }

  allowed(): boolean {
    return readAllowed(this.options.canShow);
  }

  press(): void {
    runPress(() => this.allowed(), this.options.onPressed);
  }

  /** The prompt follows inside + canShow + the current label (prompt mode only). */
  sync(group: Style): void {
    const text =
      this.style(group) === "prompt" && this.inside && this.allowed()
        ? this.text()
        : null;
    if (text === this.shown) return;
    this.shown = text;
    if (text === null) return hidePrompt(this.promptId);
    const { world } = this.options;
    showPrompt(
      this.promptId,
      text,
      typeof world === "function"
        ? world()
        : world
          ? this.options.coords
          : undefined,
    );
  }

  style(group: Style): Style {
    const mode = pointStyle(this.options, group);
    // A target that cannot take an option at a bare point (interact from JavaScript) leaves such points prompts.
    return mode === "target" &&
      !this.options.ped &&
      activeTarget()?.adapter.coords === false
      ? "prompt"
      : mode;
  }

  targetOption(): TargetOption {
    this.targetLabel = this.text();
    return {
      name: `${RESOURCE}:${this.promptId}`,
      label: this.targetLabel,
      icon: this.options.icon,
      distance: this.options.radius ?? 2,
      canInteract: () => this.allowed(),
      onSelect: () => this.press(),
    };
  }
}

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
        onSpawn: () => this.attach(point, style()),
        onDespawn: () => this.detach(point),
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
    this.attach(point, style());
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
    this.detach(point);
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
        this.detach(point);
        this.attach(point, mode);
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
      this.detach(point);
      this.attach(point, mode);
      point.sync(mode);
    }
    for (const model of this.modelPoints.values()) model.restyle(mode);
  }

  private attach(point: Point, mode: Style): void {
    const target = activeTarget();
    if (!target || point.registration || point.style(mode) !== "target") return;
    const option = point.targetOption();
    if (point.ped) {
      const ped = point.ped.entity;
      if (ped)
        point.registration = register(
          target,
          (a) => a.addLocalEntity(ped, option),
          (a) => a.removeLocalEntity(ped, option),
        );
      return;
    }
    // Far points get their target zone too: ai-target only scans zones near the player.
    const { coords, targetRadius } = point.options;
    point.registration = register(
      target,
      (a) => a.addSphere(coords, targetRadius ?? 1, option),
      (a, handle) => a.removeZone(handle, option),
    );
  }

  private detach(point: Point): void {
    unregister(point.registration);
    point.registration = null;
  }
}

onPromptPressed((id) => byPrompt.get(id)?.press());
const restyleAll = () => {
  for (const group of groups) group.restyle();
};
onStyleChange(restyleAll);
onTargetChange(restyleAll);
