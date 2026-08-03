import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join, extname, resolve, sep } from 'path'
import { existsSync } from 'fs'
// @ts-ignore - plain ESM module shared with server.mjs
import {
  IMAGE_MIME,
  ALLOWED_IMAGE_EXTS,
  MAX_IMAGE_SIZE,
  getImageTimestamp,
} from './server-shared.mjs'

// Optional: restrict /api/local-image to a single directory (same as server.mjs)
const IMAGE_ROOT = process.env.IMAGE_ROOT ? resolve(process.env.IMAGE_ROOT) : ''
const imageMime = IMAGE_MIME as Record<string, string>

function isInsideImageRoot(filePath: string): boolean {
  if (!IMAGE_ROOT) return true
  const safe = resolve(filePath)
  return safe === IMAGE_ROOT || safe.startsWith(IMAGE_ROOT + sep)
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'local-image-server',
      configureServer(server) {
        // Serve local file paths (for preview of local images)
        server.middlewares.use('/api/local-image', async (req, res) => {
          try {
            const url = new URL(req.url!, 'http://localhost')
            const filePath = url.searchParams.get('path') ?? ''
            const ext = extname(filePath).slice(1).toLowerCase()
            if (!filePath || !imageMime[ext]) {
              res.statusCode = 400
              res.end('Invalid path or extension')
              return
            }
            // Normalize Windows-style backslashes
            const normalized = filePath.replace(/\\/g, '/')
            if (!isInsideImageRoot(normalized)) {
              res.statusCode = 403
              res.end('Path outside IMAGE_ROOT')
              return
            }
            const data = await readFile(resolve(normalized))
            res.setHeader('Content-Type', imageMime[ext])
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(data)
          } catch {
            res.statusCode = 404
            res.end('Image not found')
          }
        })

        server.middlewares.use('/api/save-image', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method Not Allowed')
            return
          }

          const ext = String(req.headers['x-image-ext'] || 'png').toLowerCase()
          // Validate extension against the whitelist to prevent arbitrary file writes
          if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: `Extension not allowed: ${ext}` }))
            return
          }

          const filename = `image-${getImageTimestamp()}.${ext}`
          const imagesDir = join(process.cwd(), 'public', 'images')

          const chunks: Buffer[] = []
          let received = 0
          let aborted = false
          req.on('data', (chunk: Buffer) => {
            if (aborted) return
            received += chunk.length
            if (received > MAX_IMAGE_SIZE) {
              aborted = true
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: 'Image too large (max 20MB)' }))
              req.destroy()
              return
            }
            chunks.push(chunk)
          })
          req.on('end', async () => {
            if (aborted) return
            try {
              if (!existsSync(imagesDir)) {
                await mkdir(imagesDir, { recursive: true })
              }
              const buffer = Buffer.concat(chunks)
              await writeFile(join(imagesDir, filename), buffer)
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ success: true, path: `/images/${filename}` }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: String(err) }))
            }
          })
        })
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy third-party dependencies into separate chunks
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@codemirror') || id.includes('@lezer') || id.includes('/codemirror/')) {
            return 'vendor-codemirror'
          }
          if (id.includes('highlight.js')) return 'vendor-highlight'
          if (id.includes('markdown-it') || id.includes('linkify') || id.includes('js-yaml')) {
            return 'vendor-markdown'
          }
          if (id.includes('mermaid')) return 'vendor-mermaid'
          return undefined
        },
      },
    },
  },
})
