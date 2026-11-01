# Changelog

## [0.5.0](https://github.com/aifivem/aicore-packages/compare/lib-v0.4.0...lib-v0.5.0) (2026-11-01)


### New Features

* **inventory:** client item list and item count events in the inventory contract and lib ([31eb748](https://github.com/aifivem/aicore-packages/commit/31eb74875fa323896ae9594abf35ca2bccf86649))
* **lib:** character search, ledger history, money and jobs helpers ([6400abc](https://github.com/aifivem/aicore-packages/commit/6400abcc2a66f1a843938fb3c8b809cc831e5f25))
* **lib:** every item definition on both sides ([847960d](https://github.com/aifivem/aicore-packages/commit/847960d3dbc8d2c16f943092ebacf41cc4525871))
* **lib:** inventory.canCarryItems, jobs.unemployed and characters.hasJobMember ([f75f1e8](https://github.com/aifivem/aicore-packages/commit/f75f1e8bf1f8e2a0f39b2c0fa27c59b0f67874be))
* **lib:** needs.add ([5c809f5](https://github.com/aifivem/aicore-packages/commit/5c809f59008c4d722f69bc39f7db891288b0c3e2))
* **lib:** online.sourceOf / characters, inventory itemsBySlot / firstStack ([56581e9](https://github.com/aifivem/aicore-packages/commit/56581e93f1b57d072b0629dffba2290e70bc600b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @aicore-fivem/shared bumped from ^0.4.0 to ^0.5.0

## [0.4.0](https://github.com/aifivem/aicore-packages/compare/lib-v0.3.0...lib-v0.4.0) (2026-11-01)


### New Features

* **lib:** ban history, search and edits; open the admin panel on a section ([4db9b2d](https://github.com/aifivem/aicore-packages/commit/4db9b2daa00004eaeafe37de8da99767f5f3dea0))
* **lib:** entity searches, scaleform loader, spawn by model hash, players near a point and notification titles ([f508483](https://github.com/aifivem/aicore-packages/commit/f508483e0c78e3b300ff7c8a45d3e984c5818017))
* **lib:** item metadata, weight limits, client item definitions and client key checks ([f6db5da](https://github.com/aifivem/aicore-packages/commit/f6db5da7a69b79dd81bd42f318284f1c74644765))
* **lib:** offline characters, bans and script job definitions ([4e7d18c](https://github.com/aifivem/aicore-packages/commit/4e7d18cffd90fa32f221200797142ca7d6ccca3c))


### Code Refactoring

* split the packages into concept files and folders; public API unchanged ([c80a9ee](https://github.com/aifivem/aicore-packages/commit/c80a9ee8464711295d2703039e024c0b227398e2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @aicore-fivem/shared bumped from ^0.3.0 to ^0.4.0

## [0.3.0](https://github.com/aifivem/aicore-packages/compare/lib-v0.2.0...lib-v0.3.0) (2026-10-31)


### New Features

* **lib:** needs.refill fills hunger and thirst through ai-core's HUD layer ([6584552](https://github.com/aifivem/aicore-packages/commit/6584552a7b2e0556a359e696552d9c1f4a0f575e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @aicore-fivem/shared bumped from ^0.2.0 to ^0.3.0

## [0.2.0](https://github.com/aifivem/aicore-packages/compare/lib-v0.1.0...lib-v0.2.0) (2026-10-31)


### New Features

* **banking:** banking adapter accounts contract for linked job and gang money ([a98edae](https://github.com/aifivem/aicore-packages/commit/a98edaefbee02a94a24690c4544685497224054a))
* **billing:** bill contract for database-backed bills ([7bc582b](https://github.com/aifivem/aicore-packages/commit/7bc582b2788783ea6e534830dd190d4d4f59bcbe))
* **lib:** fuel, doors, garages, billing, banking, MDT, EMS, seat belt, stress, emote and clothing menu wrappers; target adapters; model points hosted by ai-lib ([fc4a13a](https://github.com/aifivem/aicore-packages/commit/fc4a13a50b30d31c92dda6162549fbe8a8f776b3))


### Bug Fixes

* **lib:** a target that is not ready yet keeps points as prompts instead of breaking the script ([385c85e](https://github.com/aifivem/aicore-packages/commit/385c85ebdee80cbe8f5b59c6d0dad90e568d1c04))
* **lib:** one drop listener for every PlayerState ([0c693f2](https://github.com/aifivem/aicore-packages/commit/0c693f2b3eda49f24c7519fb164036d8d901db9d))
* **lib:** teleports find the lowest ground outside interiors; NUI layers ([e6581bf](https://github.com/aifivem/aicore-packages/commit/e6581bf3611eff08427add5a839d5787b1b18bce))
* **lib:** world prompts follow entity spots; detect the target by ox_target or ai-target ([c434a69](https://github.com/aifivem/aicore-packages/commit/c434a69e24c8e447fab3d7f65f6c15fb8bb11447))


### Performance

* **lib:** ai-lib checks every resource's zones, so idle resources hold no timer ([960b1a2](https://github.com/aifivem/aicore-packages/commit/960b1a2ce17165370b942dce2eb4d27721d827a6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @aicore-fivem/shared bumped from ^0.1.0 to ^0.2.0
