import {
  ADMIN,
  CORE,
  type AdminPanelSnapshot,
  type AdminPatch,
  type AdminResult,
  type FileSpec,
  type PanelSchema,
} from "@aicore-fivem/shared";
import { createLogger, isRecord, previewJson, type Logger } from "../../shared";
import { FileViews, type RecordReader } from "../../shared/records";
import { registerExport, resourceExport } from "../../fivem/exports";
import { loadLocaleTexts } from "../../fivem/locale";
import { onClientCallback } from "../callback";
import { DataFile } from "../dataFile";
import { applyEdit, checkEdit, type EditPatch, type Rule } from "./edit";
import { clone, toPatch } from "./patch";
import { ERR } from "./validate";
import { fileSchema, writeSchema } from "./jsonSchema";

const core = resourceExport(CORE.resource);

type Data = Record<string, unknown>;
/** A record changed (records: its key; settings: no key); `null` = deleted. */
type ChangeHandler = (key: string | undefined, value: unknown) => void;
/** An `action` widget's handler: a lang key refuses (shown under the button), null succeeds. */
type ActionHandler = (
  admin: number,
  record: Data,
  key: string | undefined,
) => string | null;

/**
 * A resource's panel content: loads `data/<file>.json` once, keeps it in memory, validates every panel edit against
 * the schema, saves it (atomic, debounced), tells its own code, ai-core (open panels) and, for `sync: "all"` files,
 * every client. One instance per resource, created at start.
 */
export class AdminPanel {
  private readonly data = new Map<string, Data>();
  private readonly dataFiles = new Map<string, DataFile>();
  private readonly handlers = new Map<string, ChangeHandler[]>();
  private readonly rules = new Map<string, Rule>();
  private readonly actions = new Map<string, ActionHandler>();
  private readonly views = new FileViews((file) => this.get(file));
  /** World files: records changed since start, for clients that read the file FiveM cached at start. */
  private readonly worldChanges = new Map<string, Data>();
  private readonly resource = GetCurrentResourceName();
  private readonly log: Logger = createLogger(this.resource);
  /**
   * The admin whose panel edit or action is being applied, readable in `rule`, `onChange` and `onAction` handlers;
   * 0 for the resource's own `commit`. Set by the lib only.
   */
  editor = 0;

  constructor(private readonly schema: PanelSchema) {
    for (const [name, spec] of Object.entries(schema.files))
      this.load(name, spec);
    registerExport("AdminPanelSnapshot", () => this.snapshot());
    registerExport("AdminPanelData", () => this.dataSnapshot());
    registerExport("AdminPanelSummary", () => this.summary());
    registerExport("AdminPanelApply", (admin: number, patch: unknown) =>
      this.apply(admin, patch),
    );
    // Each client mirror asks once at its start (a resource may hold a few mirrors): a hostile client cannot pull the
    // whole change set over and over.
    onClientCallback(
      ADMIN.worldChangesCallback(this.resource),
      () => Object.fromEntries(this.worldChanges),
      { rate: { count: 4, windowMs: 10_000 } },
    );
    // After every resource's exports exist (ai-core registers its own panel too).
    setImmediate(() => core.RegisterAdminPanel(this.resource));
  }

  /** The current content of a file: the settings object, or `{ key: record }`. Read only. */
  get<T = Data>(file: string): T {
    return (this.data.get(file) ?? {}) as T;
  }

  onChange(file: string, handler: ChangeHandler): void {
    this.handlers.set(file, [...(this.handlers.get(file) ?? []), handler]);
  }

  rule(file: string, rule: Rule): void {
    this.rules.set(file, rule);
  }

  /** Runs when an admin presses the `action` widget whose `path` is `id` (on a record, or the settings object). */
  onAction(id: string, handler: ActionHandler): void {
    this.actions.set(id, handler);
  }

  /** A file parsed by `read`, kept current on every change (settings files; parsed before `onChange` handlers run). */
  view<T>(file: string, read: (raw: unknown) => T): { readonly value: T } {
    return this.views.view(file, read);
  }

  /** A records file parsed per record through `readOne` (null leaves a record out); a change re-reads only that record. */
  records<T>(file: string, readOne: RecordReader<T>): ReadonlyMap<string, T> {
    return this.views.records(file, readOne);
  }

  snapshot(): AdminPanelSnapshot {
    return {
      resource: this.resource,
      schema: this.schema,
      texts: loadLocaleTexts(),
      data: this.dataSnapshot(),
    };
  }

  /** Every file's content without schema and texts (the panel already has them from `summary()`). */
  dataSnapshot(): Data {
    return clone(Object.fromEntries(this.data));
  }

  /**
   * What the panel needs at opening: schema, texts, the settings files and each records file's labels by key (for the
   * global search). The records themselves come with `snapshot()` when the admin opens this script.
   */
  summary(): AdminPanelSnapshot {
    const data: Data = {};
    const index: Record<string, Record<string, string>> = {};
    for (const [file, spec] of Object.entries(this.schema.files)) {
      const content = this.data.get(file);
      if (spec.kind !== "records") {
        data[file] = clone(content ?? {});
        continue;
      }
      const labels: Record<string, string> = {};
      for (const [key, record] of Object.entries(content ?? {}))
        labels[key] = labelOf(record, spec.labelPath) ?? key;
      index[file] = labels;
    }
    return {
      resource: this.resource,
      schema: this.schema,
      texts: loadLocaleTexts(),
      data,
      loaded: false,
      index,
    };
  }

  /** A panel edit (ai-core checked the admin and the rate): validate, store, save, announce. */
  apply(admin: number, raw: unknown): AdminResult {
    const patch = toPatch(raw);
    const spec = patch ? this.schema.files[patch.file] : undefined;
    if (!patch || !spec) return { ok: false, error: ERR.type };
    this.editor = admin;
    try {
      if (patch.action === "run") return this.run(admin, patch, spec);
      if (spec.memory) return { ok: false, error: ERR.type };
      const error = checkEdit(patch, spec, {
        get: (file) => this.get(file),
        rule: (file) => this.rules.get(file),
      });
      if (error) {
        this.log.warn(
          `admin ${admin} edit refused (${error}): ${previewJson(patch, 300)}`,
        );
        return { ok: false, error };
      }
      this.store(patch, spec);
      return { ok: true };
    } finally {
      this.editor = 0;
    }
  }

  /** An `action` widget pressed: the script's handler decides; nothing is stored here. */
  private run(
    admin: number,
    patch: Extract<AdminPatch, { action: "run" }>,
    spec: FileSpec,
  ): AdminResult {
    const handler = this.actions.get(patch.id);
    const data = this.get(patch.file);
    const target = spec.kind === "records" ? data[patch.key ?? ""] : data;
    if (!handler || !isRecord(target)) return { ok: false, error: ERR.type };
    try {
      const error = handler(admin, clone(target), patch.key);
      return error ? { ok: false, error } : { ok: true };
    } catch (error) {
      this.log.error(`panel action ${patch.id} failed`, error);
      return { ok: false, error: ERR.type };
    }
  }

  /** A change made by the resource itself (game state the panel shows), stored without validation (a `memory` file only in memory). */
  commit(file: string, key: string | undefined, value: unknown): void {
    const data = this.data.get(file);
    if (!data) return;
    if (key === undefined) {
      if (isRecord(value)) this.data.set(file, clone(value));
    } else if (value === null) delete data[key];
    else data[key] = clone(value);
    this.changed(file, key);
  }

  /** `commit` after the current change has reached the panel (a form that resets itself after an admin sent it). */
  commitAfter(file: string, key: string | undefined, value: unknown): void {
    setImmediate(() => this.commit(file, key, value));
  }

  private store(patch: EditPatch, spec: FileSpec): void {
    const data = this.data.get(patch.file) ?? {};
    const keys = applyEdit(data, patch, spec);
    if (keys.length === 0) return;
    this.data.set(patch.file, data);
    for (const key of keys) this.changed(patch.file, key);
  }

  /** Save, then tell the resource's code, open panels and (world files) every client. */
  private changed(file: string, key: string | undefined): void {
    const spec = this.schema.files[file];
    const data = this.get(file);
    const value = key === undefined ? data : (data[key] ?? null);
    this.dataFiles.get(file)?.write(data);
    this.views.changed(file, key, value);
    for (const handler of this.handlers.get(file) ?? []) handler(key, value);
    core.AdminPanelChanged({
      resource: this.resource,
      file,
      key,
      value: clone(value),
    });
    if (spec?.sync !== "all") return;
    const changes = this.worldChanges.get(file) ?? {};
    changes[key ?? ""] = clone(value);
    this.worldChanges.set(file, changes);
    emitNet(ADMIN.worldEvent(this.resource), -1, file, key ?? null, value);
  }

  private load(name: string, spec: FileSpec): void {
    if (spec.memory) {
      this.data.set(name, {});
      return;
    }
    const file = new DataFile(this.resource, name, this.log);
    this.dataFiles.set(name, file);
    file.schemaRef = `./schemas/${name}.schema.json`;
    writeSchema(
      this.resource,
      name,
      fileSchema(this.resource, this.schema, name, spec),
      this.log,
    );
    const raw = file.read();
    const data: Data = isRecord(raw) ? raw : {};
    let filled = false;
    if (spec.kind === "settings") {
      for (const [section, value] of Object.entries(spec.defaults ?? {})) {
        if (section in data) continue;
        data[section] = clone(value);
        filled = true;
      }
    }
    this.data.set(name, data);
    if (filled || raw === null || !file.hasSchemaRef()) file.write(data);
  }
}

/** A record's label at a dotted path (`labelPath`), when it is a text. */
function labelOf(record: unknown, path: string | undefined): string | null {
  if (!path) return null;
  let at: unknown = record;
  for (const part of path.split(".")) {
    if (typeof at !== "object" || at === null) return null;
    at = (at as Record<string, unknown>)[part];
  }
  return typeof at === "string" && at !== "" ? at : null;
}
