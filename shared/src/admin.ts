/**
 * Admin panel contract: every ai-* resource describes its panel content in one JSON-safe schema; ai-core hosts the
 * panel, the resource keeps, validates and saves its own `data/*.json` (the lib's `AdminPanel`).
 */

/** Data model of one value (server validation). Every spec may be `optional` (absent allowed). */
export type DataSpec =
  | { type: "text"; min?: number; max?: number; pattern?: string; optional?: boolean }
  | { type: "number"; min?: number; max?: number; integer?: boolean; optional?: boolean }
  | { type: "bool"; optional?: boolean }
  | { type: "enum"; values: Array<string | number>; optional?: boolean }
  | { type: "names"; max?: number; itemMax?: number; pattern?: string; optional?: boolean }
  | { type: "vec3"; optional?: boolean }
  | { type: "vec4"; optional?: boolean }
  | { type: "object"; fields: Record<string, DataSpec>; optional?: boolean }
  | { type: "list"; of: DataSpec; min?: number; max?: number; optional?: boolean };

/**
 * A data file: `settings` is one object (its top-level keys are the sections), `records` is `{ key: record }`.
 * `sync: "all"` files are in the resource's `files` and every client mirrors them; `"admin"` files stay on the server.
 */
export interface FileSpec {
  kind: "settings" | "records";
  sync: "all" | "admin";
  sections: Record<string, DataSpec>;
  /** records: allowed keys (default lowercase letters, digits, underscores, 2-32 long). */
  keyPattern?: string;
  /** records: section holding the name shown in lists and dialogs. */
  labelPath?: string;
  /** records: the new record a create starts from (the typed name goes to `labelPath`). */
  newRecord?: Record<string, unknown>;
  /** records: keys that can never be deleted (e.g. the unemployed job). */
  locked?: string[];
  /** settings: sections a file is missing are filled from here at load (a setting added in an update). */
  defaults?: Record<string, unknown>;
  /** Runtime state the script fills with `commit` (a live list the panel shows): never read from or saved to disk, never edited in the panel. */
  memory?: boolean;
}

/** Controls of the panel; `path` is dotted from the record (or the settings object), a write replaces its section. */
export type WidgetSpec = WidgetBase &
  (
    | { widget: "text"; placeholder?: string }
    | { widget: "number"; min?: number; max?: number; step?: number; unit?: string }
    | { widget: "switch" }
    | { widget: "select"; options: Array<{ value: string | number; label: string }> }
    | { widget: "tags"; placeholder?: string }
    | {
        widget: "point";
        heading?: boolean;
        /** "camera": "Use my position" takes the game camera instead of the ped. */
        from?: "camera";
        /** The point is on the floor (teleported to with SetEntityCoords); without it the ped's own root height. */
        ground?: boolean;
      }
    | { widget: "list"; rows: WidgetSpec[]; newRow: Record<string, unknown>; addLabel: string; rowLabel?: string; max?: number }
    /** Read only: shows the value (state the script fills in, e.g. a default it reports). */
    | ({ widget: "info"; mono?: boolean } & ValueLabels)
  );

/** How a read-only value is shown: stored values with a lang key show that text; an empty value shows `empty`. */
export interface ValueLabels {
  /** Lang keys of stored values (a value without an entry shows as it is). */
  values?: Record<string, string>;
  /** Lang key shown for an empty value. */
  empty?: string;
}

/** A column of a read-only table tab: the value at `path` of each record. */
export interface TableColumn extends ValueLabels {
  path: string;
  /** Lang key of the header. */
  label: string;
  /** Relative width (default 1). */
  width?: number;
  mono?: boolean;
}

export interface TableSpec {
  columns: TableColumn[];
  /** Path the rows are sorted by (default the record key). */
  sort?: string;
}

interface WidgetBase {
  path: string;
  /** Lang key of the label. */
  label: string;
  /** Lang key of a one-sentence hint (unit, rule, what it does in game). */
  hint?: string;
}

export interface CardSpec {
  /** Font Awesome solid icon name without `fa-` (e.g. "briefcase"). */
  icon: string;
  title: string;
  desc?: string;
  fields: WidgetSpec[];
}

export interface TabSpec {
  id: string;
  file: string;
  icon: string;
  label: string;
  /** One sentence: what this tab sets up in the game. */
  desc: string;
  cards: CardSpec[];
  /** records: a second line in list rows (path of a value). */
  listSub?: string;
  /** records: lang keys of the create button and of the delete button (a short verb, also the dialog's action). */
  createLabel?: string;
  deleteLabel?: string;
  /** records: lang key of what deleting a record leaves behind, shown in the delete dialog (default: the generic text). */
  deleteDesc?: string;
  /** records: show the file as one read-only, searchable table (a row per record) instead of list + editor; `cards` stays empty. */
  table?: TableSpec;
}

export interface PanelSchema {
  /** Lang key of the script's name in the panel sidebar. */
  title: string;
  icon: string;
  files: Record<string, FileSpec>;
  tabs: TabSpec[];
}

/** One edit, the same shape on every hop. */
export type AdminPatch =
  | { file: string; action: "set"; key?: string; section: string; value: unknown }
  | { file: string; action: "create"; key: string; label: string }
  | { file: string; action: "delete"; key: string };

export type AdminResult = { ok: true } | { ok: false; error: string };

/** What the panel gets per script when it opens: the schema, the script's lang texts and its current data. */
export interface AdminPanelSnapshot {
  resource: string;
  schema: PanelSchema;
  texts: Record<string, string>;
  data: Record<string, unknown>;
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
  AdminPanelApply(admin: number, patch: unknown): AdminResult;
};

/** Event names of the admin panel (owned by ai-core). */
export const ADMIN = {
  /** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
  ace: "ai.admin",
  /** Callback: (keybinds: KeybindInfo[] the admin's client knows) -> AdminPanelSnapshot[]. */
  openCallback: "ai-core:admin:open",
  applyCallback: "ai-core:admin:apply",
  closeEvent: "ai-core:admin:close",
  /** Server -> client: () open the panel (the `aiadmin` command, checked on the server). */
  showEvent: "ai-core:admin:show",
  /** Server -> admins with the panel open: (delta: AdminDelta). */
  deltaEvent: "ai-core:admin:delta",
  /** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
  worldEvent: (resource: string): string => `${resource}:admin:world`,
  /** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
  worldChangesCallback: (resource: string): string => `${resource}:admin:worldChanges`,
} as const;
