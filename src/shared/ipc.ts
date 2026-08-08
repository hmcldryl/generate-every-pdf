// IPC channel names shared between main and preload/renderer.

export const IPC = {
  IMPORT_SHEET: 'import:sheet',
  LIST_TEMPLATES: 'template:list',
  GET_TEMPLATE_FIELDS: 'template:fields',
  LIST_MAPPING_PRESETS: 'mapping:list',
  LIST_ALL_MAPPING_PRESETS: 'mapping:list-all',
  SAVE_MAPPING_PRESET: 'mapping:save',
  DELETE_MAPPING_PRESET: 'mapping:delete',
  GENERATE_START: 'generate:start',
  GENERATE_PROGRESS: 'generate:progress',
  GENERATE_ROW_RESULT: 'generate:row-result',
  SELECT_FILE: 'dialog:select-file',
  SELECT_OUTPUT_DIR: 'dialog:select-output-dir',
  OPEN_OUTPUT_DIR: 'dialog:open-output-dir',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  HISTORY_LIST: 'history:list',
  HISTORY_JOB_LOGS: 'history:job-logs',
  STATS_SUMMARY: 'stats:summary'
} as const
