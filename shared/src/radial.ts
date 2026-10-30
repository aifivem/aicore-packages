/**
 * One item of the radial wheel as a script hands it to ai-core (lib `radial`). The functions run in the resource that
 * added the item; ai-core drops the item when that resource stops.
 */
export interface RadialItem {
  /** Unique id; adding an id again replaces the item. */
  id: string;
  /** The text on the card (already translated). */
  label: string;
  /** Font Awesome solid icon name without `fa-` (`car`, `key`), or an image url. */
  icon?: string;
  /** The item id this goes into (a sub menu: the built-in `vehicle`, or another item); left out = the main wheel. */
  parent?: string;
  /** Sub items: the card opens a sub menu (each item with its own `canShow` / `onPressed`). */
  items?: RadialItem[];
  /** Shown only while this returns true (job, duty, a vehicle, an item); read each time the wheel opens or refreshes. */
  canShow?: () => boolean;
  /** Runs when the player picks the item. */
  onPressed?: () => void;
  /** true keeps the wheel open after the press (doors, extras). */
  keepOpen?: boolean;
  /** true keeps the item while the player is down (every other item hides then). */
  whileDead?: boolean;
}

/** The radial built-in category vehicle items go into (`parent: RADIAL_VEHICLE`). */
export const RADIAL_VEHICLE = "vehicle";

/** ai-core's radial client exports (lib `radial`): items reach whichever radial menu runs. */
export type RadialClientExports = {
  /** Adds or replaces an item of the calling resource (dropped when it stops). */
  AddRadialItem(item: RadialItem): void;
  RemoveRadialItem(id: string): void;
  /** Reads every `canShow` of an open wheel again (call it after what they read changed). */
  RefreshRadial(): void;
};

/** One radial menu behind ai-core's radial layer (client): ai-core hands it every item scripts add. */
export interface RadialAdapter {
  resource: string;
  add(item: RadialItem): void;
  remove(item: RadialItem): void;
  refresh(): void;
}
