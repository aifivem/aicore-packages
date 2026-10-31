/**
 * ai-core's vRP layer (bridge/vrp in ai-core): the panel's permission mapping (`data/vrp.json`) as the Lua bridge
 * reads it (export `GetVrpConfig`, local event `VRP.configEvent` with the same shape after a change).
 */

/**
 * One permission rule: grants `permission` (exact, or a prefix when it ends with `*`) to whoever matches any filled
 * target. `grade` is the minimum job / gang grade; `onDuty` makes the job count only while on duty in it.
 */
export interface VrpPermissionRule {
  permission: string;
  job: string;
  gang: string;
  /** An extra vRP group the character holds (groups vRP scripts add that are no job or gang). */
  group: string;
  grade: number;
  onDuty: boolean;
  admin: boolean;
  everyone: boolean;
}

/** A vRP group name that means a job / gang grade or admin (vRPex style ranks such as "Coronel"). */
export interface VrpGroupAlias {
  job: string;
  gang: string;
  grade: number;
  admin: boolean;
}

export interface VrpConfig {
  /**
   * Built-in rules used when no rule of `permissions` names the permission: `<job>.*` = member of that job (on duty
   * with `jobOnDuty`), `admin.*` = admin (`ai.admin`), `player.*` = everyone.
   */
  defaults: {
    jobPrefix: boolean;
    jobOnDuty: boolean;
    adminPrefix: boolean;
    playerPrefix: boolean;
  };
  permissions: VrpPermissionRule[];
  /** vRP group name -> what it means in ai-core. */
  groups: Record<string, VrpGroupAlias>;
  /** vRP item id (`edible|tacos`, `wbody|WEAPON_PISTOL`) -> inventory item name. */
  items: Record<string, string>;
}

export const VRP = {
  /** Server local: (config: VrpConfig) the panel changed the vRP mapping. */
  configEvent: "ai-core:vrp:config",
} as const;
