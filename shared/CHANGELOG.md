# Changelog

## [0.5.0](https://github.com/aifivem/aicore-packages/compare/shared-v0.4.0...shared-v0.5.0) (2026-11-01)


### New Features

* **inventory:** client item list and item count events in the inventory contract and lib ([31eb748](https://github.com/aifivem/aicore-packages/commit/31eb74875fa323896ae9594abf35ca2bccf86649))
* **lib:** character search, ledger history, money and jobs helpers ([6400abc](https://github.com/aifivem/aicore-packages/commit/6400abcc2a66f1a843938fb3c8b809cc831e5f25))
* **lib:** inventory.canCarryItems, jobs.unemployed and characters.hasJobMember ([f75f1e8](https://github.com/aifivem/aicore-packages/commit/f75f1e8bf1f8e2a0f39b2c0fa27c59b0f67874be))
* **lib:** needs.add ([5c809f5](https://github.com/aifivem/aicore-packages/commit/5c809f59008c4d722f69bc39f7db891288b0c3e2))
* **vehicles:** FindVehicle, GetVehiclesOf and SetPlate contracts ([deb62f4](https://github.com/aifivem/aicore-packages/commit/deb62f4a50ef1cc8fd6245b53a15c804be634404))
* **vehicles:** framework shaped props in the vehicle reads ([94e2da1](https://github.com/aifivem/aicore-packages/commit/94e2da1c5942e6be94b3eda656308fa82c059291))

## [0.4.0](https://github.com/aifivem/aicore-packages/compare/shared-v0.3.0...shared-v0.4.0) (2026-11-01)


### New Features

* **lib:** ban history, search and edits; open the admin panel on a section ([4db9b2d](https://github.com/aifivem/aicore-packages/commit/4db9b2daa00004eaeafe37de8da99767f5f3dea0))
* **shared:** contracts for offline characters, bans, script job definitions, external character screens, item metadata and client key checks ([d5065d5](https://github.com/aifivem/aicore-packages/commit/d5065d524a077e5e47d23bef7cf03d946d16f75b))
* **shared:** DeathInfo, the details of a player's death ([c98ed32](https://github.com/aifivem/aicore-packages/commit/c98ed325bce6946db03efb024fe965446a9a435c))


### Code Refactoring

* split the packages into concept files and folders; public API unchanged ([c80a9ee](https://github.com/aifivem/aicore-packages/commit/c80a9ee8464711295d2703039e024c0b227398e2))

## [0.3.0](https://github.com/aifivem/aicore-packages/compare/shared-v0.2.0...shared-v0.3.0) (2026-10-31)


### New Features

* **lib:** needs.refill fills hunger and thirst through ai-core's HUD layer ([6584552](https://github.com/aifivem/aicore-packages/commit/6584552a7b2e0556a359e696552d9c1f4a0f575e))
* **player:** spawn point carries the saved health ([e088760](https://github.com/aifivem/aicore-packages/commit/e08876004b2d7c9e34ebf16026582d9833aae00d))
* **vrp:** vRP bridge contracts, player spawned event, inventory weight export, panel grade and browse widgets ([bdae4fe](https://github.com/aifivem/aicore-packages/commit/bdae4fe680e93850d9f746eb44433473adacfaa2))


### Bug Fixes

* **inventory:** adapter version is optional (none for ai-inventory) ([b0f02e5](https://github.com/aifivem/aicore-packages/commit/b0f02e5e5f51d48a1dffe592ec2fcfc0d9a8dba3))

## [0.2.0](https://github.com/aifivem/aicore-packages/compare/shared-v0.1.0...shared-v0.2.0) (2026-10-31)


### New Features

* **banking:** banking adapter accounts contract for linked job and gang money ([a98edae](https://github.com/aifivem/aicore-packages/commit/a98edaefbee02a94a24690c4544685497224054a))
* **billing:** bill contract for database-backed bills ([7bc582b](https://github.com/aifivem/aicore-packages/commit/7bc582b2788783ea6e534830dd190d4d4f59bcbe))
* **lib:** fuel, doors, garages, billing, banking, MDT, EMS, seat belt, stress, emote and clothing menu wrappers; target adapters; model points hosted by ai-lib ([fc4a13a](https://github.com/aifivem/aicore-packages/commit/fc4a13a50b30d31c92dda6162549fbe8a8f776b3))


### Bug Fixes

* **lib:** teleports find the lowest ground outside interiors; NUI layers ([e6581bf](https://github.com/aifivem/aicore-packages/commit/e6581bf3611eff08427add5a839d5787b1b18bce))
* **lib:** world prompts follow entity spots; detect the target by ox_target or ai-target ([c434a69](https://github.com/aifivem/aicore-packages/commit/c434a69e24c8e447fab3d7f65f6c15fb8bb11447))


### Performance

* **lib:** ai-lib checks every resource's zones, so idle resources hold no timer ([960b1a2](https://github.com/aifivem/aicore-packages/commit/960b1a2ce17165370b942dce2eb4d27721d827a6))
