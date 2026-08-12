/**
 * Trigger a browser download of `content` as a Blob of the given MIME `type`.
 * Used by the export pipeline and the Ctrl+S "save without a file handle" fallback.
 */
export function downloadBlob(content: string | ArrayBuffer, name: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
