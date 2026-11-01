import type { TargetOption } from "./adapter";

export const entityOf = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "object" && value !== null
      ? entityOf(Reflect.get(value, "entity"))
      : 0;

/** A Font Awesome class: `store` becomes `fa-solid fa-store`, a full class stays. */
export const faClass = (icon: string | undefined): string | undefined =>
  icon === undefined || icon.includes("fa-") ? icon : `fa-solid fa-${icon}`;

/** The ox_target option shape (sleepless_interact takes the same). */
export const oxOption = (o: TargetOption) => ({
  name: o.name,
  label: o.label,
  icon: faClass(o.icon),
  distance: o.distance,
  canInteract: (entity: unknown) => o.canInteract(entityOf(entity)),
  onSelect: (data: unknown) => o.onSelect(entityOf(data)),
});
