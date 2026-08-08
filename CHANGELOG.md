# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) once it reaches 1.0.

## [Unreleased]

### Added

- Initial scaffold: Electron + React (Vite) desktop app.
- Sheet import (`.xlsx`/`.csv`) via SheetJS/PapaParse.
- Template system: any folder under `templates/` is a usable document type, with optional `template.json` field schema + file-naming pattern, falling back to auto-detected `{{placeholders}}`.
- Column → field mapping UI, editable as a form or raw JSON, with savable/reusable presets.
- Batch PDF generation via a single Puppeteer instance in a `worker_threads` background loop, with live progress and per-row success/failure logging to SQLite.
- Dashboard UI: sidebar shell with Dashboard, New Batch wizard, Templates browser, Mapping Presets manager, History, and Settings views.
