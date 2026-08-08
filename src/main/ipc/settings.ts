import { getDb } from '../db'
import type { AppSettings } from '@shared/types'

const KNOWN_KEYS: (keyof AppSettings)[] = ['defaultOutputDir']

export function getSettings(): AppSettings {
  const db = getDb()
  const rows = db.prepare(`SELECT key, value FROM settings`).all() as Array<{ key: string; value: string }>
  const settings: AppSettings = {}
  for (const row of rows) {
    if (KNOWN_KEYS.includes(row.key as keyof AppSettings)) {
      ;(settings as Record<string, string>)[row.key] = row.value
    }
  }
  return settings
}

export function setSetting(key: keyof AppSettings, value: string | undefined): AppSettings {
  const db = getDb()
  if (value === undefined || value === '') {
    db.prepare(`DELETE FROM settings WHERE key = ?`).run(key)
  } else {
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, value)
  }
  return getSettings()
}
