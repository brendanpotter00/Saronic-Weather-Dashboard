import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'

// Serve the responses page at the extensionless /responses locally too, matching the
// vercel.json `cleanUrls` behaviour in production (dev + preview, no new dependency).
function responsesCleanUrl(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url && req.url.split('?')[0].replace(/\/$/, '') === '/responses') {
      req.url = '/responses.html'
    }
    next()
  }
  return {
    name: 'responses-clean-url',
    configureServer: (server) => {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(rewrite)
    },
  }
}

// Multi-page build: the dashboard (index.html) and the written-responses page
// (responses.html, served at /responses).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), responsesCleanUrl()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        responses: fileURLToPath(new URL('./responses.html', import.meta.url)),
      },
    },
  },
})
