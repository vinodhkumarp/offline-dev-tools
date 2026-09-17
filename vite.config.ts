import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const basePolicy = {
  'default-src': ["'none'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'frame-src': ["'self'", 'blob:'],
  'child-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
}

// Production: no inline scripts and no outbound connections from the main page.
const buildPolicy = {
  ...basePolicy,
  'script-src': ["'self'"],
  'connect-src': ["'none'"],
}

// Dev server: Vite/React Refresh need an inline preamble and a local HMR socket.
const devPolicy = {
  ...basePolicy,
  'script-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", 'ws://localhost:*', 'http://localhost:*', 'ws://127.0.0.1:*', 'http://127.0.0.1:*'],
}

const serializePolicy = (policy: Record<string, string[]>) =>
  Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')

const CSP_PLACEHOLDER = '<!-- CONTENT_SECURITY_POLICY -->'

const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  transformIndexHtml(html, ctx) {
    const policy = serializePolicy(ctx.server ? devPolicy : buildPolicy)
    const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
    if (!html.includes(CSP_PLACEHOLDER)) {
      throw new Error(`index.html must contain ${CSP_PLACEHOLDER} so the Content Security Policy is applied`)
    }
    return html.replace(CSP_PLACEHOLDER, meta)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
})
