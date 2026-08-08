# Security Policy

## Supported Versions

Pre-1.0, only the latest commit on `main` is supported.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, use GitHub's [private vulnerability reporting](https://github.com/hmcldryl/generate-every-pdf/security/advisories/new) for this repo, or contact the maintainer directly. Include:

- A description of the issue and its impact
- Steps to reproduce
- Affected version/commit

Expect an initial response within a few days. This is a locally-run desktop app with no server component; realistic report categories are things like Electron/Chromium sandbox issues, unsafe template rendering (e.g. arbitrary code execution via a crafted `template.html`/`template.json`), or SQL injection in the local SQLite layer.
