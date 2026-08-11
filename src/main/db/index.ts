import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'docgen.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  migrate(db)
  return db
}

// Only imported sheets and key/value app settings are persisted here.
// Field mapping lives in each template's template.json, and batches are not
// logged, so this schema stays intentionally small.
function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sheets (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      columns_json TEXT NOT NULL,
      rows_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
