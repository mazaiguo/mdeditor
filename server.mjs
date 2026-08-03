import { createServer } from 'http'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join, extname, resolve, sep } from 'path'
import { fileURLToPath } from 'url'
import {
  IMAGE_MIME,
  MIME_TYPES,
  ALLOWED_IMAGE_EXTS,
  MAX_IMAGE_SIZE,
  getImageTimestamp,
} from './server-shared.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const IMAGES_DIR = join(DIST_DIR, 'images')
const PORT = process.env.PORT || 5080

// Optional security restriction: when IMAGE_ROOT is set, /api/local-image may
// only serve files inside this directory. Unset keeps backwards compatibility
// (any readable image path), which is convenient for local single-user usage.
const IMAGE_ROOT = process.env.IMAGE_ROOT ? resolve(process.env.IMAGE_ROOT) : ''

async function serveStatic(req, res, urlPath) {
  let filePath = join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath)
  try {
    const stat = statSync(filePath)
    if (stat.isDirectory()) filePath = join(filePath, 'index.html')
  } catch {
    filePath = join(DIST_DIR, 'index.html')
  }
  const ext = extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  } catch {
    const indexData = await readFile(join(DIST_DIR, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(indexData)
  }
}

async function handleSaveImage(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end('Method Not Allowed')
    return
  }
  const ext = String(req.headers['x-image-ext'] || 'png').toLowerCase()
  // Validate extension against the whitelist to prevent arbitrary file writes
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: `Extension not allowed: ${ext}` }))
    return
  }
  const filename = `image-${getImageTimestamp()}.${ext}`
  const chunks = []
  let received = 0
  let aborted = false
  req.on('data', chunk => {
    if (aborted) return
    received += chunk.length
    if (received > MAX_IMAGE_SIZE) {
      aborted = true
      res.writeHead(413, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Image too large (max 20MB)' }))
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', async () => {
    if (aborted) return
    try {
      if (!existsSync(IMAGES_DIR)) await mkdir(IMAGES_DIR, { recursive: true })
      await writeFile(join(IMAGES_DIR, filename), Buffer.concat(chunks))
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ success: true, path: `/images/${filename}` }))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(err) }))
    }
  })
}

function isInsideImageRoot(filePath) {
  if (!IMAGE_ROOT) return true
  const safe = resolve(filePath)
  return safe === IMAGE_ROOT || safe.startsWith(IMAGE_ROOT + sep)
}

async function handleLocalImage(req, res) {
  try {
    const url = new URL(req.url, `http://localhost`)
    const filePath = url.searchParams.get('path') ?? ''
    const ext = extname(filePath).slice(1).toLowerCase()
    if (!filePath || !IMAGE_MIME[ext]) {
      res.writeHead(400)
      res.end('Invalid path or extension')
      return
    }
    const normalized = filePath.replace(/\\/g, '/')
    if (!isInsideImageRoot(normalized)) {
      res.writeHead(403)
      res.end('Path outside IMAGE_ROOT')
      return
    }
    const safe = resolve(normalized)
    const data = await readFile(safe)
    res.writeHead(200, {
      'Content-Type': IMAGE_MIME[ext],
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Image not found')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`)
  const path = url.pathname

  if (path === '/api/save-image') return handleSaveImage(req, res)
  if (path === '/api/local-image') return handleLocalImage(req, res)

  await serveStatic(req, res, path)
})

server.listen(PORT, () => {
  console.log(`MD Editor server running at http://0.0.0.0:${PORT}`)
  if (IMAGE_ROOT) console.log(`Local images restricted to: ${IMAGE_ROOT}`)
})
