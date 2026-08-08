# Contributing to GenerateEveryPDF

Thanks for considering a contribution. This is a small Electron app — the process is lightweight.

## Dev setup

Requires Node.js 20+.

```sh
git clone https://github.com/hmcldryl/generate-every-pdf.git
cd generate-every-pdf
npm install
npm run dev
```

`npm install` runs `electron-builder install-app-deps` via `postinstall`, which rebuilds native modules (`better-sqlite3`) against Electron's Node ABI, not your system Node's. If you ever hit a `NODE_MODULE_VERSION` mismatch error on launch, re-run:

```sh
npx electron-builder install-app-deps
```

## Project layout

- `src/main/` — Electron main process:
  - `ipc/` — IPC handlers: import, mapping, generate, template, settings, history, stats.
  - `db/` — SQLite schema + queries (`better-sqlite3`).
  - `import/` — `.xlsx`/`.csv` parsing.
  - `generate/` — `worker_threads` entry running the Puppeteer batch-render loop.
- `src/preload/` — `contextBridge` API surface exposed to the renderer as `window.api`.
- `src/renderer/src/` — React UI: `AppShell.tsx` (sidebar + content layout) and `views/` (Dashboard, Templates, Mapping Presets, History, Settings, and the Import → Template → Mapping → Generate wizard).
- `src/shared/` — types (`types.ts`) and IPC channel names (`ipc.ts`) shared between main and renderer — keep both processes talking through these, not ad hoc payloads.
- `templates/` — user-facing template folders (see `templates/README.md`).

App flow: import a sheet → pick a template folder → map sheet columns to the template's declared fields (or paste raw mapping JSON) → generate. Generation spins up a single Puppeteer browser for the whole batch, renders each row's Handlebars template via `page.setContent()` + `page.pdf()`, and logs per-row success/failure to SQLite.

## Before opening a PR

```sh
npm run typecheck
npm run build
```

Both must pass clean. There's no automated test suite yet — a PR adding one is welcome.

## Making changes

- Keep `src/main` ↔ `src/renderer` communication going through `src/shared/ipc.ts` channel names and `src/shared/types.ts` types — don't hand-roll ad hoc IPC payloads.
- Template-facing behavior (field schema, file naming) belongs in `template.json`/auto-detection, not hardcoded in app code — the whole point of this app is that new document types don't require code changes.
- UI changes: match the existing sidebar-shell / card / table patterns in `src/renderer/src/styles.css` rather than introducing a new one-off style.

## Commit messages

Conventional, short subject line, body only when the "why" isn't obvious from the diff.

## Reporting bugs / requesting features

Open a GitHub issue. Include repro steps for bugs (sample sheet + template if the issue is data-shaped).
