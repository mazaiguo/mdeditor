import { useLocalStorage } from '@vueuse/core'

/** Default PicGo server endpoint (PicGo's built-in HTTP port). */
export const PICGO_DEFAULT_URL = 'http://127.0.0.1:36677'

/**
 * Shared PicGo server URL, persisted to localStorage.
 * Previously duplicated across MarkdownEditor, MarkdownPreview and PicGoDialog.
 */
export function usePicgoServer() {
  return useLocalStorage('picgo-server-url', PICGO_DEFAULT_URL)
}
