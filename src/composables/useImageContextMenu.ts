import { ref, reactive } from 'vue'
import { uploadPathToPicGo } from '../utils/picgo'
import { usePicgoServer } from './usePicgo'

/**
 * Right-click menu on preview images: "Upload to PicGo" / "Copy path/URL".
 * Owns the menu position/state, the upload spinner, and clipboard copy.
 * Extracted from MarkdownPreview so the component focuses on rendering.
 *
 * @param onReplace called with (localPath, newUrl) after a successful upload.
 */
export function useImageContextMenu(onReplace: (oldPath: string, newUrl: string) => void) {
  const picgoServerUrl = usePicgoServer()
  const uploading = ref(false)

  const ctxMenu = reactive({
    visible: false,
    x: 0,
    y: 0,
    imgSrc: '',   // actual src in DOM (may be /api/local-image?path=...)
    localPath: '' // decoded original local path if applicable
  })

  function handleContextMenu(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') {
      closeCtxMenu()
      return
    }

    const img = target as HTMLImageElement
    const src = img.getAttribute('src') || img.src

    // Extract local path if using the proxy endpoint
    let localPath = ''
    if (src.includes('/api/local-image?path=')) {
      try {
        const url = new URL(src, window.location.origin)
        localPath = decodeURIComponent(url.searchParams.get('path') || '')
      } catch {
        localPath = ''
      }
    }

    ctxMenu.visible = true
    ctxMenu.x = e.clientX
    ctxMenu.y = e.clientY
    ctxMenu.imgSrc = src
    ctxMenu.localPath = localPath
  }

  function closeCtxMenu() {
    ctxMenu.visible = false
  }

  async function uploadLocalImage() {
    closeCtxMenu()
    if (!ctxMenu.localPath) return

    uploading.value = true
    try {
      const newUrl = await uploadPathToPicGo(picgoServerUrl.value, ctxMenu.localPath)
      if (newUrl) {
        onReplace(ctxMenu.localPath, newUrl)
      } else {
        console.error('PicGo upload failed')
      }
    } finally {
      uploading.value = false
    }
  }

  function copyImageUrl() {
    const text = ctxMenu.localPath || ctxMenu.imgSrc
    navigator.clipboard.writeText(text).catch(() => {})
    closeCtxMenu()
  }

  /** Call from a document-level click listener to dismiss on outside click. */
  function onDocumentClick() {
    if (ctxMenu.visible) closeCtxMenu()
  }

  return { uploading, ctxMenu, handleContextMenu, closeCtxMenu, uploadLocalImage, copyImageUrl, onDocumentClick }
}
