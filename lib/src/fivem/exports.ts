/**
 * FiveM exports without the bare `exports` identifier. A source file that mentions `exports` is treated as
 * CommonJS by the bundler and wrapped in its own `(exports) =>` scope, which hides the FiveM function.
 * Shared by "@aicore-fivem/lib/client" and "@aicore-fivem/lib/server".
 */

// oxlint-disable-next-line typescript/no-explicit-any -- export handlers take whatever their contract declares
type ExportHandler = (...args: any[]) => unknown;

export function registerExport(name: string, handler: ExportHandler): void {
  globalThis.exports(name, handler);
}

/** Typed access to another resource's exports (types come from CitizenExports in @aicore-fivem/shared). */
export function resourceExport<K extends keyof CitizenExports & string>(resource: K): CitizenExports[K] {
  return globalThis.exports[resource] as CitizenExports[K];
}

/** Whether a resource is running now. */
export function isResourceStarted(resource: string): boolean {
  return GetResourceState(resource) === "started";
}

/** Another resource's exports while it runs, null when it does not (an optional dependency). */
export function optionalExport<K extends keyof CitizenExports & string>(resource: K): CitizenExports[K] | null {
  return isResourceStarted(resource) ? (globalThis.exports[resource] as CitizenExports[K]) : null;
}

/** Answers `exports["<resource>"].<name>` for a resource name this one `provide`s: provide makes the name exist but does not alias its exports, so each export of the stood-in resource is answered through FiveM's export event. */
export function provideExport(resource: string, name: string, fn: ExportHandler): void {
  on(`__cfx_export_${resource}_${name}`, (setCallback: (fn: ExportHandler) => void) => setCallback(fn));
}
