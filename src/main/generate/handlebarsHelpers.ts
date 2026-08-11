// Shared Handlebars helpers for template checkboxes/conditionals. Used by
// both worker.ts (real generation) and preview.ts (one-off preview render)
// — each runs its own Handlebars instance, so both call this to stay in
// sync instead of registering these by hand twice.

import type Handlebars from 'handlebars'

export function registerTemplateHelpers(hb: typeof Handlebars): void {
  // {{#if (eq sex "Male")}}☑{{else}}☐{{/if}} — trimmed, case-insensitive so
  // "Yes" / "YES" / " yes " all match.
  hb.registerHelper('eq', (a: unknown, b: unknown) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase())

  // {{#if (notEmpty attachment)}}☑{{else}}☐{{/if}} — for columns where the
  // value itself is the evidence (a file link, a chosen sport, ...) rather
  // than a literal "Yes"/"No". Treats "No" / "None" / "N/A" / blank as empty.
  hb.registerHelper('notEmpty', (value: unknown) => {
    const v = String(value ?? '').trim()
    return v.length > 0 && !/^(no|none|n\/a)$/i.test(v)
  })
}
