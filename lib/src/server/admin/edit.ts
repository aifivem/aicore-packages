import type { AdminPatch, DataSpec, FileSpec } from "@aicore-fivem/shared";
import { isRecord } from "../../shared";
import { clone } from "./patch";
import { ERR, validate } from "./validate";

type Data = Record<string, unknown>;
/** A patch that edits data (every kind but an action button's `run`). */
export type EditPatch = Exclude<AdminPatch, { action: "run" }>;
/** Cross-field check on the value about to be stored: a lang key refuses it. */
export type Rule = (key: string | undefined, next: Data) => string | null;

/** What the edit checks read of the panel: a file's content and its rule. */
export interface EditContext {
  get(file: string): Data;
  rule(file: string): Rule | undefined;
}

const DEFAULT_KEY = "^[a-z0-9_]{2,32}$";

/** An imported record: only the file's sections, a section it lacks taken from the new-record template. */
function imported(spec: FileSpec, value: Data): Data {
  const base = clone(spec.newRecord ?? {});
  const out: Data = {};
  for (const name of Object.keys(spec.sections)) {
    const v = name in value ? value[name] : base[name];
    if (v !== undefined) out[name] = clone(v);
  }
  return out;
}

/** A text section with `records` must name a record of that file of this panel (or be empty). */
function linked(
  spec: DataSpec,
  value: unknown,
  ctx: EditContext,
): string | null {
  return spec.type === "text" &&
    spec.records &&
    typeof value === "string" &&
    value !== "" &&
    !(value in ctx.get(spec.records))
    ? "ADMIN_ERR_LOOKUP"
    : null;
}

/** The refusal (a lang key) of a panel edit: key pattern, existence, lock, validation, links, the file's rule; null = ok. */
export function checkEdit(
  patch: EditPatch,
  spec: FileSpec,
  ctx: EditContext,
): string | null {
  const data = ctx.get(patch.file);
  if (patch.action === "create") {
    if (
      spec.kind !== "records" ||
      !new RegExp(spec.keyPattern ?? DEFAULT_KEY).test(patch.key)
    )
      return ERR.pattern;
    if (patch.key in data) return "ADMIN_ERR_EXISTS";
    return null;
  }
  if (patch.action === "delete") {
    if (spec.kind !== "records" || !(patch.key in data)) return ERR.type;
    return spec.locked?.includes(patch.key) ? "ADMIN_ERR_LOCKED" : null;
  }
  if (patch.action === "import") {
    if (spec.kind !== "records") return ERR.type;
    const pattern = new RegExp(spec.keyPattern ?? DEFAULT_KEY);
    for (const [key, value] of Object.entries(patch.records)) {
      if (!pattern.test(key)) return ERR.pattern;
      const record = imported(spec, value);
      for (const [name, section] of Object.entries(spec.sections)) {
        const refusal = validate(section, record[name], name);
        if (refusal) return refusal.error;
        const link = linked(section, record[name], ctx);
        if (link) return link;
      }
      const ruled = ctx.rule(patch.file)?.(key, record);
      if (ruled) return ruled;
    }
    return null;
  }
  const section = spec.sections[patch.section];
  if (!section) return ERR.type;
  if (spec.kind === "records" && (!patch.key || !(patch.key in data)))
    return ERR.type;
  const refusal = validate(section, patch.value, patch.section);
  if (refusal) return refusal.error;
  const link = linked(section, patch.value, ctx);
  if (link) return link;
  const current = spec.kind === "records" ? data[patch.key ?? ""] : data;
  const next = {
    ...(isRecord(current) ? current : {}),
    [patch.section]: patch.value,
  };
  return ctx.rule(patch.file)?.(patch.key, next) ?? null;
}

/**
 * Applies a checked edit to a file's data in place. Answers the changed keys (records) or `[undefined]` (settings);
 * empty when nothing changed.
 */
export function applyEdit(
  data: Data,
  patch: EditPatch,
  spec: FileSpec,
): Array<string | undefined> {
  if (patch.action === "import") {
    for (const [key, value] of Object.entries(patch.records))
      data[key] = imported(spec, value);
    return Object.keys(patch.records);
  }
  if (patch.action === "create") {
    const record = clone(spec.newRecord ?? {});
    if (spec.labelPath) record[spec.labelPath] = patch.label;
    data[patch.key] = record;
  } else if (patch.action === "delete") {
    delete data[patch.key];
  } else {
    const target = spec.kind === "records" ? data[patch.key ?? ""] : data;
    if (!isRecord(target)) return [];
    if (patch.value === undefined || patch.value === null)
      delete target[patch.section];
    else target[patch.section] = clone(patch.value);
  }
  return [spec.kind === "records" ? patch.key : undefined];
}
