import {
  CORE,
  LIB_UI,
  LOCKPICK_AREAS,
  MENU_EVENTS,
  SKILL_STAGES,
  type LockpickResult,
  type SkillDifficulty,
  type SkillStage,
  type InputRequest,
  type ItemPickerRequest,
  type MenuRequest,
  type PickedItem,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const ui = resourceExport(LIB_UI.resource);
/** The item picker is an admin tool of ai-core (it needs ai-core's inventory layer). */
const core = resourceExport(CORE.resource);

export interface MenuListeners {
  /** The item under the pointer or focus (live previews). */
  onHover?: (item: string) => void;
  /** A switch row (`checked` item) was flipped; the menu stays open. */
  onToggle?: (item: string, checked: boolean) => void;
}

/** Menus, input dialogs and minigames this resource asked ai-lib (the item picker: ai-core) for, waiting for the player's answer. */
class Requests {
  private readonly resource = GetCurrentResourceName();
  private readonly waiting = new Map<number, (value: unknown) => void>();
  private readonly hovers = new Map<number, MenuListeners>();
  private nextId = 0;

  constructor() {
    const answer = (owner: unknown, id: unknown, value: unknown) => {
      if (owner !== this.resource || typeof id !== "number") return;
      this.waiting.get(id)?.(value);
      this.waiting.delete(id);
      this.hovers.delete(id);
    };
    on(MENU_EVENTS.menuHover, (owner: unknown, id: unknown, item: unknown) => {
      if (
        owner === this.resource &&
        typeof id === "number" &&
        typeof item === "string"
      )
        this.hovers.get(id)?.onHover?.(item);
    });
    on(
      MENU_EVENTS.menuToggle,
      (owner: unknown, id: unknown, item: unknown, checked: unknown) => {
        if (
          owner === this.resource &&
          typeof id === "number" &&
          typeof item === "string" &&
          typeof checked === "boolean"
        )
          this.hovers.get(id)?.onToggle?.(item, checked);
      },
    );
    on(MENU_EVENTS.menuResult, answer);
    on(MENU_EVENTS.inputResult, answer);
  }

  ask(
    open: (id: number) => void,
    read: (value: unknown) => void,
    listeners?: MenuListeners,
  ): void {
    const id = ++this.nextId;
    this.waiting.set(id, read);
    if (listeners) this.hovers.set(id, listeners);
    open(id);
  }
}

const requests = new Requests();

/**
 * Shows ai-lib's menu and resolves with the picked item id, or null when the player closed it. The second argument is
 * `onHover` (the item under the pointer or focus, for live previews) or `{ onHover, onToggle }`: items with `checked`
 * are switch rows that flip in place without closing the menu. Arrows move, Enter picks; in a sub menu (`back: true`)
 * a short Escape resolves `MENU_BACK` and holding Escape closes (null).
 */
export function menu(
  request: MenuRequest,
  listeners?: ((item: string) => void) | MenuListeners,
): Promise<string | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => ui.OpenMenu(id, request),
      (value) => resolve(typeof value === "string" ? value : null),
      typeof listeners === "function" ? { onHover: listeners } : listeners,
    ),
  );
}

/** Shows ai-lib's input dialog and resolves with the entered values by field name, or null when closed. */
export function input(
  request: InputRequest,
): Promise<Record<string, string | number> | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => ui.OpenInput(id, request),
      (value) => {
        if (typeof value !== "object" || value === null) return resolve(null);
        const out: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(value))
          if (typeof v === "string" || typeof v === "number") out[k] = v;
        resolve(out);
      },
    ),
  );
}

/**
 * Shows ai-core's item picker (admin tools; the item list is only sent to admins): every item of the active inventory
 * with its picture and a search; clicks fill a list on the right (1, Ctrl 10, Shift 100) that stops at `target`'s
 * weight limit. Resolves with the list when the player takes it, null when closed. The caller's server gives the
 * items and checks every one.
 */
export function itemPicker(
  request: ItemPickerRequest,
): Promise<PickedItem[] | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => core.OpenItemPicker(id, request),
      (value) => {
        if (!Array.isArray(value)) return resolve(null);
        resolve(
          value.flatMap((v: unknown) =>
            typeof v === "object" &&
            v !== null &&
            "name" in v &&
            "count" in v &&
            typeof v.name === "string" &&
            typeof v.count === "number" &&
            Number.isInteger(v.count) &&
            v.count > 0
              ? [{ name: v.name, count: v.count }]
              : [],
          ),
        );
      },
    ),
  );
}

const stageOf = (d: SkillDifficulty): SkillStage =>
  typeof d === "string"
    ? (SKILL_STAGES[d] ?? SKILL_STAGES.easy)
    : {
        area: Math.min(180, Math.max(5, d.areaSize)),
        speed:
          SKILL_STAGES.easy.speed *
          Math.min(5, Math.max(0.2, d.speedMultiplier)),
      };

/**
 * ai-lib's skill check: a needle runs around a ring once per stage, the player presses the shown key while it is
 * on the green arc. Resolves true when every stage was hit, false on a miss, a wrong key or Escape. Stages are
 * `"easy" | "medium" | "hard"` or ox_lib's `{ areaSize, speedMultiplier }`; each stage shows one of `keys` (default E).
 * A result decides a client-side step only: the server keeps checking what it allows.
 */
export function skillCheck(
  difficulty: SkillDifficulty | SkillDifficulty[],
  keys: string[] = ["e"],
): Promise<boolean> {
  const stages = (Array.isArray(difficulty) ? difficulty : [difficulty])
    .slice(0, 20)
    .map(stageOf);
  const keyList = keys
    .filter((k) => typeof k === "string" && /^[a-z0-9]$/i.test(k))
    .map((k) => k.toLowerCase());
  return new Promise((resolve) =>
    requests.ask(
      (id) =>
        ui.OpenMinigame(id, {
          kind: "skillCheck",
          stages,
          keys: keyList.length ? keyList : ["e"],
        }),
      (value) => resolve(value === true),
    ),
  );
}

export interface LockpickOptions {
  /** Width of each pin's sweet spot (default "medium"). */
  difficulty?: "easy" | "medium" | "hard";
  /** Pins to turn one after another (default 1). */
  pins?: number;
  /** Picks the player may break before it fails as "broken" (default 1). */
  picks?: number;
}

/**
 * ai-lib's lockpick: the player moves the pick with A / D (or the arrows), holds W to turn the lock; the lock turns
 * further the closer the pick is to the hidden sweet spot, forcing it wears the pick down. Resolves "opened" when
 * every pin turned, "broken" when the last pick broke (take the item), "cancelled" on Escape.
 */
export function lockpick(
  options: LockpickOptions = {},
): Promise<LockpickResult> {
  return new Promise((resolve) =>
    requests.ask(
      (id) =>
        ui.OpenMinigame(id, {
          kind: "lockpick",
          pins: Math.min(6, Math.max(1, Math.floor(options.pins ?? 1))),
          area: LOCKPICK_AREAS[options.difficulty ?? "medium"],
          picks: Math.min(10, Math.max(1, Math.floor(options.picks ?? 1))),
        }),
      (value) =>
        resolve(value === "opened" || value === "broken" ? value : "cancelled"),
    ),
  );
}
