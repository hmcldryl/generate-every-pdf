# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) once it reaches 1.0.

## [Unreleased]

## [1.0.0] - 2026-08-10

### Added

- Initial scaffold: Electron + React (Vite) desktop app.
- Sheet import (`.xlsx`/`.csv`) via SheetJS/PapaParse.
- Template system: any folder under `Documents/GenerateEveryPDF/Templates/` is a usable document type, with optional `template.json` field schema + file-naming pattern, falling back to auto-detected `{{placeholders}}`.
- Column → field mapping UI, editable as a form or raw JSON, saved into each template's own `template.json`.
- Batch PDF generation via a single Puppeteer instance in a `worker_threads` background loop, with live progress and per-row success/failure reporting.
- Sidebar shell with New Batch wizard (Import → Template → Generate), Templates browser, and Settings.
- `Documents/GenerateEveryPDF/Templates/` and `Documents/GenerateEveryPDF/Images/`, created and seeded with a starter template on first run — templates and row images live outside the app's install directory.
- `image`-type template fields: a mapped sheet cell holding just a filename is resolved against `Documents/GenerateEveryPDF/Images/` and embedded (recompressed) at generation time.
- `checkbox`-type template fields, drawn via the `eq`/`notEmpty` Handlebars helpers.
- Template delete, with a confirmation prompt.
