import type { BankingServerExports } from "../banking";
import type { BillingServerExports } from "../billing";
import type { CharacterServerExports } from "./coreCharacters";
import type { DispatchServerExports } from "../dispatch";
import type { DoorlockServerExports } from "../doorlock";
import type { EmsServerExports } from "../ems";
import type { FuelServerExports } from "../fuel";
import type { GaragesServerExports } from "../garages";
import type { InventoryServerExports } from "../inventory/exports";
import type { MdtServerExports } from "../mdt";
import type { MulticharServerExports } from "../multichar";
import type { PhoneServerExports } from "../phone";
import type { AiPlayerData, CharacterInfo } from "../player";
import type { VehicleKeysServerExports } from "../vehicleKeys";
import type { VrpConfig } from "../vrp";
import type { CoreGroupServerExports } from "./coreGroups";
import type { CoreLayerServerExports } from "./coreLayers";
import type { CoreMoneyServerExports } from "./coreMoney";
import type { CoreServiceServerExports } from "./coreServices";

/**
 * ai-core's server exports: synchronous, small values. Callers mirror what they need and follow ai-core's local
 * events (`CORE.*Event`) instead of calling these in hot paths. A type alias, not an interface: it must fit
 * CitizenExports' index signature.
 */
export type AiCoreServerExports = {
  GetPlayerData(src: number): AiPlayerData | null;
  GetCharacter(src: number): CharacterInfo | null;
  GetSourceByCharId(charId: number): number | null;
  GetSourceByCitizenId(citizenid: string): number | null;
  GetLoadedSources(): number[];
  GetFivemId(src: number): string | null;
  /** The account id (`ai_core_users.id`) of a connected player, also on the character screen. */
  GetUserId(src: number): number | null;
  /** A character by id, loaded or not, with its account id; `done` gets null for an unknown or deleted one. */
  GetCharacterInfo(
    charId: number,
    done: (info: (CharacterInfo & { userId: number }) | null) => void,
  ): void;

  // vRP layer (ai-core's bridge/vrp calls these; values are hex text so any bytes survive).
  /** A vRP data value (`kind` c / u / s / g, owner id as text) as hex, `""` when unset; at once when cached. */
  VrpGetData(
    kind: string,
    owner: string,
    key: string,
    done: (hex: string) => void,
  ): void;
  /** Stores a vRP data value (hex); written within a second. */
  VrpSetData(kind: string, owner: string, key: string, hex: string): boolean;
  /** vRP's DB API on ai-core's pool: `done(error | null, ...)` with rows + affected, affected, or the scalar. */
  VrpQuery(
    sql: string,
    params: unknown,
    mode: "query" | "execute" | "scalar",
    done: (error: string | null, ...answer: unknown[]) => void,
  ): void;
  /** The panel's vRP permission mapping (`data/vrp.json`). */
  GetVrpConfig(): VrpConfig;
  /** Records a permission string a script asked for (the panel lists them); true when it was new. */
  VrpPermissionAsked(permission: string): boolean;
  SwitchCharacter(src: number): boolean;

  GetMeta(src: number, key: string): unknown;
  SetMeta(src: number, key: string, value: unknown): boolean;

  /**
   * Moves a stored (not loaded) character's spawn point once no load or unload save holds it; false when the
   * character is loaded or the arguments are wrong (true = accepted, the write follows).
   */
  SetOfflinePosition(
    charId: number,
    position: { x: number; y: number; z: number; heading?: number },
  ): boolean;
} & CoreMoneyServerExports &
  CoreGroupServerExports &
  CoreServiceServerExports &
  CoreLayerServerExports &
  InventoryServerExports &
  VehicleKeysServerExports &
  PhoneServerExports &
  DispatchServerExports &
  BillingServerExports &
  BankingServerExports &
  MdtServerExports &
  EmsServerExports &
  FuelServerExports &
  DoorlockServerExports &
  GaragesServerExports &
  CharacterServerExports &
  MulticharServerExports;
