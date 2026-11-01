import type { ActionResult } from "./action";
import type { Sex } from "./player";

/**
 * Which character of the player's own account to load: its character id, its slot (ESX `char<slot>`) or its citizen
 * id (QB / Qbox). Another account's character is never found.
 */
export type CharacterRef = number | { slot: number } | { citizenid: string };

/** A new character from an external character screen; checked like ai-core's create form. */
export interface ScriptCharacterInput {
  firstname: string;
  lastname: string;
  /** YYYY-MM-DD */
  birthdate: string;
  sex: Sex;
  /** Empty when left out. */
  nationality?: string;
  /** The first free slot when left out; refused past the account's slot limit. */
  slot?: number;
}

/**
 * Login entry points for an external character screen (a multichar script through the ESX / QB / Qbox bridge). Each
 * answers once through `done` (`{ ok }` or a `CHAR_ERR_*` lang key); no promise crosses a resource boundary.
 */
export type MulticharServerExports = {
  /** "ai-core" (its own screen) or the resource name of the external character screen that runs. */
  GetCharacterScreen(): string;
  /** Loads a character of the player's own account (the player has none loaded). */
  LoginCharacter(
    source: number,
    character: CharacterRef,
    done?: (result: ActionResult) => void,
  ): void;
  /** Creates a character on the player's account (slot limit, form rules) and loads it. */
  CreateAndLoginCharacter(
    source: number,
    input: ScriptCharacterInput,
    done?: (result: ActionResult) => void,
  ): void;
  /** Lets go of the loaded character (saved, `playerUnloaded` "switch"); the external screen shows itself again. */
  LogoutCharacter(source: number, done?: (result: ActionResult) => void): void;
};
