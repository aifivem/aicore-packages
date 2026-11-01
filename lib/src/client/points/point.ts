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
import type { BlipOptions } from "../blip";
import type { LocalPed, LocalPedOptions } from "../localPed";
import { hidePrompt, showPrompt } from "../prompt";
import type { PromptAnchor } from "@aicore-fivem/shared";
import type { TargetOption } from "./targets/adapter";

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

export class Point {
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

  /** Puts the target option on (a spot, or its ped) while the point is in target mode. */
  attach(mode: Style): void {
    const target = activeTarget();
    if (!target || this.registration || this.style(mode) !== "target") return;
    const option = this.targetOption();
    if (this.ped) {
      const ped = this.ped.entity;
      if (ped)
        this.registration = register(
          target,
          (a) => a.addLocalEntity(ped, option),
          (a) => a.removeLocalEntity(ped, option),
        );
      return;
    }
    // Far points get their target zone too: ai-target only scans zones near the player.
    const { coords, targetRadius } = this.options;
    this.registration = register(
      target,
      (a) => a.addSphere(coords, targetRadius ?? 1, option),
      (a, handle) => a.removeZone(handle, option),
    );
  }

  detach(): void {
    unregister(this.registration);
    this.registration = null;
  }
}
