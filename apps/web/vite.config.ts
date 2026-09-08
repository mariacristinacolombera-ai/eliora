import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'

// Serve and emit PDF.js support assets locally; no external CDN or runtime tokens.
function projectPdfAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const root = dirname(require.resolve('pdfjs-dist/package.json'))
  const assets = new Map<string, Buffer>()
  for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
    for (const file of readdirSync(join(root, directory))) {
      if (/\.(bcmap|pfb|ttf|wasm)$/.test(file) || file.startsWith('LICENSE')) assets.set(`/pdf-assets/${directory}/${file}`, readFileSync(join(root, directory, file)))
    }
  }
  return {
    name: 'project-pdf-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        const data = assets.get(path)
        if (!data) return next()
        res.setHeader('Content-Type', path.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream')
        res.end(data)
      })
    },
    generateBundle() {
      for (const [path, source] of assets) this.emitFile({ type: 'asset', fileName: path.slice(1), source })
    },
  }
}
export default defineConfig({ plugins: [react(), projectPdfAssets()] })
