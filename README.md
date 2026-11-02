# @aifivem packages

Shared packages of ai-core, published to npm under the `@aifivem` scope. TypeScript sources are published as they are; every ai-core resource bundles what it imports at build time.

| Package | Content |
|---|---|
| `@aifivem/lib` | Helpers: `/shared` (no natives), `/server`, `/client` |
| `@aifivem/shared` | Contracts between resources: event names, payload and export types |
| `@aifivem/mysql` | Database engine: in-process mysql2 pool per resource, oxmysql-compatible behaviour (parts adapted from oxmysql, LGPL-3.0, Overextended) |
| `@aifivem/build` | Build steps (`aicore-client-errors`) |

In the ai-core server folder (the bun workspace root, with this repo as `packages/`), resources link these local copies automatically when the version satisfies their range.

License: GPL-3.0-only.
