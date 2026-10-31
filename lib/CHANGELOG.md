# Changelog

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
