/** A whole number from `min` to `max`, both included. */
export const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

/** One random item of a list, undefined when it is empty. */
export const pickRandom = <T>(list: readonly T[]): T | undefined =>
  list[Math.floor(Math.random() * list.length)];

/** True with a chance of `percent` (0-100). */
export const rollChance = (percent: number): boolean =>
  Math.random() * 100 < percent;
