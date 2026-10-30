import {
  ADMIN,
  CORE,
  type AdminPanelSnapshot,
  type AdminPatch,
  type AdminResult,
  type FileSpec,
  type PanelSchema,
} from "@aicore-fivem/shared"
import { createLogger, isRecord, type Logger } from "../../shared"
import { registerExport, resourceExport } from "../../fivem/exports"
import { loadLocaleTexts } from "../../fivem/locale"
import { onClientCallback } from "../callback"
import { DataFile } from "../dataFile"
import { clone, toPatch } from "./patch"
import { ERR, validate } from "./validate"

const core = resourceExport(CORE.resource)

type Data = Record<string, unknown>
/** A record changed (records: its key; settings: no key); `null` = deleted. */
type ChangeHandler = (key: string | undefined, value: unknown) => void
/** Cross-field check on the value about to be stored: a lang key refuses it. */
type Rule = (key: string | undefined, next: Data) => string | null

const DEFAULT_KEY = "^[a-z0-9_]{2,32}$"

/**
 * A resource's panel content: loads `data/<file>.json` once, keeps it in memory, validates every panel edit against
 * the schema, saves it (atomic, debounced), tells its own code, ai-core (open panels) and, for `sync: "all"` files,
 * every client. One instance per resource, created at start.
 */
export class AdminPanel {
  private readonly data = new Map<string, Data>()
  private readonly dataFiles = new Map<string, DataFile>()
  private readonly handlers = new Map<string, ChangeHandler[]>()
  private readonly rules = new Map<string, Rule>()
  /** World files: records changed since start, for clients that read the file FiveM cached at start. */
  private readonly worldChanges = new Map<string, Data>()
  private readonly resource = GetCurrentResourceName()
  private readonly log: Logger = createLogger(this.resource)

  constructor(private readonly schema: PanelSchema) {
    for (const [name, spec] of Object.entries(schema.files))
      this.load(name, spec)
    registerExport("AdminPanelSnapshot", () => this.snapshot())
    registerExport("AdminPanelApply", (admin: number, patch: unknown) =>
      this.apply(admin, patch)
    )
    onClientCallback(ADMIN.worldChangesCallback(this.resource), () =>
      Object.fromEntries(this.worldChanges)
    )
    // After every resource's exports exist (ai-core registers its own panel too).
    setImmediate(() => core.RegisterAdminPanel(this.resource))
  }

  /** The current content of a file: the settings object, or `{ key: record }`. Read only. */
  get<T = Data>(file: string): T {
    return (this.data.get(file) ?? {}) as T
  }

  onChange(file: string, handler: ChangeHandler): void {
    this.handlers.set(file, [...(this.handlers.get(file) ?? []), handler])
  }

  rule(file: string, rule: Rule): void {
    this.rules.set(file, rule)
  }

  snapshot(): AdminPanelSnapshot {
    return {
      resource: this.resource,
      schema: this.schema,
      texts: loadLocaleTexts(),
      data: clone(Object.fromEntries(this.data)),
    }
  }

  /** A panel edit (ai-core checked the admin and the rate): validate, store, save, announce. */
  apply(admin: number, raw: unknown): AdminResult {
    const patch = toPatch(raw)
    const spec = patch ? this.schema.files[patch.file] : undefined
    if (!patch || !spec || spec.memory) return { ok: false, error: ERR.type }
    const error = this.check(patch, spec)
    if (error) {
      this.log.warn(
        `admin ${admin} edit refused (${error}): ${JSON.stringify(patch).slice(0, 300)}`
      )
      return { ok: false, error }
    }
    this.store(patch, spec)
    return { ok: true }
  }

  /** A change made by the resource itself (game state the panel shows), stored without validation (a `memory` file only in memory). */
  commit(file: string, key: string | undefined, value: unknown): void {
    const data = this.data.get(file)
    if (!data) return
    if (key === undefined) {
      if (isRecord(value)) this.data.set(file, clone(value))
    } else if (value === null) delete data[key]
    else data[key] = clone(value)
    this.changed(file, key)
  }

  private check(patch: AdminPatch, spec: FileSpec): string | null {
    const data = this.get(patch.file)
    if (patch.action === "create") {
      if (
        spec.kind !== "records" ||
        !new RegExp(spec.keyPattern ?? DEFAULT_KEY).test(patch.key)
      )
        return ERR.pattern
      if (patch.key in data) return "ADMIN_ERR_EXISTS"
      return null
    }
    if (patch.action === "delete") {
      if (spec.kind !== "records" || !(patch.key in data)) return ERR.type
      return spec.locked?.includes(patch.key) ? "ADMIN_ERR_LOCKED" : null
    }
    const section = spec.sections[patch.section]
    if (!section) return ERR.type
    if (spec.kind === "records" && (!patch.key || !(patch.key in data)))
      return ERR.type
    const refusal = validate(section, patch.value, patch.section)
    if (refusal) return refusal.error
    const current = spec.kind === "records" ? data[patch.key ?? ""] : data
    const next = {
      ...(isRecord(current) ? current : {}),
      [patch.section]: patch.value,
    }
    return this.rules.get(patch.file)?.(patch.key, next) ?? null
  }

  private store(patch: AdminPatch, spec: FileSpec): void {
    const data = this.data.get(patch.file) ?? {}
    if (patch.action === "create") {
      const record = clone(spec.newRecord ?? {})
      if (spec.labelPath) record[spec.labelPath] = patch.label
      data[patch.key] = record
    } else if (patch.action === "delete") {
      delete data[patch.key]
    } else {
      const target = spec.kind === "records" ? data[patch.key ?? ""] : data
      if (!isRecord(target)) return
      if (patch.value === undefined || patch.value === null)
        delete target[patch.section]
      else target[patch.section] = clone(patch.value)
    }
    this.data.set(patch.file, data)
    this.changed(patch.file, spec.kind === "records" ? patch.key : undefined)
  }

  /** Save, then tell the resource's code, open panels and (world files) every client. */
  private changed(file: string, key: string | undefined): void {
    const spec = this.schema.files[file]
    const data = this.get(file)
    const value = key === undefined ? data : (data[key] ?? null)
    this.dataFiles.get(file)?.write(data)
    for (const handler of this.handlers.get(file) ?? []) handler(key, value)
    core.AdminPanelChanged({
      resource: this.resource,
      file,
      key,
      value: clone(value),
    })
    if (spec?.sync !== "all") return
    const changes = this.worldChanges.get(file) ?? {}
    changes[key ?? ""] = clone(value)
    this.worldChanges.set(file, changes)
    emitNet(ADMIN.worldEvent(this.resource), -1, file, key ?? null, value)
  }

  private load(name: string, spec: FileSpec): void {
    if (spec.memory) {
      this.data.set(name, {})
      return
    }
    const file = new DataFile(this.resource, name, this.log)
    this.dataFiles.set(name, file)
    const raw = file.read()
    const data: Data = isRecord(raw) ? raw : {}
    let filled = false
    if (spec.kind === "settings") {
      for (const [section, value] of Object.entries(spec.defaults ?? {})) {
        if (section in data) continue
        data[section] = clone(value)
        filled = true
      }
    }
    this.data.set(name, data)
    if (filled || raw === null) file.write(data)
  }
}
