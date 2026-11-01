const PLATE_LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

/** A plate like the game's own (two digits, three letters, three digits), or `prefix` followed by digits (8 in all). */
export function randomPlate(prefix?: string): string {
  const digit = () => String(Math.floor(Math.random() * 10));
  if (prefix !== undefined) {
    let plate = prefix.slice(0, 8);
    while (plate.length < 8) plate += digit();
    return plate;
  }
  const letter = () =>
    PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)] ?? "A";
  return `${digit()}${digit()}${letter()}${letter()}${letter()}${digit()}${digit()}${digit()}`;
}
