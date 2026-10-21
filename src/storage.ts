const APP_STORAGE_KEYS = [
  'theme',
  'swagger-editor-content',
  'ngStorage-SwaggerEditorCache',
  'apilab.v1',
  'apilab.proxy',
] as const;

export const clearAppStorage = () => {
  APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};
