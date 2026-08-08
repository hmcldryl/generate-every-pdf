import { randomUUID } from 'node:crypto'
import { getDb } from '../db'
import type { FieldMapping, MappingPreset } from '@shared/types'

interface PresetRow {
  id: string
  name: string
  template_id: string
  mapping_json: string
  created_at: string
}

function toPreset(r: PresetRow): MappingPreset {
  return {
    id: r.id,
    name: r.name,
    templateId: r.template_id,
    mapping: JSON.parse(r.mapping_json) as FieldMapping,
    createdAt: r.created_at
  }
}

export function listMappingPresets(templateId: string): MappingPreset[] {
  const db = getDb()
  const rows = db
    .prepare(`SELECT * FROM mapping_presets WHERE template_id = ? ORDER BY created_at DESC`)
    .all(templateId) as PresetRow[]
  return rows.map(toPreset)
}

export function listAllMappingPresets(): MappingPreset[] {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM mapping_presets ORDER BY created_at DESC`).all() as PresetRow[]
  return rows.map(toPreset)
}

export function deleteMappingPreset(id: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM mapping_presets WHERE id = ?`).run(id)
}

export function saveMappingPreset(name: string, templateId: string, mapping: FieldMapping): MappingPreset {
  const db = getDb()
  const preset: MappingPreset = {
    id: randomUUID(),
    name,
    templateId,
    mapping,
    createdAt: new Date().toISOString()
  }

  db.prepare(
    `INSERT INTO mapping_presets (id, name, template_id, mapping_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(preset.id, preset.name, preset.templateId, JSON.stringify(preset.mapping), preset.createdAt)

  return preset
}
