import { createServer } from 'http'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createReadStream, statSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const IMAGES_DIR = join(DIST_DIR, 'images')
const PORT = process.env.PORT || 3000

const IMAGE_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function getImageTimestamp() {
  const now = new Date()
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3)
  )
}

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
  const ext = (req.headers['x-image-ext']) || 'png'
  const filename = `image-${getImageTimestamp()}.${ext}`
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', async () => {
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
})
