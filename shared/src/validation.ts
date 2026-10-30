import type { CreateCharacterInput, Sex } from "./player";

const NAME = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ' -]{1,19}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A first or last name: 2-20 letters (Latin, accents), spaces, apostrophes, dashes; trimmed. Null when invalid. */
export function toName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return NAME.test(name) ? name : null;
}

/** A birth date `YYYY-MM-DD` for an age between `minAge` and 100. Null when invalid. */
export function toBirthdate(
  value: unknown,
  minAge = 18,
  now = new Date(),
): string | null {
  if (typeof value !== "string") return null;
  const match = DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  const age =
    now.getUTCFullYear() -
    year -
    (now.getUTCMonth() < month - 1 ||
    (now.getUTCMonth() === month - 1 && now.getUTCDate() < day)
      ? 1
      : 0);
  return age >= minAge && age <= 100 ? value : null;
}

export function toSex(value: unknown): Sex | null {
  return value === "male" || value === "female" ? value : null;
}

/** The character creation form from the NUI, or the lang key of the first invalid field. */
export function toCreateCharacter(
  value: unknown,
): CreateCharacterInput | { error: string } {
  if (typeof value !== "object" || value === null)
    return { error: "CHAR_ERR_INVALID" };
  const input = value as Record<string, unknown>;
  const slot =
    typeof input.slot === "number" &&
    Number.isInteger(input.slot) &&
    input.slot >= 1
      ? input.slot
      : null;
  const firstname = toName(input.firstname);
  const lastname = toName(input.lastname);
  const birthdate = toBirthdate(input.birthdate);
  const sex = toSex(input.sex);
  if (slot === null) return { error: "CHAR_ERR_INVALID" };
  if (!firstname) return { error: "CHAR_ERR_FIRSTNAME" };
  if (!lastname) return { error: "CHAR_ERR_LASTNAME" };
  if (!birthdate) return { error: "CHAR_ERR_BIRTHDATE" };
  if (!sex) return { error: "CHAR_ERR_SEX" };
  return { slot, firstname, lastname, birthdate, sex };
}
