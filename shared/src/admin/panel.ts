import type { Lookups } from "./lookups";
import type { PanelSchema } from "./schema";

/** One edit, the same shape on every hop. */
export type AdminPatch =
  | {
      file: string;
      action: "set";
      key?: string;
      section: string;
      value: unknown;
    }
  | { file: string; action: "create"; key: string; label: string }
  | { file: string; action: "delete"; key: string }
  /** Whole records from the panel's JSON import (all or none): added, or put in place of the records with those keys. */
  | {
      file: string;
      action: "import";
      records: Record<string, Record<string, unknown>>;
    }
  /** An `action` widget's button: runs the script's `panel.onAction(id, ...)` handler on the record; stores nothing itself. */
  | { file: string; action: "run"; key?: string; id: string };

export type AdminResult = import("../action").ActionResult;

/** What the panel gets per script when it opens: the schema, the script's lang texts and its current data. */
export interface AdminPanelSnapshot {
  resource: string;
  schema: PanelSchema;
  texts: Record<string, string>;
  /** Every file when `loaded`; only the settings files in the open summary. */
  data: Record<string, unknown>;
  /** False in the open summary: the records files come with `ADMIN.panelDataCallback` when the script is opened. */
  loaded?: boolean;
  /** Records files' labels by key (the global search while the records are not loaded). */
  index?: Record<string, Record<string, string>>;
}

/**
 * Another script's own settings screen listed on ai-core's dashboard: opened by its command (`command`, run on the
 * admin's client after ai-core's panel closes) or embedded as a page (`url`, e.g. `https://cfx-nui-<resource>/ui/index.html`).
 */
export interface ExternalPanel {
  id: string;
  resource: string;
  label: string;
  icon?: string;
  description?: string;
  command?: string;
  url?: string;
}

/** What ai-core answers when an admin opens the panel. */
/** A script whose GitHub release is newer than the version running (ai-core's update check). */
export interface UpdateInfo {
  resource: string;
  /** The name people know it by (`monitor` is txAdmin). */
  label: string;
  current: string;
  latest: string;
  url: string;
}

/** A script ai-core recommends on the dashboard while its condition holds and the owner has not dismissed it. */
export interface Recommendation {
  id: string;
  /** ai-core lang keys: the script's name and one line why. */
  title: string;
  desc: string;
  url: string;
  /** Free to get: the card shows a "Free" chip. */
  free: boolean;
}

/** A recommendation that starts showing (`value`) or stops (`null`). */
export interface RecommendationDelta {
  id: string;
  value: Recommendation | null;
}

export interface AdminOpenData {
  panels: AdminPanelSnapshot[];
  lookups: Lookups;
  external: ExternalPanel[];
  updates: UpdateInfo[];
  recommendations: Recommendation[];
}

/** A changed record (records: `key`; settings: no key, `value` is the whole object); `null` = deleted. */
export interface AdminDelta {
  resource: string;
  file: string;
  key?: string;
  value: unknown;
}

/** Exports each panel resource answers for ai-core (registered by the lib's AdminPanel). */
export type AdminPanelResourceExports = {
  AdminPanelSnapshot(): AdminPanelSnapshot;
  /** Every file's content (`AdminPanelSnapshot().data` without building schema and texts). */
  AdminPanelData(): Record<string, unknown>;
  /** Schema, texts, settings files and the records' label index: what the panel needs at opening. */
  AdminPanelSummary(): AdminPanelSnapshot;
  AdminPanelApply(admin: number, patch: unknown): AdminResult;
};
