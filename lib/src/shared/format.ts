/** Rounds to `decimals` places (default 0). */
export function round(value: number, decimals = 0): number {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

/** `1234567` as `1,234,567` (`separator` default `,`); keeps a sign and decimals. */
export function groupDigits(value: number | string, separator = ","): string {
  const [whole = "", fraction] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * Text from another script made plain: HTML tags, GTA colour and input codes (`~r~`, `~INPUT_PICKUP~`) and `&nbsp;`
 * removed, runs of spaces folded.
 */
export function stripGameText(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/~[\w]+~/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s\s+/g, " ")
    .trim();
}

/** A weight in grams for players: "750 g", "1.5 kg", "1,250 kg" (one decimal under 100 kg). */
export function formatWeight(grams: number): string {
  if (Math.abs(grams) < 1000) return `${Math.round(grams)} g`;
  const kg = grams / 1000;
  return `${groupDigits(Math.abs(kg) < 100 ? round(kg, 1) : Math.round(kg))} kg`;
}

/** A plate as the game compares it: GTA pads plates to 8 characters with spaces; keys use the trimmed upper case. */
export const normalizePlate = (plate: string): string => plate.trim().toUpperCase();
