/** The weather types of the qb-weathersync contract (ai-core's world layer passes them on). */
export const WEATHERS = [
  "EXTRASUNNY",
  "CLEAR",
  "NEUTRAL",
  "SMOG",
  "FOGGY",
  "OVERCAST",
  "CLOUDS",
  "CLEARING",
  "RAIN",
  "THUNDER",
  "SNOW",
  "BLIZZARD",
  "SNOWLIGHT",
  "XMAS",
  "HALLOWEEN",
] as const;

export type Weather = (typeof WEATHERS)[number];

const WEATHER_SET: ReadonlySet<string> = new Set(WEATHERS);

/** A known weather type (exact upper-case name). */
export const isWeather = (value: unknown): value is Weather =>
  typeof value === "string" && WEATHER_SET.has(value);
