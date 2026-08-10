# Templates

This folder is the app's bundled starter template, copied into `Documents/GenerateEveryPDF/Templates/` the first
time the app runs. From then on, the app reads and writes templates only under `Documents/GenerateEveryPDF/Templates/`
— editing anything here has no effect on an already-installed app.

Each folder under `Templates/` is one template. Create one from the app: Templates page → "+ New template" —
paste or load your HTML, it detects `{{placeholder}}` tags for you, then set the field list, start row, and
paper size.

```
Documents/GenerateEveryPDF/
├── Templates/
│   └── {template-name}/
│       ├── template.html      # Handlebars placeholders, e.g. {{recipientName}}
│       ├── style.css          # linked from template.html via <link rel="stylesheet" href="style.css">
│       ├── template.json      # the settings file: fields, mapping, startRow, paperSize, fileNamePattern
│       └── assets/            # optional: static images (letterhead, logo, signature) referenced by template.html
└── Images/                    # flat folder of row images — see "Image fields" below
```

## `template.json` — the one settings file

Everything for a template lives here: its field schema, which sheet column maps to each `{{placeholder}}`,
which row the sheet's data starts on, and the paper size. The app writes this file whenever you create a
template or edit its mapping (Template step of a batch), so it's reused next time.

```json
{
  "fields": [
    { "key": "documentId", "label": "Document ID", "type": "text", "required": true },
    { "key": "recipientName", "label": "Recipient Name", "type": "text", "required": true },
    { "key": "subscribed", "label": "Subscribed", "type": "checkbox" },
    { "key": "photo", "label": "Photo", "type": "image" }
  ],
  "mapping": {
    "documentId": "Doc No.",
    "recipientName": "Full Name"
  },
  "startRow": 2,
  "paperSize": "A4",
  "fileNamePattern": ["documentId", "recipientName"]
}
```

- `fields` — drives the mapping UI (column → field), set when you create the template.
  - `type` (optional, defaults to `text`) — documents intent only, not enforced: `text` prints the value as-is;
    `checkbox` is meant for the `eq`/`notEmpty` Handlebars helpers (see "Checkbox fields" below); `image` is
    meant for a filename resolved from the Images folder (see "Image fields" below).
- `mapping` — template field key → sheet column name, set from the app's Template step.
- `startRow` — 1-based row number to start reading sheet data from, counting data rows only (header row excluded). Default `1` (first data row). Use this to skip extra rows above the real data.
- `paperSize` — one of `Letter`, `Legal`, `Tabloid`, `Ledger`, `A0`–`A6`, or a custom `{ "width": "8.5in", "height": "11in" }`. Default `A4`.
- `fileNamePattern` — field keys joined with `_` to name each generated PDF. If omitted, files are named `row{N}_{template-name}.pdf`.

## Image fields

Sheet cells for an image field hold a plain filename — nothing else to configure per row:

1. Drop the image files into `Documents/GenerateEveryPDF/Images/`.
2. In the sheet, put the filename (e.g. `jane-doe.jpg`) in the mapped column.
3. Reference the field normally in `template.html`, e.g. `<img src="{{photo}}" />`.

At generation time, any mapped value that looks like an image path/filename is resolved against the Images
folder and embedded (recompressed to keep file size down) — this works regardless of whether the field is
tagged `"type": "image"` in `template.json`; the tag is there for your own documentation and for the app's
field-type dropdown to remember your choice.

## Checkbox fields

A checkbox in a PDF is just a Unicode box character switched by a Handlebars condition — there's no special
input type. Compare the mapped value against what you expect the sheet to contain:

```html
<span class="box">{{#if (eq attending "Yes")}}☑{{else}}☐{{/if}}</span>
```

Or, for fields where any non-empty value counts as "checked" (a chosen option, an attached file name, etc.):

```html
<span class="box">{{#if (notEmpty attachment)}}☑{{else}}☐{{/if}}</span>
```

Both helpers are registered in `src/main/generate/handlebarsHelpers.ts`.

See `sample-document/` for a working example of all three field types.
