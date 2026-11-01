import type { AiGaragesServerExports } from "../garages";
import type { AiLibClientExports } from "../ui";
import type { AiVehiclesServerExports } from "../vehicles";
import type {
  AiInventoryClientExports,
  AiInventoryServerExports,
} from "./aiInventory";
import type { AiCoreClientExports } from "./coreClient";
import type { AiCoreServerExports } from "./coreServer";
import type {
  AiAppearanceClientExports,
  AiDeathServerExports,
  AiDoorlockServerExports,
  AiHudClientExports,
  AiHudServerExports,
  AiPoliceAlertServerExports,
  AiRadialClientExports,
  AiSmallResourcesClientExports,
  AiTargetClientExports,
  AiVehicleKeysServerExports,
  AiVehicleshopServerExports,
} from "./resources";

/** Both sides share the resource key; a caller uses the half of its own side. */
export type AiCoreExports = AiCoreServerExports & AiCoreClientExports;

declare global {
  interface CitizenExports {
    "ai-core": AiCoreExports;
    "ai-lib": AiLibClientExports;
    "ai-target": AiTargetClientExports;
    "ai-appearance": AiAppearanceClientExports;
    "ai-vehicles": AiVehiclesServerExports;
    "ai-vehicleshop": AiVehicleshopServerExports;
    "ai-vehiclekeys": AiVehicleKeysServerExports;
    "ai-death": AiDeathServerExports;
    "ai-radialmenu": AiRadialClientExports;
    "ai-policealert": AiPoliceAlertServerExports;
    "ai-doorlock": AiDoorlockServerExports;
    "ai-garages": AiGaragesServerExports;
    "ai-inventory": AiInventoryServerExports & AiInventoryClientExports;
    "ai-smallresources": AiSmallResourcesClientExports;
    "ai-hud": AiHudClientExports & AiHudServerExports;
  }
}
