import type { PanelSchema, WidgetSpec } from "@aicore-fivem/shared";
import { isRecord } from "../../shared";

/** Path inside a file (`branding.name`, list items as `rows[].x`) -> "Label: hint". */
export type Descriptions = Map<string, string>;

function langFile(resource: string): Record<string, string> {
  try {
    const raw: unknown = JSON.parse(
      LoadResourceFile(resource, "locales/en.json") ?? "{}",
    );
    return isRecord(raw)
      ? Object.fromEntries(
          Object.entries(raw).filter(
            (e): e is [string, string] => typeof e[1] === "string",
          ),
        )
      : {};
  } catch {
    return {};
  }
}

/** The script's texts over ai-core's generic panel texts (shared fields such as a place's NPC use those). */
export function texts(resource: string): Record<string, string> {
  return { ...langFile("ai-core"), ...langFile(resource) };
}

function collect(
  fields: WidgetSpec[],
  prefix: string,
  lang: Record<string, string>,
  out: Descriptions,
): void {
  for (const field of fields) {
    // An action button names a handler, not a stored value.
    if (field.widget === "action") continue;
    const path = prefix + field.path;
    const label = lang[field.label] ?? field.label;
    const hint = field.hint ? (lang[field.hint] ?? field.hint) : "";
    if (!out.has(path)) out.set(path, hint ? `${label}: ${hint}` : label);
    if (field.widget === "list") collect(field.rows, `${path}[].`, lang, out);
  }
}

export function describe(
  schema: PanelSchema,
  file: string,
  lang: Record<string, string>,
): Descriptions {
  const out: Descriptions = new Map();
  for (const tab of schema.tabs)
    if (tab.file === file)
      for (const card of tab.cards) collect(card.fields, "", lang, out);
  return out;
}

