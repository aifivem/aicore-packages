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
  /** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
  characterScreenEvent: "ai-core:characterScreen",

  // Client local events (same payloads, for client scripts and bridges).
  clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
  clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
  /** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
  clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
  /** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
  clientPromptPressedEvent: "ai-core:client:promptPressed",
  /** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
  clientCacheEvent: "ai-core:client:cache",

  // Callbacks (character screen).
  charactersCallback: "ai-core:characters",
  createCharacterCallback: "ai-core:createCharacter",
  deleteCharacterCallback: "ai-core:deleteCharacter",
  selectCharacterCallback: "ai-core:selectCharacter",

  /** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
  spawnEvent: "ai-core:client:spawn",
  /** Server -> client: () the character was let go (switch); show the character screen again. */
  openCharactersEvent: "ai-core:client:openCharacters",
} as const;

/** GlobalState key holding how many players are on duty in a job (counts only, never member lists). */
export const dutyCountKey = (job: string): string => `ai:duty:${job}`;

/** Why a character is let go: the player left, or went back to the character screen. */
export type UnloadReason = "dropped" | "switch";
