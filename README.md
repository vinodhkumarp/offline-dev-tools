# Local Dev Toolbox

Developer utilities that run entirely in the browser: a safe place to format, decode, diff and inspect data you should not paste into public online tools, such as internal API specs, SQL, tokens and logs.

The app builds to a static folder. It has no backend and no analytics, and the production page blocks all outbound connections with a Content Security Policy. You can host it on an intranet, behind SSO, or in an air-gapped network.

## Tools

| Category | Tool | What it does |
| --- | --- | --- |
| API | Swagger Editor | Edit and preview OpenAPI/Swagger specs offline (bundled Swagger Editor, network blocked) |
| Data | JSON/YAML Formatter | Validate, format, minify, and convert between JSON and YAML |
| Data | Text Diff | Line diff with word-level highlights, in unified or split view |
| Data | SQL Formatter | Re-indent SQL for readability while keeping literals, comments and operators intact |
| Converters | Base64 | UTF-8 text encode/decode (base64 and base64url), file to data URL |
| Converters | URL Parser & Builder | Split a URL into its parts and edit query parameters in a grid |
| Converters | HTML Entities | Encode and decode HTML entities, with optional encoding of all non-ASCII characters |
| Security | JWT Debugger | Decode tokens and **verify signatures** (HS/RS/PS/ES 256–512, EdDSA) with a secret, PEM key, X.509 certificate, JWK or JWKS; check `exp`/`nbf`/`iss`/`aud` with clock skew |
| Security | Hash Generator | MD5, SHA-1, SHA-256, SHA-384, SHA-512 |
| Security | Regex Tester | Live match highlighting and capture groups |
| Security | Sandbox Diagnostics | Show the active CSP and origin/storage details, and clear the app's stored data |
| Utilities | UUID Generator | Bulk UUID v4 generation with formatting options |
| Utilities | Epoch Converter | Convert between Unix timestamps (s/ms) and dates |
| Utilities | Cron Parser | Validate 5-field crontab expressions (names, steps, `@daily` macros) and explain them in plain English |

The UI also has search, category filters, light and dark themes, and a responsive layout.

## Quick start

Requirements: Node.js 22.18 or newer (`.nvmrc` provided) and npm.

```bash
npm install      # also copies the Swagger Editor assets into public/
npm run dev      # start the Vite dev server
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Prepare Swagger assets and start Vite |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests with the built-in Node test runner (no extra dependencies) |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run check` | Lint, test and build (the same steps CI runs) |
| `npm run preview` | Serve the production build locally |

Serve `dist/` over HTTP(S). Opening `dist/index.html` straight from the filesystem does not work.

## Privacy and security model

- **No backend.** Every tool runs in the page. Nothing you enter leaves the browser.
- **Strict CSP in production.** `vite.config.ts` injects the policy. Builds get `script-src 'self'` and `connect-src 'none'`. The dev server gets a relaxed policy so Vite HMR can work.
- **Isolated Swagger Editor.** The editor runs in an iframe with its own CSP (`connect-src 'none'`). Remote validation, code generation and "Try it out" are turned off. The iframe needs `allow-scripts` and `allow-same-origin` so it can use `localStorage`. Browsers warn about that combination, so treat the frame's CSP, not the sandbox attribute, as the boundary.
- **Local storage only.** Only the theme and the Swagger spec are saved, in `localStorage`. "Clear data" removes just this app's keys.
- **Escaped output.** Syntax-highlighted output is HTML-escaped before rendering. HTML entity decoding runs in an inert document.

The browser profile and the web server are still part of your trust boundary. A local-only tool prevents accidental uploads. It cannot protect data from a compromised extension, device, dependency or host.

## Known limitations

- JWT verification cannot download keys, because the CSP blocks network access. Copy the issuer's JWKS (from its `jwks_uri`) or certificate and paste it in. Keys are held in memory only. Ed25519 needs a current browser (Chrome 137+, Firefox 129+, Safari 17+).
- JWT verification covers signed JWS tokens only. Encrypted JWE tokens and certificate-chain (`x5c`) trust validation are not supported.
- MD5 and SHA-1 are for legacy checksums only. Do not use them in new security designs.
- Regexes run on the main thread. A catastrophic-backtracking pattern can freeze the tab. Results are capped at 1,000 matches.
- The SQL formatter and cron parser are lightweight helpers, not full dialect-aware parsers.
- Text diff is capped for very large inputs so the tab stays responsive.

## Deployment

Any static host works (Nginx, S3/CloudFront, GitHub Pages, an internal web server).

- **Security headers:** you can also send the CSP as a response header. Headers allow directives that a `<meta>` tag cannot set, for example `frame-ancestors 'none'`.
- **Sub-path hosting:** set Vite's `base` option (for example `base: '/toolbox/'`). Asset, logo and Swagger iframe paths all follow `import.meta.env.BASE_URL`.
- **CI:** `.github/workflows/ci.yml` runs `npm ci` and `npm run check` on pushes and pull requests, then uploads `dist/` as a build artifact.

## Project structure

```text
src/
  App.tsx                  Dashboard, navigation, tool registry
  components/              One component per tool
  lib/                     Pure logic with unit tests (JWT verification, md5, cron, SQL formatting)
  storage.ts               App-owned localStorage keys
  index.css                Design system and responsive layout
scripts/
  copy-swagger-editor.js   Copies Swagger assets and generates the locked-down iframe host page
public/swagger-editor/     Generated at install time (git-ignored)
vite.config.ts             Build config and CSP injection
```

## Adding a tool

1. Create a component in `src/components/`.
2. Put any non-trivial logic in `src/lib/` and add a `*.test.ts` file next to it.
3. Register the tool in the `tools` array in `src/App.tsx`, with an id, name, description, category and icon.

## License

No license has been chosen yet. Add a `LICENSE` file before publishing the repository as open source.
