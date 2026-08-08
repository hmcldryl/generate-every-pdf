# GenerateEveryPDF

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Windows desktop app that batch-generates PDFs from spreadsheet data. Bring your own HTML/CSS template and a JSON field schema — no fixed document types, no code changes per template.

Import a `.xlsx`/`.csv` → map its columns to your template's fields → generate one PDF per row. Built for runs of thousands of rows without freezing the UI.

## Features

- **Any document, any template** — a template is just a folder (`template.html` + `style.css` + optional `template.json`). Add a folder, get a new document type.
- **Data-driven field schema** — declare fields in `template.json`, or let the app auto-detect `{{placeholders}}` from your HTML.
- **Column → field mapping** — form UI or raw JSON, with savable/reusable presets per template.
- **Batch generation** — single headless-Chromium instance for the whole run, progress reported live, per-row success/failure logged to SQLite for auditability.
- **Local-first** — no cloud dependency. Sheets, presets, and history all live in a local SQLite file.
- **Dashboard UI** — sidebar app with Dashboard, Templates, Mapping Presets, History, and Settings, alongside the generation wizard.

## Screenshots

_None yet — contributions welcome._

## Quick start

Requires [Node.js](https://nodejs.org/) 20+ and Windows (packaging target; dev also runs on macOS/Linux).

```sh
git clone https://github.com/hmcldryl/generate-every-pdf.git
cd generate-every-pdf
npm install     # also rebuilds native deps (better-sqlite3) for Electron's ABI
npm run dev     # launch the app
```

Other scripts:

| Command | Description |
|---|---|
| `npm run dev` | Launch in development with hot reload |
| `npm run build` | Type-check and build main/preload/renderer to `out/` |
| `npm run typecheck` | Type-check only |
| `npm run dist` | Build and package a Windows installer to `dist/` |

## Creating a template

A template is a folder under `templates/`:

```
templates/
└── my-template/
    ├── template.html      # Handlebars placeholders, e.g. {{recipientName}}
    ├── style.css            # linked via <link rel="stylesheet" href="style.css">
    ├── template.json         # optional: field schema + output file naming
    └── assets/               # optional: images referenced by template.html
```

`template.json` (optional):

```json
{
  "fields": [
    { "key": "documentId", "label": "Document ID", "required": true },
    { "key": "recipientName", "label": "Recipient Name", "required": true }
  ],
  "fileNamePattern": ["documentId", "recipientName"]
}
```

See [`templates/README.md`](templates/README.md) and [`templates/sample-document/`](templates/sample-document) for a working example.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, architecture overview, and PR process
- [CHANGELOG.md](CHANGELOG.md)

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
