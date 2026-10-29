/**
 * Callback wire format, the same on both sides:
 *   request  `aicore:cb:<name>`              (callerResource, id, ...args)
 *   response `aicore:cbr:<callerResource>`   (id, ok, result)
 * The response goes only to the resource that asked, so two resources never see each other's replies.
 */
export const requestEvent = (name: string): string => `aicore:cb:${name}`;
export const responseEvent = (resource: string): string => `aicore:cbr:${resource}`;

/** Default time a caller waits for an answer before the promise rejects. */
export const DEFAULT_CALLBACK_TIMEOUT = 30_000;
