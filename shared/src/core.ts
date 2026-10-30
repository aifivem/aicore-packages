/** Names owned by ai-core that other resources, the bridges and the build step use. */
export const CORE = {
  resource: "ai-core",
  /** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
  clientErrorEvent: "ai-core:clientError",

  // Server local events (other resources and the bridges mirror player state from these deltas).
  /** (src, character: CharacterInfo) after a character is loaded and spawned. */
  playerLoadedEvent: "ai-core:playerLoaded",
  /** (src, charId, reason: UnloadReason) before a character's state is dropped. */
  playerUnloadedEvent: "ai-core:playerUnloaded",
  /** (src, account: string, balance: number, delta: number, reason: string) */
  moneyChangedEvent: "ai-core:moneyChanged",
  /** (src, jobs: JobMembership[]) */
  jobsChangedEvent: "ai-core:jobsChanged",
  /** (src, job: string | null) */
  dutyChangedEvent: "ai-core:dutyChanged",
  /** (src, gangs: GangMembership[]) */
  gangsChangedEvent: "ai-core:gangsChanged",
  /** (src, gang: string | null) */
  activeGangChangedEvent: "ai-core:activeGangChanged",
  /** Server local: (src, key, value | null) a character metadata value changed. */
  metaChangedEvent: "ai-core:metaChanged",
  /** Server local: (file: "jobs" | "gangs", name) a job or gang definition changed in the panel. */
  definitionsChangedEvent: "ai-core:definitionsChanged",
  /** (src, charIds: number[]) each time a player's character screen loads; ai-core sends the looks, a clothing script may answer with portraits. */
  characterScreenEvent: "ai-core:characterScreen",
  /** (resource: string | null) the inventory behind ai-core's inventory layer changed (the bridge drops its item cache). */
  inventoryChangedEvent: "ai-core:inventoryChanged",
  /** (src, name: string, status: Record<string, number> | null) a player used an item; status = the needs it gives, from inventories that define them. */
  itemUsedEvent: "ai-core:itemUsed",
  /** (src, killer: number | null, weaponHash: number) a player with a loaded character died; fired from FXServer's `onPedDeath` (needs `PED_DEATH_STATE_KEY`). */
  playerDiedEvent: "ai-core:playerDied",

  // Client local events (same payloads, for client scripts and bridges).
  clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
  clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
  /** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
  clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
  /** Server -> client (latent): (looks: { id: number, look: CharacterAppearance }[]) the character screen's looks, read through the appearance layer; ai-core dresses its scene peds with them. */
  characterLooksEvent: "ai-core:client:characterLooks",
  /** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
  clientPromptPressedEvent: "ai-core:client:promptPressed",
  /** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
  clientCacheEvent: "ai-core:client:cache",
  /** Client local event: (visible: boolean) HUDs show or hide (a full-screen UI opened or closed; lib `hud`). */
  clientHudVisibleEvent: "ai-core:client:hudVisible",
  /** Client local: (paused: boolean) the weather and time sync is paused (interiors, scenes) or runs again. */
  clientWorldSyncEvent: "ai-core:client:worldSync",
  /** Client local: (file: "jobs" | "gangs", name, definition | null) a job or gang definition changed. */
  clientDefinitionsEvent: "ai-core:client:definitions",
  /** Server -> client callback: (model: string) the `CreateVehicleServerSetter` type of a model, null when the game has no such vehicle (ai-core's client answers for every resource, lib `spawnVehicle`). */
  vehicleTypeCallback: "ai-core:vehicleType",
  /** GlobalState: "prompt" | "target", how lib `Points` let players interact (ai-core panel setting). */
  interactionStateKey: "ai:interaction",

  // Callbacks (character screen).
  charactersCallback: "ai-core:characters",
  createCharacterCallback: "ai-core:createCharacter",
  deleteCharacterCallback: "ai-core:deleteCharacter",
  selectCharacterCallback: "ai-core:selectCharacter",

  /** Server -> client: (notification: Notification) a notification card on the player's screen. */
  clientNotifyEvent: "ai-core:client:notify",

  /** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
  spawnEvent: "ai-core:client:spawn",
  /** Server -> client: () the character was let go (switch); show the character screen again. */
  openCharactersEvent: "ai-core:client:openCharacters",
} as const;

/** GlobalState key holding how many players are on duty in a job (counts only, never member lists). */
export const DUTY_COUNT_PREFIX = "ai:duty:";
export const dutyCountKey = (job: string): string =>
  `${DUTY_COUNT_PREFIX}${job}`;

/** GlobalState key holding the resource name of the active inventory (null while none runs). */
export const INVENTORY_STATE_KEY = "ai:inventory";

/** GlobalState key: true when the server reports player deaths itself (FXServer 38039+ `onPedDeath`), so clients need not watch their health. */
export const PED_DEATH_STATE_KEY = "ai:pedDeath";
/** Client local event: (worn: boolean | null) the local player's seat belt changed (ai-smallresources, read by HUDs). */
export const SEATBELT_EVENT = "ai-smallresources:seatbelt";
/** Player state bag keys several resources read (written by one server resource each). */
export const PLAYER_BAGS = {
  /** true while downed (ai-death). */
  dead: "dead",
  /** true while handcuffed (ai-police). */
  cuffed: "cuffed",
  /** pma-voice's voice range `{ index, distance, mode }` (ai-voice writes it). */
  proximity: "proximity",
} as const;

/** The first FXServer build known to fire `onPedDeath` / `onPedHealthChanged` (citizenfx/fivem 1424ad0). */
export const PED_EVENTS_MIN_BUILD = 38039;

/** Why a character is let go: the player left, or went back to the character screen. */
export type UnloadReason = "dropped" | "switch";
