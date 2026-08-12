import { computed, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { ViewMode } from './useEditor'

/**
 * Split-view drag handle. The editor pane width is a persisted percentage
 * (clamped to 20–80%). Extracted from App.vue.
 */
export function useSplitter(viewMode: Ref<ViewMode>) {
  // Split view ratio (percent of editor pane), persisted across sessions
  const splitRatio = useLocalStorage('md-editor-split-ratio', 50)
  let isDragging = false

  const editorAreaStyle = computed(() =>
    viewMode.value === 'split' ? { flex: `0 0 ${splitRatio.value}%` } : {},
  )
  const previewAreaStyle = computed(() =>
    viewMode.value === 'split' ? { flex: '1 1 0%' } : {},
  )

  function startDrag(e: MouseEvent) {
    isDragging = true
    e.preventDefault()

    const onMove = (moveEvent: MouseEvent) => {
      if (!isDragging) return
      const layout = document.querySelector('.editor-main') as HTMLElement
      if (!layout) return
      const rect = layout.getBoundingClientRect()
      const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100
      splitRatio.value = Math.min(80, Math.max(20, ratio))
    }

    const onUp = () => {
      isDragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { startDrag, editorAreaStyle, previewAreaStyle }
}
