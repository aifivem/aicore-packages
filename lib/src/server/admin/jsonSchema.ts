import type { DataSpec, FileSpec, PanelSchema, WidgetSpec } from "@aicore-fivem/shared";
import { mkdir, writeFile } from "node:fs/promises";
import { isRecord, type Logger } from "../../shared";

/**
 * JSON Schemas of a script's panel files (draft-07), so an editor validates and explains `data/*.json` while someone
 * edits it by hand: types, limits, enums and patterns from the panel's data specs, descriptions from the panel's
 * labels and hints in the script's `locales/en.json`. Written to `data/schemas/<file>.schema.json`.
 */

type Json = Record<string, unknown>;
/** Path inside a file (`branding.name`, list items as `rows[].x`) -> "Label: hint". */
type Descriptions = Map<string, string>;

const SCHEMA_KEY = { type: "string", description: "This file's JSON Schema (for editors)." };

function texts(resource: string): Record<string, string> {
  try {
    const raw: unknown = JSON.parse(LoadResourceFile(resource, "locales/en.json") ?? "{}");
    return isRecord(raw) ? Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")) : {};
  } catch {
    return {};
  }
}

function collect(fields: WidgetSpec[], prefix: string, lang: Record<string, string>, out: Descriptions): void {
  for (const field of fields) {
    const path = prefix + field.path;
    const label = lang[field.label] ?? field.label;
    const hint = field.hint ? (lang[field.hint] ?? field.hint) : "";
    if (!out.has(path)) out.set(path, hint ? `${label}: ${hint}` : label);
    if (field.widget === "list") collect(field.rows, `${path}[].`, lang, out);
  }
}

function describe(schema: PanelSchema, file: string, lang: Record<string, string>): Descriptions {
  const out: Descriptions = new Map();
  for (const tab of schema.tabs) if (tab.file === file) for (const card of tab.cards) collect(card.fields, "", lang, out);
  return out;
}

function toJson(spec: DataSpec, path: string, desc: Descriptions): Json {
  const description = desc.get(path);
  const base: Json = description ? { description } : {};
  switch (spec.type) {
    case "text":
      return { ...base, type: "string", minLength: spec.min, maxLength: spec.max, pattern: spec.pattern };
    case "number":
      return { ...base, type: spec.integer ? "integer" : "number", minimum: spec.min, maximum: spec.max };
    case "bool":
      return { ...base, type: "boolean" };
    case "enum":
      return { ...base, enum: spec.values };
    case "names":
      return { ...base, type: "array", maxItems: spec.max, uniqueItems: true, items: { type: "string", maxLength: spec.itemMax, pattern: spec.pattern } };
    case "vec3":
    case "vec4": {
      const keys = spec.type === "vec3" ? ["x", "y", "z"] : ["x", "y", "z", "heading"];
      return { ...base, type: "object", required: keys, properties: Object.fromEntries(keys.map((k) => [k, { type: "number" }])) };
    }
    case "object":
      return { ...base, ...objectOf(spec.fields, path ? `${path}.` : "", desc) };
    case "list":
      return { ...base, type: "array", minItems: spec.min, maxItems: spec.max, items: toJson(spec.of, `${path}[]`, desc) };
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}

function objectOf(fields: Record<string, DataSpec>, prefix: string, desc: Descriptions): Json {
  return {
    type: "object",
    properties: Object.fromEntries(Object.entries(fields).map(([k, s]) => [k, toJson(s, prefix + k, desc)])),
    required: Object.entries(fields).filter(([, s]) => !s.optional).map(([k]) => k),
  };
}

/** The schema of one panel file as JSON text (stable, so an unchanged schema is not written again). */
export function fileSchema(resource: string, schema: PanelSchema, name: string, spec: FileSpec): string {
  const desc = describe(schema, name, texts(resource));
  const title = `${resource}/data/${name}.json`;
  const body: Json =
    spec.kind === "settings"
      ? (() => {
          const obj = objectOf(spec.sections, "", desc);
          // Sections with defaults are filled at load: a hand-written file may leave them out.
          const required = (obj.required as string[]).filter((k) => !(k in (spec.defaults ?? {})));
          return { ...obj, properties: { $schema: SCHEMA_KEY, ...(obj.properties as Json) }, required };
        })()
      : {
          type: "object",
          properties: { $schema: SCHEMA_KEY },
          patternProperties: { [spec.keyPattern ?? "^[a-z0-9_]{2,32}$"]: objectOf(spec.sections, "", desc) },
          additionalProperties: false,
        };
  return `${JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", title, ...body }, null, 2)}\n`;
}

/** Writes a schema file when its text changed (the server only writes inside its own resource). */
export function writeSchema(resource: string, name: string, text: string, log: Logger): void {
  const path = `data/schemas/${name}.schema.json`;
  if (LoadResourceFile(resource, path) === text) return;
  const dir = `${GetResourcePath(resource)}/data/schemas`;
  void mkdir(dir, { recursive: true })
    .then(() => writeFile(`${dir}/${name}.schema.json`, text, "utf8"))
    .catch((error: unknown) => log.error(`writing ${resource}/${path} failed`, error));
}
