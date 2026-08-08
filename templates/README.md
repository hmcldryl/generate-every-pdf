# Templates

Each folder here is one template. Add a folder, get a template — no app code changes needed.

```
templates/
└── {template-name}/
    ├── template.html      # Handlebars placeholders, e.g. {{recipientName}}
    ├── style.css           # linked from template.html via <link rel="stylesheet" href="style.css">
    ├── template.json        # optional: field schema + output file naming
    └── assets/              # optional: images (letterhead, logo, signature) referenced by template.html
```

## `template.json` (optional)

```json
{
  "fields": [
    { "key": "documentId", "label": "Document ID", "required": true },
    { "key": "recipientName", "label": "Recipient Name", "required": true }
  ],
  "fileNamePattern": ["documentId", "recipientName"]
}
```

- `fields` — drives the mapping UI (column → field). If omitted, fields are auto-detected by scanning `template.html` for `{{placeholders}}`.
- `fileNamePattern` — field keys joined with `_` to name each generated PDF. If omitted, files are named `row{N}_{template-name}.pdf`.

See `sample-document/` for a working example.
