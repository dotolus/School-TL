# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hebrew (RTL) school-year timeline ("ציר שנת הלימודים") for תשפ"ז (Sept 2026 – Aug 2027), now a Node app:

- `server/` — Express API + file-based JSON persistence + a cron scheduler hook.
- `client/` — React (Vite) frontend: a public viewer page and a password-protected `/admin` page for editing the data.
- `timeline.html` — the original static single-file version. It is **frozen**, kept only as a visual/structural reference (the client's CSS and component structure were ported from it 1:1). It is not served by the app and is not updated when the data changes.

There is no git repository initialized in this directory yet.

## Commands

From the repo root:
- `npm install` then `npm run install:client` — install server and client dependencies (first time only).
- `npm run dev` — runs the Express API (nodemon, port 4000) and the Vite dev server together; Vite proxies `/api/*` to Express (see `client/vite.config.js`). Open the Vite URL it prints.
- `npm run build` — builds the client into `client/dist`.
- `npm start` — runs `node server/index.js` only; if `client/dist` exists, Express serves it directly, so this is the single-process production mode (one port for UI + API).

Config is via env vars (see `.env.example`, loaded through `dotenv`): `PORT`, `ADMIN_PASSWORD` (shared password gating all `/admin` mutations), `SESSION_SECRET`, `SCHEDULER_CRON`.

There is no test suite configured.

## Architecture

### Data model

`server/data/timeline.json` is the single source of truth, a flat array of items (no nested month grouping — simpler than the original `SCHOOL_YEAR` structure):
```
{ id, type: "holiday"|"test"|"notice"|"project", m: 1-12, y, title, short, full,
  detail: { pages?, words?[], links?[{label,url,ph?}] }, "required-white-shirt"?: boolean }
```
`required-white-shirt` (optional, default `false`) marks an item that needs a white shirt (e.g. sports day); the viewer renders a pulsing white T-shirt badge (`client/src/viewer/WhiteShirtIcon.jsx`, `.white-shirt-badge` in `timeline.css`) next to such items to draw attention.
Hebrew month names are derived from a month-number lookup (`server/services/hebrewMonths.js`, mirrored in `client/src/hebrewMonths.js`) rather than stored per item. The viewer (`client/src/viewer/ViewerPage.jsx`) groups items by `(y, m)` and sorts chronologically to rebuild the month blocks.

`server/services/timelineStore.js` owns all reads/writes: in-memory cache, atomic writes (tmp file + `fs.rename`), and input validation (`validateItemInput`). Never write `timeline.json` directly from a route handler — go through this module.

Themes are a separate file, `server/data/themes.json`: `{ activeThemeId, themes: [{id, name, vars: {--bg, --paper, ...}}] }`, seeded from the two CSS variable sets in `timeline.html`'s `:root` blocks. `client/src/theme/ThemeProvider.jsx` fetches this and applies `vars` onto `document.documentElement.style` at runtime — **adding a new theme is a data change only** (POST/seed a new entry in `themes.json`), no CSS edits needed. The base CSS (`client/src/styles/timeline.css`) still carries the original light/dark values as a fallback so nothing is unstyled before JS runs.

### API (`server/routes/`)

- `GET /api/timeline` — public, full item list.
- `POST /api/timeline/items`, `PUT /api/timeline/items/:id`, `DELETE /api/timeline/items/:id` — admin-only (`requireAuth` middleware).
- `GET /api/themes` — public. `PUT /api/themes/active` — admin-only.
- `POST /api/auth/login` (checks `ADMIN_PASSWORD`, sets `express-session` cookie), `POST /api/auth/logout`, `GET /api/auth/me`.
- `GET /api/history?itemId=&limit=`, `POST /api/history/:eventId/restore` — admin-only, see **History & recovery** below.

### History & recovery

Every mutation in `server/services/timelineStore.js` (`addItem`/`updateItem`/`deleteItem`) also appends an entry to `server/data/history.jsonl` (JSON Lines, append-only, via `server/services/historyStore.js`): `{ id, ts, op: "create"|"update"|"delete"|"restore", itemId, title, before, after }`. `timelineStore.restoreFromHistory(eventId)` is the one restore path for both use cases — undeleting (restores a `delete` entry's `before` snapshot) and reverting properties (restores any other entry's `after` snapshot) — and itself logs a new `restore` entry, so a restore can later be undone the same way. The admin UI (`client/src/admin/HistoryPanel.jsx`) shows a global feed (needed since a deleted item no longer appears in the normal item list) or a per-item feed via the "היסטוריה" button in `ItemList.jsx`. The history log has no retention/pruning yet — a natural future job for the scheduler hook below.

### Client (`client/src/`)

- `viewer/` — mirrors the original static page's DOM structure and class names exactly (`.masthead`, `.rail-cell`, `.date-tag`, `<details class="item">`, etc.) against the ported `styles/timeline.css`, so visual output matches `timeline.html`. `ViewerPage.jsx` fetches `/api/timeline` on mount; current-month detection and the "jump to current month" scroll button are ported as-is from the original inline script.
- `admin/` — `AdminPage.jsx` gates on `GET /api/auth/me`; shows `LoginForm` until authenticated, otherwise item add/edit/delete (`ItemForm`, `ItemList`) and `ThemeSwitcher`.
- `App.jsx` routes `/` (viewer) and `/admin` via `react-router-dom`.

### Scheduler hook (`server/jobs/`)

`scheduler.js` registers cron jobs (via `node-cron`) at server boot, driven by `SCHEDULER_CRON`. `exampleJob.js` is a **no-op placeholder** — this is the intended extension point for a future recurring "business flow" that changes the timeline data periodically (e.g. auto-archiving past items, pulling from an external source). No real logic is implemented yet; add new jobs by exporting a `run()` function and registering it in the `JOBS` array in `scheduler.js`.

## Editing the data

Use the `/admin` page (password from `ADMIN_PASSWORD`), not the JSON file directly — it goes through `timelineStore`'s validation and atomic writes. The two Hebrew `.txt` files at the repo root (`דרישות מעניינות.txt` — feature ideas; `לח מבחנים-מחצית ראשונה.txt` — first-semester exam dates) were the source for the initial seed data in `server/data/timeline.json` and are no longer the live source of truth.
