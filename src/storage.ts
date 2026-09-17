const APP_STORAGE_KEYS = [
  'theme',
  'swagger-editor-content',
  'ngStorage-SwaggerEditorCache',
] as const;

export const clearAppStorage = () => {
  APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};
