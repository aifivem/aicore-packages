import { every } from "../../fivem/scheduler/every";
import {
  activeTarget,
  pointStyle,
  readAllowed,
  readLabel,
  register,
  runPress,
  unregister,
  type Registration,
  type Style,
} from "./interact";
import { scanModelPoint, stopModelPoint } from "./modelHost";
import { hidePrompt, showPrompt } from "../prompt";
import type { TargetOption } from "./targets/adapter";

export interface ModelPointOptions {
  /** World objects this point is on (ATMs, vending machines, dumpsters). */
  models: Array<string | number>;
  /** The models are vehicles (boats, trucks): the prompt scan looks at nearby vehicles instead of objects. */
  vehicles?: boolean;
  label: string | (() => string);
  icon?: string;
  /** How close to the object, in metres (default 1.5). */
  radius?: number;
  /** Object points are skipped while the player sits in a vehicle (no scan, no prompt) unless this is true. */
  inVehicle?: boolean;
  /** A target option whenever a target resource runs, whatever the owner picked (seats); else the prompt. */
  preferTarget?: boolean;
  /** Gets the object in question (0 when unknown). */
  canShow?: (entity: number) => boolean;
  /** Gets the object used. A returned promise blocks this resource's other points until it settles. */
  onPressed: (entity: number) => unknown;
}

/** A point on every vehicle (`Points.addVehicle`): the target's global vehicle option, or a prompt at the nearest one. */
export type VehiclePointOptions = Omit<
  ModelPointOptions,
  "models" | "vehicles"
>;

const RESOURCE = GetCurrentResourceName();
/** Prompt-mode points with an object near the player: `canShow` and the label are read again while they stay near. */
const near = new Set<ModelPoint>();
const recheck = every(
  500,
  () => {
    for (const point of near) point.sync();
  },
  { active: false, name: "modelPrompts" },
);

/**
 * A point on every world object of some models: a target option on the models in target mode, otherwise a prompt
 * while the player is near one of them. The scan for the nearest object runs in ai-lib for every resource
 * (`modelHost.ts`); this resource only reads `canShow` and the label while one is near.
 */
export class ModelPoint {
  private readonly hashes: number[];
  private entity = 0;
  private shown: string | null = null;
  private registration: Registration | null = null;
  private scanning = false;
  /** Every networked vehicle, whatever its model (`Points.addVehicle`). */
  private readonly global: boolean;

  constructor(
    readonly promptId: string,
    readonly options: ModelPointOptions,
  ) {
    this.hashes = options.models.map((m) =>
      typeof m === "number" ? m : GetHashKey(m),
    );
    this.global = options.vehicles === true && options.models.length === 0;
  }

  attach(mode: Style): void {
    const target = activeTarget();
    if (target && pointStyle(this.options, mode) === "target") {
      const option = this.targetOption();
      const { models } = this.options;
      this.registration = this.global
        ? register(
            target,
            (a) => a.addGlobalVehicle(option),
            (a) => a.removeGlobalVehicle(option),
          )
        : register(
            target,
            (a) => a.addModels(models, option),
            (a) => a.removeModels(models, option),
          );
      // Not ready yet (client still loading): a prompt until the target starts and restyles every point.
      if (this.registration) return;
    }
    this.scanning = true;
    scanModelPoint(
      this.promptId,
      {
        models: this.hashes,
        vehicles: this.options.vehicles === true,
        radius: this.options.radius ?? 1.5,
        inVehicle: this.options.inVehicle === true,
      },
      (entity) => this.nearest(entity),
    );
  }

  detach(): void {
    unregister(this.registration);
    this.registration = null;
    if (this.scanning) stopModelPoint(this.promptId);
    this.scanning = false;
    this.nearest(0);
  }

  /** Puts the point on the current style; a prompt that stays a prompt keeps its scan (no flicker on a target restart). */
  restyle(mode: Style): void {
    const wantsTarget =
      activeTarget() !== null && pointStyle(this.options, mode) === "target";
    if (this.scanning && !wantsTarget) return;
    this.detach();
    this.attach(mode);
  }

  /** `refresh()`: a prompt reads `canShow` and the label again, a target option with a label function is put on again. */
  refresh(mode: Style): void {
    if (this.scanning) return this.sync();
    if (this.registration && typeof this.options.label === "function") {
      this.detach();
      this.attach(mode);
    }
  }

  press(): void {
    if (this.entity) this.run(this.entity);
  }

  /** The prompt follows the nearest object, its `canShow` and the current label. */
  sync(): void {
    const entity = this.entity;
    this.show(
      entity && readAllowed(this.options.canShow, entity)
        ? readLabel(this.options.label)
        : null,
    );
  }

  private nearest(entity: number): void {
    this.entity = entity;
    if (entity) near.add(this);
    else near.delete(this);
    recheck.set(near.size > 0);
    this.sync();
  }

  private targetOption(): TargetOption {
    return {
      name: `${RESOURCE}:${this.promptId}`,
      label: readLabel(this.options.label),
      icon: this.options.icon,
      distance: this.options.radius ?? 1.5,
      canInteract: (entity) => readAllowed(this.options.canShow, entity),
      onSelect: (entity) => this.run(entity),
    };
  }

  private run(entity: number): void {
    runPress(
      () => readAllowed(this.options.canShow, entity),
      () => this.options.onPressed(entity),
    );
  }

  private show(text: string | null): void {
    if (text === this.shown) return;
    this.shown = text;
    if (text !== null) showPrompt(this.promptId, text);
    else hidePrompt(this.promptId);
  }
}
