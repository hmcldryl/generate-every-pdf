# GenerateEveryPDF

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Windows desktop app that batch-generates PDFs from spreadsheet data. Bring your own HTML/CSS template and a JSON field schema — no fixed document types, no code changes per template.

Import a `.xlsx`/`.csv` → map its columns to your template's fields → generate one PDF per row. Built for runs of thousands of rows without freezing the UI.

## Features

- **Any document, any template** — a template is just a folder (`template.html` + `style.css` + optional `template.json`). Add a folder, get a new document type.
- **Data-driven field schema** — declare fields in `template.json`, or let the app auto-detect `{{placeholders}}` from your HTML. Fields can be tagged `text`, `checkbox`, or `image`.
- **Column → field mapping** — form UI or raw JSON, saved back into the template's own `template.json` so it's remembered per template.
- **Row images by filename** — an `image`-type field's mapped sheet cell holds just a filename; the app looks it up in `Documents/GenerateEveryPDF/Images/` and embeds it, recompressed to keep PDFs small.
- **Batch generation** — single headless-Chromium instance for the whole run, progress reported live, failed rows skipped and reported without halting the batch.
- **Local-first** — no cloud dependency. Templates and images live under `Documents/GenerateEveryPDF/`; imported sheets and settings live in a local SQLite file.

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

On first run, the app creates `Documents/GenerateEveryPDF/Templates/` and `Documents/GenerateEveryPDF/Images/`,
seeded with a starter template. A template is a folder under `Templates/`:

```
Documents/GenerateEveryPDF/Templates/
└── my-template/
    ├── template.html      # Handlebars placeholders, e.g. {{recipientName}}
    ├── style.css            # linked via <link rel="stylesheet" href="style.css">
    ├── template.json         # optional: field schema + output file naming
    └── assets/               # optional: images that belong to the template itself (logo, letterhead)
```

`template.json` (optional):

```json
{
  "fields": [
    { "key": "documentId", "label": "Document ID", "type": "text", "required": true },
    { "key": "recipientName", "label": "Recipient Name", "type": "text", "required": true },
    { "key": "photo", "label": "Photo", "type": "image" }
  ],
  "fileNamePattern": ["documentId", "recipientName"]
}
```

See [`templates/README.md`](templates/README.md) and [`templates/sample-document/`](templates/sample-document) for a working example covering text, checkbox, and image fields.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, architecture overview, and PR process
- [PROJECT.md](PROJECT.md) — architecture and app flow
- [CHANGELOG.md](CHANGELOG.md)

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
