import { CORE } from "@aicore-fivem/shared";
import { callExport, isResourceStarted } from "../fivem/exports";
import { createLogger } from "../shared";
import { Blips, type BlipOptions } from "./blip";
import { LocalPed, type LocalPedOptions } from "./localPed";
import { hidePrompt, onPromptPressed, showPrompt } from "./prompt";
import { Zones } from "./zones";

const log = createLogger(GetCurrentResourceName());

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PointOptions {
  coords: Vec3;
  /** The prompt text or target option label (already translated). */
  label: string;
  /** Font Awesome name of the target option (`fa-solid fa-store` or `store`). */
  icon?: string;
  /** How close the player must be, in metres (default 2). */
  radius?: number;
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
  ped?: Omit<LocalPedOptions, "coords" | "onSpawn" | "onDespawn"> & { coords?: LocalPedOptions["coords"] };
  /** A map blip at the point, named after `label` unless it has its own. */
  blip?: Omit<BlipOptions, "coords" | "label"> & { label?: string };
}

type Style = "prompt" | "target";
const TARGET = "ox_target";
const target = (name: string, ...args: unknown[]) => callExport(TARGET, name, ...args);
/** Prompt mode, or target mode when the owner picked it and a resource answers the ox_target API (ai-target does). */
const style = (): Style => (GlobalState[CORE.interactionStateKey] === "target" && isResourceStarted(TARGET) ? "target" : "prompt");

const groups = new Set<Points>();
const byPrompt = new Map<string, Point>();
let busy = false;
let nextGroup = 0;

class Point {
  inside = false;
  ped: LocalPed | null = null;
  targetZone: unknown = null;
  shown = false;

  constructor(
    readonly promptId: string,
    readonly options: PointOptions,
  ) {}

  allowed(): boolean {
    try {
      return this.options.canShow?.() ?? true;
    } catch (error) {
      log.error("point canShow failed", error);
      return false;
    }
  }

  press(): void {
    if (busy || !this.allowed()) return;
    let result: unknown;
    try {
      result = this.options.onPressed();
    } catch (error) {
      return log.error("point onPressed failed", error);
    }
    if (!(result instanceof Promise)) return;
    busy = true;
    result.catch((error: unknown) => log.error("point onPressed failed", error)).finally(() => (busy = false));
  }

  /** The prompt follows inside + canShow (prompt mode only). */
  sync(mode: Style): void {
    const show = mode === "prompt" && this.inside && this.allowed();
    if (show === this.shown) return;
    this.shown = show;
    if (show) showPrompt(this.promptId, this.options.label);
    else hidePrompt(this.promptId);
  }

  targetOption() {
    return [
      {
        name: this.promptId,
        label: this.options.label,
        icon: this.options.icon,
        distance: this.options.radius ?? 2,
        canInteract: () => this.allowed(),
        onSelect: () => this.press(),
      },
    ];
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
        onSpawn: (entity) => style() === "target" && target("addLocalEntity", entity, point.targetOption()),
        onDespawn: (entity) => style() === "target" && target("removeLocalEntity", entity, point.promptId),
      });
    }
    if (options.blip) this.blips.add(id, { ...options.blip, coords: options.coords, label: options.blip.label ?? options.label });
    this.zones.add(id, {
      shape: { type: "sphere", center: options.coords, radius: options.radius ?? 2 },
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

  remove(id: string): void {
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
    for (const id of [...this.points.keys()]) this.remove(id);
  }

  /** Checks `canShow` again for the points the player is at (prompt mode; targets ask when opened). */
  refresh(id?: string): void {
    const mode = style();
    if (id !== undefined) this.points.get(id)?.sync(mode);
    else for (const point of this.points.values()) point.sync(mode);
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
  }

  private attach(point: Point, mode: Style): void {
    if (mode !== "target") return;
    const ped = point.ped?.entity;
    if (point.ped) {
      if (ped) target("addLocalEntity", ped, point.targetOption());
      return;
    }
    point.targetZone = target("addSphereZone", { coords: point.options.coords, radius: 1, options: point.targetOption() });
  }

  private detach(point: Point): void {
    if (!isResourceStarted(TARGET)) return void (point.targetZone = null);
    if (point.targetZone != null) target("removeZone", point.targetZone);
    point.targetZone = null;
    const ped = point.ped?.entity;
    if (ped) target("removeLocalEntity", ped, point.promptId);
  }
}

onPromptPressed((id) => byPrompt.get(id)?.press());
const restyleAll = () => {
  for (const group of groups) group.restyle();
};
AddStateBagChangeHandler(CORE.interactionStateKey, "global", () => setTimeout(restyleAll, 0));
for (const event of ["onClientResourceStart", "onClientResourceStop"])
  on(event, (resource: string) => {
    if (resource === TARGET || resource === "ai-target") setTimeout(restyleAll, 0);
  });
