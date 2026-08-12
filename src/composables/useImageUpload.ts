import { ref } from 'vue'
import { uploadFileToPicGo, uploadPathToPicGo } from '../utils/picgo'
import { getImageTimestamp, fileToDataUrl } from '../utils/image'
import { usePicgoServer } from './usePicgo'

// Local Windows/Mac image path pattern: ![alt](C:\...\file.ext) or ![alt](/home/...ext)
const LOCAL_IMG_RE = /!\[([^\]]*)\]\(([a-zA-Z]:[^)]+\.(?:png|jpe?g|gif|webp|bmp|svg)|\/(?:[^)]+)\.(?:png|jpe?g|gif|webp|bmp|svg))\)/gi

/**
 * Image paste / pick-and-insert / local-path replacement.
 *
 * Upload order for a binary image: PicGo → local dev-server → base64 data URL,
 * so the preview always works even with no PicGo running. Extracted from
 * MarkdownEditor so the component is just the CodeMirror host.
 *
 * @param insertRaw callback that inserts text at the editor cursor.
 */
export function useImageUpload(insertRaw: (text: string) => void) {
  const picgoServerUrl = usePicgoServer()
  const isUploadingImage = ref(false)

  async function saveImageLocally(file: File): Promise<string | null> {
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    try {
      const res = await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'X-Image-Ext': ext },
        body: file,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success) return data.path as string
      throw new Error('Save failed')
    } catch (err) {
      console.error('Local image save failed:', err)
      return null
    }
  }

  async function replaceLocalImgPaths(text: string): Promise<{ result: string; replaced: boolean }> {
    const matches = [...text.matchAll(LOCAL_IMG_RE)]
    if (!matches.length) return { result: text, replaced: false }

    let result = text
    for (const match of matches) {
      const [fullMatch, altText, localPath] = match
      const url = await uploadPathToPicGo(picgoServerUrl.value, localPath)
      if (url) {
        result = result.replace(fullMatch, `![${altText || `image-${getImageTimestamp()}`}](${url})`)
      }
    }
    return { result, replaced: result !== text }
  }

  function handlePasteImage(e: ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    // Check for binary image first (screenshot / copied image)
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        isUploadingImage.value = true
        uploadFileToPicGo(picgoServerUrl.value, file).then(async (url) => {
          if (url) {
            isUploadingImage.value = false
            insertRaw(`![image-${getImageTimestamp()}](${url})`)
            return
          }
          // Fallback 1: save to local server
          const localPath = await saveImageLocally(file)
          if (localPath) {
            isUploadingImage.value = false
            insertRaw(`![image-${getImageTimestamp()}](${localPath})`)
            return
          }
          // Fallback 2: embed as base64 so the preview always works
          const dataUrl = await fileToDataUrl(file)
          isUploadingImage.value = false
          insertRaw(`![image-${getImageTimestamp()}](${dataUrl})`)
        })
        return
      }
    }

    // Check for pasted text containing local image paths (e.g. from Typora)
    const plainText = e.clipboardData?.getData('text/plain') ?? ''
    LOCAL_IMG_RE.lastIndex = 0
    if (plainText && LOCAL_IMG_RE.test(plainText)) {
      e.preventDefault()
      LOCAL_IMG_RE.lastIndex = 0
      isUploadingImage.value = true
      replaceLocalImgPaths(plainText).then(({ result }) => {
        isUploadingImage.value = false
        insertRaw(result)
      })
    }
  }

  async function pickAndInsertLocalImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const alt = file.name.replace(/\.[^.]+$/, '')
      isUploadingImage.value = true

      // Try PicGo first
      const url = await uploadFileToPicGo(picgoServerUrl.value, file)
      if (url) {
        isUploadingImage.value = false
        insertRaw(`![${alt}](${url})`)
        return
      }
      // Try local server save
      const localPath = await saveImageLocally(file)
      if (localPath) {
        isUploadingImage.value = false
        insertRaw(`![${alt}](${localPath})`)
        return
      }
      // Final fallback: base64 embed
      const dataUrl = await fileToDataUrl(file)
      isUploadingImage.value = false
      insertRaw(`![${alt}](${dataUrl})`)
    }
    input.click()
  }

  return { isUploadingImage, handlePasteImage, pickAndInsertLocalImage }
}
