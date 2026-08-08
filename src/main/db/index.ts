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

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sheets (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      columns_json TEXT NOT NULL,
      rows_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mapping_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_id TEXT NOT NULL,
      mapping_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      sheet_id TEXT NOT NULL,
      output_dir TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      total INTEGER NOT NULL,
      succeeded INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS generation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      row_index INTEGER NOT NULL,
      row_label TEXT,
      output_file TEXT,
      status TEXT NOT NULL,
      error TEXT,
      FOREIGN KEY (job_id) REFERENCES generation_jobs (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
