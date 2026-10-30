import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Time and weather through ai-core, whatever weather script runs (admin tools, events, jobs). */
export const world = {
  getWeather: (): string | null => core.GetWeather(),
  setWeather: (type: string): boolean => core.SetWeather(type),
  getTime: (): { hour: number; minute: number } | null => core.GetTime(),
  setTime: (hour: number, minute = 0): boolean => core.SetTime(hour, minute),
  setBlackout: (on: boolean): boolean => core.SetBlackout(on),
  freezeTime: (on: boolean): boolean => core.FreezeTime(on),
};
