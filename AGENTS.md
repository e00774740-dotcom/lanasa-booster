# Project Guidance

## User Preferences

- Nombre de la app: LaNasa🥷🏻 Booster
- Estética espacial neón: fondo oscuro tipo cosmos, acentos luminosos, tipografía distintiva no por defecto
- Interfaz en español
- Diseño responsivo para móvil Android y escritorio

## Accepted Requirements

- Activar los ajustes de rendimiento con Shizuku sin root
- Ofrecer las opciones de 60 y 90 FPS sin root junto a la de 120 FPS
- Añadir el módulo FF Performance Core (ff_perf v1.0) con ajustes por usuario, registro almacenado y migración

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Frontend data hooks live in src/frontend/src/hooks/useQueries.ts using useActor(createActor) from @caffeineai/core-infrastructure inside React Query hooks.
- Migration files must inline their own types and import only mo:core or mops packages, never ../types; fold a new stable field into the pending migration's NewActor while the actor body declares it type-only.
- OQL manual entities need explicit type instantiation Entity.manual<Row>(...) with an annotated iter lambda, plus one <Type>Value import per payload field type.
- Decorative Tailwind/motion animations (animate-fade-up, animate-pulse, motion/react) should carry a motion-safe/motion-reduce guard to honor prefers-reduced-motion.
- Auto module lives in src/frontend/src/components/AutoFire.tsx with hooks autoKeys, useAutoSettings, useSaveAutoSettings, useResetAutoSettings in src/frontend/src/hooks/useQueries.ts; it renders inside BoostConsole in src/frontend/src/App.tsx.
- AutoSettings is a generated interface whose six fields are bigint; inputs hold string drafts and convert with BigInt on save.
- Backend Auto settings are per-caller in src/backend/lib/auto.mo (get, save, reset) over Map<Principal, AutoSettings>, exposed via mixins/auto-api.mo and the AutoApi wiring in main.mo.
- Applied migrations are frozen read-only: never edit src/backend/migrations/00000000_000000.mo; add a new timestamped migration for a stored-field change.
- OQL manual entities over Map<Principal, Record> flatten entries into a row carrying the owner key, then .ownedBy("owner").scopedPerUser(); each entity needs .sample(...) and explicit .payload(...) per field.
- Biome useSemanticElements rejects <p role="status">; use <output aria-live="polite"> for success confirmations.
- The 120 FPS card lives in src/frontend/src/components/RefreshRate.tsx and renders inside BoostConsole in src/frontend/src/App.tsx; it reads the per-caller Auto settings via refreshKeys/useRefreshSettings/useSaveRefreshSettings/useResetRefreshSettings in src/frontend/src/hooks/useQueries.ts.
- AutoSettings now has seven Nat fields (buttonX, buttonY, swipeDistance, gestureDuration, pauseBetween, shotsPerBurst, refreshRate) with defaults 940/2080/150/80/45/5/120; the refreshRate field is stored per caller through getAutoSettings/saveAutoSettings/resetAutoSettings.
- The draft pending migration is src/backend/migrations/20261102_120000.mo; applied migrations (00000000_000000.mo, 20261102_000000.mo) are frozen read-only, so a stored-field change goes into the pending migration.
- Adding a field to the generated AutoSettings breaks AutoFire.tsx's toSettings; preserve the new field via a refreshRateOf(settingsQuery.data) helper instead of exposing it as an editable input.
- RefreshRate reads getAutoSettings under refreshKeys.settings while AutoFire uses autoKeys.settings; both mutations invalidate both keys, keeping the two caches consistent.
- A disabled TanStack query (enabled:false) reports isLoading false, so a component's isLoading branch is skipped and it renders with undefined data; guard handlers with data checks.
- biome check --write can reformat tester-owned test files; revert those with git checkout to leave the tester's files untouched.
- Shizuku availability is inferred from the Android UA in src/frontend/src/components/RefreshRate.tsx; activation persists shizukuActive via saveAutoSettings while preserving every other Auto field.
- The refresh-rate card renders 'Módulo de frecuencia' while the inherited refresh-rate-characterization.test.tsx still expects a /120 FPS/ heading; that test is tester-owned and fails pre-existing.
- The inherited suite has 8 pre-existing failures (frontend 3, backend 5) recorded as the draft baseline; the refresh-rate tests fail on ambiguous 60/90 Hz text queries.
- FF Performance Core module mirrors Auto: types/ffperf.mo (FfPerfSettings: targetFps Nat + cpuGovernor/ioScheduler/networkMode/thermalProfile Text, defaults 120/performance/cfq/balanced/balanced), lib/ffperf.mo get/save/reset over Map<Principal,FfPerfSettings>, mixins/ffperf-api.mo, lib/ffperf-oql.mo flattened row, registered as an Entity.manual scopedPerUser in main.mo.
- The FF Performance Core card lives in src/frontend/src/components/FFPerformanceCore.tsx and renders inside BoostConsole in src/frontend/src/App.tsx; it reads the per-caller settings via ffPerfKeys/useFfPerfSettings/useSaveFfPerfSettings/useResetFfPerfSettings in src/frontend/src/hooks/useQueries.ts.
- OQL manual entities with Text payload fields need import TextValue "mo:caffeineai-oql/TextValue" in main.mo, else M0230 _toRow Text.
- The pending migration is src/backend/migrations/20261102_140000.mo (adds ffPerfSettings Map<Principal,FfPerfSettings>); applied migrations are frozen read-only, so a stored-field change goes into a new timestamped migration.
- The inherited suite still has 8 pre-existing failures (frontend 3, backend 5) recorded as the draft baseline; the refresh-rate tests fail on ambiguous 60/90 Hz text queries.
