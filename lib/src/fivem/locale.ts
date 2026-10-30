import { formatText, isRecord } from "../shared";

/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
export const LOCALE_CONVAR = "ai:locale";

function readLocaleFile(
  resource: string,
  lang: string,
): Record<string, string> {
  const raw = LoadResourceFile(resource, `locales/${lang}.json`);
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return {};
  const texts: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed))
    if (typeof value === "string") texts[key] = value;
  return texts;
}

/**
 * The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
 * `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
 * `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
 *
 *   const t = createLocale<typeof import("../../locales/en.json")>();
 *   t("NOTIFY_NO_MONEY", price);
 */
export function createLocale<T extends Record<string, string>>(): (
  key: keyof T & string,
  ...args: Array<string | number>
) => string {
  const texts = loadLocaleTexts();
  return (key, ...args) => formatText(texts[key] ?? key, args);
}

/**
 * The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
 * resolved). A NUI gets this once and fills `{0}` placeholders itself.
 */
export function loadLocaleTexts(
  resource = GetCurrentResourceName(),
): Record<string, string> {
  const lang = GetConvar(LOCALE_CONVAR, "en");
  const texts = {
    ...readLocaleFile(resource, "en"),
    ...(lang === "en" ? {} : readLocaleFile(resource, lang)),
  };

  for (const key of Object.keys(texts)) {
    texts[key] = (texts[key] ?? "").replace(
      /\$\{([A-Z0-9_]+)\}/g,
      (match, ref: string) => texts[ref] ?? match,
    );
  }

  return texts;
}
