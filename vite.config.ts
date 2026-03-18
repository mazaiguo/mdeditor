import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'

function getImageTimestamp(): string {
  const now = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3)
  )
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'local-image-server',
      configureServer(server) {
        const IMAGE_MIME: Record<string, string> = {
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
        }

        // Serve local file paths (for preview of local images)
        server.middlewares.use('/api/local-image', async (req, res) => {
          try {
            const url = new URL(req.url!, 'http://localhost')
            const filePath = url.searchParams.get('path') ?? ''
            const ext = extname(filePath).slice(1).toLowerCase()
            if (!filePath || !IMAGE_MIME[ext]) {
              res.statusCode = 400
              res.end('Invalid path or extension')
              return
            }
            // Normalize Windows-style backslashes
            const normalized = filePath.replace(/\\/g, '/')
            const data = await readFile(normalized)
            res.setHeader('Content-Type', IMAGE_MIME[ext])
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

          const ext = (req.headers['x-image-ext'] as string) || 'png'
          const filename = `image-${getImageTimestamp()}.${ext}`
          const imagesDir = join(process.cwd(), 'public', 'images')

          const chunks: Buffer[] = []
          req.on('data', (chunk: Buffer) => chunks.push(chunk))
          req.on('end', async () => {
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
})
