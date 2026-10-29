#!/usr/bin/env bun
/**
 * Client script errors reach the server console (ai-core logs them with the player): every client bundle
 * gets a small reporter in front and a try/catch around itself.
 *
 * - Runtime errors: FiveM's JS runtime prints handler, tick and unhandled promise errors through this
 *   resource's own `console.log` as "SCRIPT ERROR ..."; the reporter forwards those lines.
 * - Load errors: an error thrown while the file itself runs is printed by the native side, which no script
 *   sees; the try/catch reports it, then throws it on so FiveM still prints it.
 *
 * Same lines are sent once, at most 20 per resource start. Plain ES5-ish JS: it runs before anything else.
 *
 * Usage (package.json build script, after tsdown): aicore-client-errors dist/client.js
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { CORE } from "@aicore-fivem/shared";

const MARKER = "/*aicore-client-errors*/";

const REPORTER = `${MARKER}(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\\^\\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("${CORE.clientErrorEvent}",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();`;

/** The bundle with the reporter in front and its own run inside a try/catch. */
export function withClientErrors(code: string): string {
  return `${REPORTER}\ntry{\n${code}\n}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}\n`;
}

if (import.meta.main) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: aicore-client-errors <client bundle>...");
    process.exit(1);
  }
  for (const file of files) {
    // A server-only resource has no client bundle.
    if (!existsSync(file)) continue;
    const code = await readFile(file, "utf8");
    if (code.startsWith(MARKER)) continue;
    await writeFile(file, withClientErrors(code));
  }
}
