// Shared server-side helpers used by both server.mjs and the Vite dev plugin
// (see vite.config.ts). Keep this file dependency-free plain ESM.

export const IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
}

// Whitelist of extensions accepted by POST /api/save-image.
// SVG/HTML are intentionally excluded: served directly they can execute scripts.
export const ALLOWED_IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

// Max accepted upload size for /api/save-image (20 MB)
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024

export const MIME_TYPES = {
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

export function getImageTimestamp() {
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
