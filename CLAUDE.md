# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hebrew (RTL) school-year timeline ("ציר שנת הלימודים") for תשפ"ז (Sept 2026 – Aug 2027), now a Node app:

- `server/` — Express API + file-based JSON persistence + a cron scheduler hook.
- `client/` — React (Vite) frontend: a public viewer page and a password-protected `/admin` page for editing the data.
- `timeline.html` — the original static single-file version. It is **frozen**, kept only as a visual/structural reference (the client's CSS and component structure were ported from it 1:1). It is not served by the app and is not updated when the data changes.

## Commands

From the repo root:
- `npm install` then `npm run install:client` — install server and client dependencies (first time only).
- `npm run dev` — runs the Express API (nodemon, port 4000) and the Vite dev server together; Vite proxies `/api/*` to Express (see `client/vite.config.js`). Open the Vite URL it prints. `nodemon.json` deliberately excludes `server/data/` from its watch list — theme switches still write `themes.json` there, and without that exclusion nodemon restarts (and silently drops the in-memory `express-session` store, logging out `/admin`) on every single edit. Event mutations no longer touch `server/data/` at all (see **Persistence: MongoDB + Cloudinary** below), so this exclusion matters less than it used to, but is harmless to keep.
- `npm run build` — builds the client into `client/dist`.
- `npm start` — runs `node server/index.js` only; if `client/dist` exists, Express serves it directly, so this is the single-process production mode (one port for UI + API).

Config is via env vars (see `.env.example`, loaded through `dotenv`): `PORT`, `ADMIN_PASSWORD` (shared password gating all `/admin` mutations), `SESSION_SECRET`, `SCHEDULER_CRON`, `DATA_DIR` (still used by `themeStore.js`; also what tests use to redirect that persistence to a temp dir instead of the real `server/data/`), `MONGODB_URI`/`MONGODB_DB_NAME` (events + their history - see **Data model** below), `ACTIVE_SCHOOL`/`ACTIVE_CLASS`/`ACTIVE_PERIOD` (which dataset this server instance reads/writes), and `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (event images; falls back to inline data URIs if unset - see **Data model**).

### Tests

**Rule: every new implementation (new endpoint, new `timelineStore`/service function, new business rule or validation, new non-trivial UI behavior) must come with tests covering the new business requirement(s), and the full suite (`npm test`) must pass alongside them before the work is considered done.** This isn't optional polish — a feature without a test is treated as incomplete, not as a follow-up. Match the existing per-area test shape rather than inventing a new one: `server/services/__tests__/*.test.js` for store/service logic (validation rules, computed results), `server/__tests__/*.integration.test.js` for routes (via `createTestApp()` + `supertest`), `client/src/**/__tests__/*.test.jsx` for component behavior worth asserting on. If a change doesn't fit any existing test file, add a new one next to the code it covers rather than skipping coverage.

- `npm test` — Vitest: unit + component + integration, fast, no browser. Single run per invocation (`npm run test:watch` for watch mode).
- Single file/test: `npx vitest run path/to/thing.test.js` (or `-t "test name"` to filter by name); `npx playwright test e2e/viewer.spec.js` for one e2e spec.
- `npm run test:e2e` — builds the client then runs Playwright against the real built app (`e2e/*.spec.js`). First time: `npx playwright install chromium`.

`server/app.js` exports the Express `app` with no `.listen()` call specifically so tests can drive it in-process (via `supertest`) without a real port or the cron scheduler starting; `server/index.js` is the thin runtime entrypoint that adds those two things. Integration tests (`server/__tests__/*.integration.test.js`) and the server-side unit tests that touch Mongo (`timelineStore`/`historyStore`) point `MONGODB_URI` at an isolated in-memory `mongod` (via `mongodb-memory-server`, one instance per test file, started lazily and stopped in that file's `afterAll`) and `MONGODB_DB_NAME` at a fresh random database name per test, via the shared `createTestApp()` helper in `server/__tests__/testApp.js` (the equivalent unit-test setup is inlined at the top of `timelineStore.test.js`/`historyStore.test.js` since those don't go through `app.js`) — **critically, this clears every already-`require`d `server/` module from Node's own `require.cache` by hand**, not via `vi.resetModules()` (which does not reliably bust CJS `require()` caching here); if you add a new server module that reads from `config.js` at require-time, this is why a stale value won't leak into the next test. Never reuse `createTestApp()`'s pattern with a bare `vi.resetModules()` only — it silently doesn't isolate. `createTestApp()` also blanks out the `CLOUDINARY_*` env vars before requiring `app.js`, since `dotenv` never overwrites an already-set var — without that, a real local `.env`'s Cloudinary credentials would leak into the test run and `imageStore.js` would make real network calls against your actual account instead of falling back to a data URI.

Playwright's config (`playwright.config.js`) points `DATA_DIR` at an isolated temp dir too, and seeds it from the real `server/data/themes.json`: a genuine deployment always starts from the committed seed file (there's no API to *create* a new theme, only to switch the active one), so an e2e run against a truly empty `DATA_DIR` would test a state that can't actually occur. Keep that seeding if you add more e2e specs. Events don't live in `DATA_DIR` anymore, so its `webServer.command` points at `e2e/start-server.js` instead of `server/index.js` directly - that script boots its own in-memory `mongod`, seeds it from `server/data/timeline.json` (same "mirror a real deployment's starting state" rationale, just via Mongo), then requires the real `server/index.js` in-process. `CLOUDINARY_*` is deliberately left unset for e2e too (explicitly blanked in `webServer.env`, in case the shell running it has real credentials exported) so the image-upload spec (`e2e/lightbox.spec.js`) exercises `imageStore.js`'s data-URI fallback rather than needing real Cloudinary credentials in CI.

### Linting

`npm run lint` runs ESLint (`eslint.config.js`, flat config). Three deliberate scope decisions, don't "fix" these without reconsidering why:
- `react/prop-types` is off — this is plain JS (no TypeScript), nothing anywhere uses PropTypes, so enforcing it would mean retrofitting every component rather than being a lint-config change.
- Only `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` are enabled from `eslint-plugin-react-hooks` — its `recommended` config (v7+) bundles React *Compiler* readiness rules (`purity`, `immutability`, `gating`, `static-components`, ...); this app doesn't use the Compiler, so those don't apply.
- `eslint` is pinned to `^9` — `eslint-plugin-react`'s peer range doesn't yet cover ESLint 10.

A **Claude Code hook** (`.claude/settings.json`, `PreToolUse`/`Bash`, filtered via `"if": "Bash(git push *)"`) runs `.claude/hooks/lint-before-push.js` before any `git push`-shaped Bash command and blocks it (via `permissionDecision: "deny"`) if `npm run lint` fails. `.claude/settings.json` and `.claude/hooks/` are deliberately carved out of the `.claude/*` gitignore rule (see `.gitignore`) so this hook is shared with anyone who clones the repo, not just a local preference.

### CI

`.github/workflows/ci.yml` runs on every `push` and `pull_request`: two parallel jobs, `test` (`npm test`) and `e2e` (installs Playwright's Chromium + OS deps, then `npm run test:e2e`). The e2e job uploads the Playwright HTML report as a build artifact if it fails (`playwright.config.js` only generates that report when `CI` is set — locally it's just the plain `list` reporter).

`.github/workflows/main-report.yml` is a separate, narrower workflow: it only triggers on a `push` to `main` (i.e. after a PR merges), and — unlike `ci.yml`'s e2e job, which only uploads its report on failure — it **always** runs both suites to completion and publishes a report regardless of outcome: a pass/fail table plus the tail of each suite's output written to the run's job summary (`$GITHUB_STEP_SUMMARY`), and the full logs + Playwright HTML report uploaded as a single `main-test-report-<sha>` artifact. It uses `if: always()` on the e2e/summary/upload steps specifically so a failing unit-test step doesn't skip the rest of the job and leave `main` without a report. There's no real GitHub webhook involved — a webhook only POSTs an event payload to an external endpoint and can't run anything itself, so "run tests and report after main updates" is implemented as this push-triggered Action instead.

### Versioning

`package.json`'s (and `client/package.json`'s, kept in lockstep) `version` field is bumped automatically by `.github/workflows/version-bump.yml` on every `push` to `main`: it reads the triggering commit's message and applies **conventional-commit-style detection** (`scripts/bump-version.js`'s `detectBumpType`) — `BREAKING CHANGE` anywhere in the message, or a `major:`/`feat!:` subject, is a **major** bump; a `feat:` subject is a **minor** bump; anything else (`fix:`, `chore:`, `docs:`, or no prefix at all) is a **patch** bump. It then commits the bump as `github-actions[bot]` with the message `chore: bump version to X.Y.Z [skip ci]`, tags it `vX.Y.Z`, and pushes both straight to `main`. The `[skip ci]` is load-bearing: combined with GitHub's native behavior of not re-triggering push-workflows for commits made with the default `GITHUB_TOKEN`, it's a second, explicit guard against the workflow looping on its own bump commits — there's also a same-workflow guard step that checks the latest commit message before doing anything. This requires `permissions: contents: write` in the workflow and assumes `main` has no branch protection blocking direct pushes from Actions; if that's ever turned on, this workflow needs an exemption or a different token.

`scripts/bump-version.js` is also exposed for deliberate manual releases via `npm run release:major` / `release:minor` / `release:patch` — these skip the commit-message detection and just apply the given bump type directly to both `package.json` files (uncommitted; you review and commit yourself). Don't run one of these *and* rely on the next merge's auto-bump for the same change — they're not coordinated, so you'd double-bump.

**Claude Code rule:** before creating a pull request to `main`, ask which kind of version bump to apply — major, minor, patch, or "leave as is" (for when the version on the branch has already been bumped manually for this change). If a bump is chosen, run the matching `npm run release:*` script and commit the result on the branch first, and only then open the PR. "Leave as is" skips straight to opening the PR.

The client embeds the root `package.json` version at build time as the `__APP_VERSION__` global — set via `define` in both `client/vite.config.js` and the root `vitest.config.js` (so component tests see the same global without a real build), and declared for ESLint in `eslint.config.js`'s client globals block. `client/src/version.js` re-exports it as `APP_VERSION`; `Footer.jsx` (viewer) and `AdminPage.jsx` display it. There's no server-side `/api/version` — the version is a client build-time constant, not something fetched at runtime.

## Architecture

### Data model

Events live in MongoDB now (not a JSON file) — see **Persistence: MongoDB + Cloudinary** below for why and for the full document shape. Every API response and the in-memory item shape everywhere else in the codebase (client, `eventsApi.js`, tests) is still exactly:
```
{ id, type: "holiday"|"test"|"notice"|"project", m: 1-12, y, title, short, full,
  detail: { pages?, words?[], links?[{label,url,ph?}], images?[{id,url}] }, "required-white-shirt"?: boolean }
```
`server/services/timelineStore.js` strips Mongo-only fields (`school`, `class`, `period`, `status`, `history`, `_id`→`id`, timestamps) before returning anything, so nothing outside that module needs to know persistence changed.

`required-white-shirt` and `required-food` (both optional, default `false`) mark an item that needs a white shirt (e.g. sports day) or that parents should send food for (e.g. a class party). The viewer renders a pulsing badge next to such items — `client/src/viewer/WhiteShirtIcon.jsx` / `FoodIcon.jsx`, sharing the `.reminder-badge` pulse styling in `timeline.css` — to draw attention; an item can carry both flags at once. Adding another such reminder flag later means: a new optional boolean in `validateItemInput`/`addItem` (`timelineStore.js`), a new icon component reusing `.reminder-badge`, a render check in `ItemRow.jsx`/`ItemDetail.jsx`, and a checkbox in `ItemForm.jsx`.
Hebrew month names are derived from a month-number lookup (`server/services/hebrewMonths.js`, mirrored in `client/src/hebrewMonths.js`) rather than stored per item. The viewer (`client/src/viewer/ViewerPage.jsx`) groups items by `(y, m)` and sorts chronologically to rebuild the month blocks.

`detail.images` holds `{id, url, publicId}` entries. `url` is a Cloudinary-hosted `https://` URL (or an inline `data:` URI if Cloudinary isn't configured — see below); either way it's just a string the client drops straight into `<img src>`, so nothing client-side cares which. Images are uploaded/removed via dedicated admin-only sub-routes (`POST`/`DELETE /api/timeline/items/:id/images[/:imageId]` in `timeline.routes.js`, multipart via `multer` into memory, never disk) which go through the normal `timelineStore.updateItem` path underneath, so image changes are validated and show up in history like any other edit. Deleting an image reference never calls out to delete the backing Cloudinary asset (so old history snapshots referencing it still resolve) — a deliberate, unbounded tradeoff like the history retention gap below. The admin upload UI (`client/src/admin/ImageManager.jsx`, used from `ItemForm.jsx` — edit-only, since uploading needs an existing item id) posts directly to those routes. In the viewer, clicking a thumbnail (`ItemDetail.jsx`) opens it in `client/src/viewer/Lightbox.jsx` (a full-page in-app overlay with zoom buttons + mouse wheel, Escape/backdrop/× to close — never a plain `<a href>`, so it never triggers a browser download) via the `LightboxProvider` context (`client/src/viewer/LightboxProvider.jsx`, wrapped around the app in `App.jsx` next to `ThemeProvider`) so any component can call `useLightbox().open(url)` without prop-drilling.

`server/services/timelineStore.js` owns all reads/writes: input validation (`validateItemInput`, unchanged — pure and synchronous, no DB access) plus the Mongo queries. Never query the `events` collection directly from a route handler — go through this module.

Themes are unaffected by this: still a separate file, `server/data/themes.json`: `{ activeThemeId, themes: [{id, name, vars: {--bg, --paper, ...}}] }`, seeded from the two CSS variable sets in `timeline.html`'s `:root` blocks. `client/src/theme/ThemeProvider.jsx` fetches this and applies `vars` onto `document.documentElement.style` at runtime — **adding a new theme is a data change only** (POST/seed a new entry in `themes.json`), no CSS edits needed. The base CSS (`client/src/styles/timeline.css`) still carries the original light/dark values as a fallback so nothing is unstyled before JS runs.

### Persistence: MongoDB + Cloudinary

The original design kept everything in `server/data/*.json`/`*.jsonl` on local disk. That broke on any real deploy: a hosting platform's filesystem is typically ephemeral or gets reset to the git checkout on redeploy, silently discarding any edits made through `/admin` since the last commit. Events (and their images) now live in MongoDB (`server/services/db.js`, lazy-connecting singleton) and Cloudinary respectively, which survive redeploys independent of the app's own filesystem. `themeStore.js` was deliberately left on the old file-based approach — out of scope for this change, since theme-switching isn't user-facing data that gets lost the same way.

Each event is one document in the `events` collection:
```
{ _id, school, class, period, status: "active"|"deleted",
  type, m, y, title, short, full, detail, "required-white-shirt", "required-food",
  history: [{ id, ts, op, itemId, title, before, after }],
  createdAt, updatedAt }
```
`school`/`class`/`period` (e.g. `reut`/`e4`/`2026-2027`) tag which dataset an event belongs to, so several schools/classes/years can share one collection without colliding — a compound index on `{school, class, period, status}` backs the common query shape. `ACTIVE_SCHOOL`/`ACTIVE_CLASS`/`ACTIVE_PERIOD` (env vars, see Commands above) pick which dataset a given server instance reads/writes; switching datasets today means changing those and redeploying — there's no runtime admin UI for it yet (deliberately deferred; the schema is ready for one). `scripts/migrate-to-mongo.js` is a one-off, safely-rerunnable script that loads `server/data/timeline.json` into Mongo under the active dataset tag; it's how the original demo data got seeded, not something the running app calls.

Deletes are soft (`status: "deleted"`, document never removed) rather than hard, specifically so a deleted item's embedded `history` array stays reachable for the undelete flow described below — `getAll`/`getItem` simply filter to `status: "active"`.

Event images go through `server/services/imageStore.js`, a thin Cloudinary wrapper (`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`). If those aren't set — a fresh clone before `.env` is configured, or CI/e2e deliberately running without them — `uploadImage` falls back to returning the upload as an inline `data:` URI instead of failing outright; this is a dev/test convenience, not meant for production use (every image bloats its owning Mongo document instead of living on a CDN).

### History & recovery

### API (`server/routes/`)

- `GET /api/timeline` — public, full item list.
- `POST /api/timeline/items`, `PUT /api/timeline/items/:id`, `DELETE /api/timeline/items/:id` — admin-only (`requireAuth` middleware).
- `POST /api/timeline/items/:id/images` (multipart, field `image`), `DELETE /api/timeline/items/:id/images/:imageId` — admin-only; see **Data model** above for the images mechanism.
- `POST /api/timeline/import` (multipart, field `file`, a `.json` file) — admin-only; bulk-loads items in the same shape `GET /api/timeline` returns (`{ items: [...] }`, or a bare array). This is the backing endpoint for the "ייבוא נתונים" panel on `/admin` (`client/src/admin/ImportPanel.jsx`). Semantics, deliberately chosen over simpler alternatives: **merge by id** (an item whose `id` matches an existing one overwrites it like `updateItem`; everything else is created like `addItem`, with a fresh id) and **all-or-nothing validation** (`timelineStore.importItems` runs `validateItemInput` over every item first and aborts the whole import — writing nothing — if any one of them fails, returning `{ error, details: [{index, error}] }`). Validation still runs as one upfront, all-or-nothing pass before any write happens, but once writing starts each item is its own Mongo document write (atomic per-document, not one all-or-nothing transaction across the whole batch — a known, accepted tradeoff at this app's scale); history still gets one `create`/`update` entry per item (embedded in that item's own document, `server/services/timelineStore.js`), so each imported item remains individually revertable via the normal history/restore flow.
- `GET /api/themes` — public. `PUT /api/themes/active` — admin-only.
- `POST /api/auth/login` (checks `ADMIN_PASSWORD`, sets `express-session` cookie), `POST /api/auth/logout`, `GET /api/auth/me`.
- `GET /api/history?itemId=&limit=`, `POST /api/history/:eventId/restore` — admin-only, see **History & recovery** below.
- `GET /api/events` — public, stable contract for external consumers (e.g. a future calendar export). Deliberately separate from `/api/timeline`: `server/services/eventsApi.js` maps internal items to a decoupled shape (`month`/`year` instead of `m`/`y`, `shortDate`/`fullDate` instead of `short`/`full`, `requiresWhiteShirt`/`requiresFood` instead of the hyphenated internal keys, placeholder links resolved to `url: null`) so external callers aren't coupled to internal field-naming changes. If you add a new internal item field, decide deliberately whether it belongs in this mapping too — don't assume it should just pass through.

### History & recovery

Every mutation in `server/services/timelineStore.js` (`addItem`/`updateItem`/`deleteItem`/`restoreFromHistory`) also appends an entry directly into that event document's own embedded `history` array (atomically, via the same `$set`+`$push` Mongo update that changes the fields): `{ id, ts, op: "create"|"update"|"delete"|"restore", itemId, title, before, after }`. `server/services/historyStore.js` is read-only now — it queries across those embedded arrays (an aggregation `$unwind` for the global feed, a plain filter for one item's feed) rather than storing anything itself; the one place history entries get written is `timelineStore.js`, since a legitimate entry is always tied to a real event document. `timelineStore.restoreFromHistory(eventId)` is the one restore path for both use cases — undeleting (restores a `delete` entry's `before` snapshot, and flips `status` back to `"active"`) and reverting properties (restores any other entry's `after` snapshot) — and itself logs a new `restore` entry, so a restore can later be undone the same way. The admin UI (`client/src/admin/HistoryPanel.jsx`) shows a global feed (needed since a deleted item no longer appears in the normal item list — soft-delete keeps its document, and therefore its history, around) or a per-item feed via the "היסטוריה" button in `ItemList.jsx`. The history log has no retention/pruning yet — a natural future job for the scheduler hook below.

### Client (`client/src/`)

- `viewer/` — mirrors the original static page's DOM structure and class names exactly (`.masthead`, `.rail-cell`, `.date-tag`, `<details class="item">`, etc.) against the ported `styles/timeline.css`, so visual output matches `timeline.html`. `ViewerPage.jsx` fetches `/api/timeline` on mount; current-month detection and the "jump to current month" scroll button are ported as-is from the original inline script.
- `admin/` — `AdminPage.jsx` gates on `GET /api/auth/me`; shows `LoginForm` until authenticated, otherwise item add/edit/delete (`ItemForm`, `ItemList`, with `ImageManager` nested for editing an existing item's images), `ThemeSwitcher`, and `HistoryPanel`.
- `App.jsx` routes `/` (viewer) and `/admin` via `react-router-dom`.

### Scheduler hook (`server/jobs/`)

`scheduler.js` registers cron jobs (via `node-cron`) at server boot, driven by `SCHEDULER_CRON`. `exampleJob.js` is a **no-op placeholder** — this is the intended extension point for a future recurring "business flow" that changes the timeline data periodically (e.g. auto-archiving past items, pulling from an external source). No real logic is implemented yet; add new jobs by exporting a `run()` function and registering it in the `JOBS` array in `scheduler.js`.

## Editing the data

Use the `/admin` page (password from `ADMIN_PASSWORD`), not the database directly — it goes through `timelineStore`'s validation. `server/data/timeline.json` itself is no longer read by the running app; it's kept only as the seed fixture for `scripts/migrate-to-mongo.js` and for e2e (`e2e/start-server.js`). The two Hebrew `.txt` files at the repo root (`דרישות מעניינות.txt` — feature ideas; `לח מבחנים-מחצית ראשונה.txt` — first-semester exam dates) were the source for that original seed data and are no longer the live source of truth.
