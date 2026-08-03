/**
 * Shared PicGo upload client.
 * PicGo's HTTP API differs between versions, so binary uploads are retried
 * with two form field names ('files' then 'list[]').
 */

async function postForm(serverUrl: string, formData: FormData): Promise<{ success: boolean; result?: string[]; message?: string }> {
  const res = await fetch(`${serverUrl}/upload`, { method: 'POST', body: formData })
  return res.json()
}

/** Upload one or more image files (binary). Returns CDN URLs or null on failure. */
export async function uploadFilesToPicGo(serverUrl: string, files: File[]): Promise<string[] | null> {
  const base = serverUrl.replace(/\/$/, '')
  const fieldNames = ['files', 'list[]']
  for (const fieldName of fieldNames) {
    try {
      const formData = new FormData()
      files.forEach(f => formData.append(fieldName, f, f.name || 'image.png'))
      const data = await postForm(base, formData)
      if (data.success && data.result?.length) return data.result
    } catch {
      // try next field name
    }
  }
  return null
}

/** Upload a single image file. Returns the CDN URL or null on failure. */
export async function uploadFileToPicGo(serverUrl: string, file: File): Promise<string | null> {
  const urls = await uploadFilesToPicGo(serverUrl, [file])
  return urls?.[0] ?? null
}

/** Upload by local filesystem path (requires PicGo running with local file access). */
export async function uploadPathToPicGo(serverUrl: string, filePath: string): Promise<string | null> {
  try {
    const base = serverUrl.replace(/\/$/, '')
    const res = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: [filePath] }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.success && data.result?.length) return data.result[0] as string
    throw new Error(data.message || 'No URL returned')
  } catch (err) {
    console.error('PicGo path upload failed:', err)
    return null
  }
}
