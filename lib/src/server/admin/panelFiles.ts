import {
  ADMIN,
  CORE,
  type FileSpec,
  type PanelSchema,
} from "@aicore-fivem/shared";
import { createLogger, isRecord, type Logger } from "../../shared";
import { FileViews, type RecordReader } from "../../shared/records";
import { resourceExport } from "../../fivem/exports";
import { DataFile } from "../dataFile";
import { applyEdit, type EditPatch } from "./edit";
import { clone } from "./patch";
import { fileSchema, writeSchema } from "./jsonSchema";

const core = resourceExport(CORE.resource);

export type Data = Record<string, unknown>;
/** A record changed (records: its key; settings: no key); `null` = deleted. */
type ChangeHandler = (key: string | undefined, value: unknown) => void;

/** The files of a resource's panel: loaded once, kept in memory, saved on change, announced to code, panels and clients. */
export class PanelFiles {
  protected readonly data = new Map<string, Data>();
  private readonly dataFiles = new Map<string, DataFile>();
  private readonly handlers = new Map<string, ChangeHandler[]>();
  private readonly views = new FileViews((file) => this.get(file));
  /** World files: records changed since start, for clients that read the file FiveM cached at start. */
  protected readonly worldChanges = new Map<string, Data>();
  protected readonly resource = GetCurrentResourceName();
  protected readonly log: Logger = createLogger(this.resource);

  constructor(protected readonly schema: PanelSchema) {
    for (const [name, spec] of Object.entries(schema.files))
      this.load(name, spec);
  }

  /** The current content of a file: the settings object, or `{ key: record }`. Read only. */
  get<T = Data>(file: string): T {
    return (this.data.get(file) ?? {}) as T;
  }

  onChange(file: string, handler: ChangeHandler): void {
    this.handlers.set(file, [...(this.handlers.get(file) ?? []), handler]);
  }

  /** A file parsed by `read`, kept current on every change (settings files; parsed before `onChange` handlers run). */
  view<T>(file: string, read: (raw: unknown) => T): { readonly value: T } {
    return this.views.view(file, read);
  }

  /** A records file parsed per record through `readOne` (null leaves a record out); a change re-reads only that record. */
  records<T>(file: string, readOne: RecordReader<T>): ReadonlyMap<string, T> {
    return this.views.records(file, readOne);
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

  protected store(patch: EditPatch, spec: FileSpec): void {
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
