import { CORE, type Weather } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Time and weather through ai-core, whatever weather script runs (admin tools, events, jobs). */
export const world = {
  /** The current weather type as the weather script reports it, null while none runs. */
  getWeather: (): string | null => core.GetWeather(),
  /** Sets the weather (`isWeather` checks a value from a client or a panel first); false while no weather script runs. */
  setWeather: (type: Weather): boolean => core.SetWeather(type),
  getTime: (): { hour: number; minute: number } | null => core.GetTime(),
  setTime: (hour: number, minute = 0): boolean => core.SetTime(hour, minute),
  setBlackout: (on: boolean): boolean => core.SetBlackout(on),
  freezeTime: (on: boolean): boolean => core.FreezeTime(on),
};
