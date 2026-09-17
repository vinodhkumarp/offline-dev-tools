import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'node_modules', 'swagger-editor-dist');
const destDir = path.join(rootDir, 'public', 'swagger-editor');

const filesToCopy = [
  'swagger-editor-bundle.js',
  'swagger-editor-standalone-preset.js',
  'swagger-editor.css',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'oauth2-redirect.html'
];

const defaultSpec = `openapi: 3.0.0
info:
  title: Private API Specification
  description: |
    This editor runs locally in your browser.
    Outbound requests are blocked by the editor frame's Content Security Policy.
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users list (mock)
      responses:
        '200':
          description: Successful response
`;

async function main() {
  console.log('Copying Swagger Editor assets...');

  // Ensure destination folder exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy files
  for (const file of filesToCopy) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file}`);
    } else {
      throw new Error(`Required Swagger Editor asset not found: ${srcPath}`);
    }
  }

  // Generate a minimal host page instead of patching the dependency's HTML.
  // The frame-level CSP is the enforcement boundary for the no-network promise.
  const indexPath = path.join(destDir, 'index.html');
  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'none'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none';" />
    <title>Swagger Editor</title>
    <link href="swagger-editor.css" rel="stylesheet" />
    <link rel="icon" type="image/png" href="favicon-32x32.png" sizes="32x32" />
  </head>
  <body>
    <div id="swagger-editor"></div>
    <script src="swagger-editor-bundle.js"></script>
    <script src="swagger-editor-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        if (!localStorage.getItem('swagger-editor-content')) {
          localStorage.setItem('swagger-editor-content', ${JSON.stringify(defaultSpec)});
        }

        window.editor = SwaggerEditorBundle({
          dom_id: '#swagger-editor',
          layout: 'StandaloneLayout',
          presets: [SwaggerEditorStandalonePreset],
          queryConfigEnabled: false,
          supportedSubmitMethods: [],
          validatorUrl: null,
          swagger2GeneratorUrl: null,
          oas3GeneratorUrl: null,
          swagger2ConverterUrl: null
        });
      };
    </script>
  </body>
</html>
`;

  fs.writeFileSync(indexPath, htmlContent, 'utf8');
  console.log('Generated offline Swagger Editor host page.');

  console.log('Swagger Editor copying completed successfully.');
}

main().catch(err => {
  console.error('Error copying Swagger Editor assets:', err);
  process.exit(1);
});
