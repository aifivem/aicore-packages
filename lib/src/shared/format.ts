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
