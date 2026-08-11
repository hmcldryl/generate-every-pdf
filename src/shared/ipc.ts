// IPC channel names shared between main and preload/renderer.

export const IPC = {
  IMPORT_SHEET: 'import:sheet',
  LIST_TEMPLATES: 'template:list',
  CREATE_TEMPLATE: 'template:create',
  UPDATE_TEMPLATE: 'template:update',
  DELETE_TEMPLATE: 'template:delete',
  GET_TEMPLATE_SOURCE: 'template:source-get',
  PREVIEW_TEMPLATE: 'template:preview',
  DETECT_TEMPLATE_FIELDS: 'template:detect-fields',
  GET_TEMPLATE_SETTINGS: 'template:settings-get',
  SAVE_TEMPLATE_SETTINGS: 'template:settings-save',
  GENERATE_START: 'generate:start',
  GENERATE_CANCEL: 'generate:cancel',
  GENERATE_PROGRESS: 'generate:progress',
  GENERATE_ROW_RESULT: 'generate:row-result',
  SELECT_FILE: 'dialog:select-file',
  SELECT_HTML_FILE: 'dialog:select-html-file',
  SELECT_OUTPUT_DIR: 'dialog:select-output-dir',
  OPEN_OUTPUT_DIR: 'dialog:open-output-dir',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  STORAGE_GET_DIRS: 'storage:get-dirs'
} as const
