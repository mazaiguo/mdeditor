import { ref, watch, type Ref } from 'vue'
import { downloadBlob } from '../utils/download'

/**
 * File open / new / save logic + dirty-state tracking.
 * Extracted from App.vue. Content is owned by the editor; this composable
 * mutates it on open/new and reads it on save.
 *
 * Prefers the File System Access API (gives a writable handle for Ctrl+S);
 * falls back to a hidden <input type="file"> for open and a download for save.
 */
export function useFileManager(content: Ref<string>) {
  const activeFileName = ref('')
  const dirty = ref(false)
  const currentFileHandle = ref<FileSystemFileHandle | null>(null)
  const fileInputRef = ref<HTMLInputElement>()

  function setContentFromSource(text: string, filename: string, handle: FileSystemFileHandle | null) {
    content.value = text
    activeFileName.value = filename
    currentFileHandle.value = handle
    dirty.value = false
  }

  function handleFileOpen(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setContentFromSource((ev.target?.result as string) ?? '', file.name, null)
    }
    reader.readAsText(file, 'utf-8')
    if (fileInputRef.value) fileInputRef.value.value = ''
  }

  async function handleOpenFile() {
    const picker = (window as any).showOpenFilePicker
    if (typeof picker === 'function') {
      try {
        const [handle] = await picker({
          multiple: false,
          types: [
            { description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.txt'] } },
          ],
        })
        const file = await handle.getFile()
        setContentFromSource(await file.text(), file.name, handle)
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        // fall through to input fallback
      }
    }
    fileInputRef.value?.click()
  }

  function handleNewFile() {
    if (content.value.trim() && !confirm('Create new document? Unsaved changes will be lost.')) return
    setContentFromSource('# New Document\n\nStart writing here...\n', '', null)
  }

  async function saveCurrentFile() {
    const handle = currentFileHandle.value
    if (!handle) {
      // No writable handle: fall back to downloading the markdown
      const name = (activeFileName.value || 'document').replace(/\.[^.]+$/, '') + '.md'
      downloadBlob(content.value, name, 'text/markdown')
      return
    }
    try {
      const writable = await (handle as any).createWritable()
      await writable.write(content.value)
      await writable.close()
      dirty.value = false
    } catch (err) {
      console.error('Save failed:', err)
      alert('Save failed. Check file permissions.')
    }
  }

  // Edits mark the document dirty (saved state is reset on open/new/save).
  watch(content, () => {
    dirty.value = true
  })

  return {
    activeFileName,
    dirty,
    fileInputRef,
    setContentFromSource,
    handleFileOpen,
    handleOpenFile,
    handleNewFile,
    saveCurrentFile,
  }
}
