import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Highlights the heading currently visible at the top of the preview pane.
 * Uses a capture-phase window listener so it survives the preview element
 * being recreated when switching view modes. Extracted from App.vue.
 */
export function useTocTracking(headings: Ref<Array<{ id: string; level: number }>>) {
  const activeHeadingId = ref('')
  let tocRafPending = false

  function updateActiveHeading() {
    const previewEl = document.querySelector('.preview-pane')
    if (!previewEl) {
      activeHeadingId.value = ''
      return
    }
    const containerTop = previewEl.getBoundingClientRect().top
    let current = ''
    for (const h of headings.value) {
      const el = document.getElementById(h.id)
      if (!el) continue
      if (el.getBoundingClientRect().top - containerTop <= 80) current = h.id
      else break
    }
    activeHeadingId.value = current
  }

  function handleScrollCapture(e: Event) {
    if (!(e.target instanceof Element) || !e.target.classList.contains('preview-pane')) return
    if (tocRafPending) return
    tocRafPending = true
    requestAnimationFrame(() => {
      tocRafPending = false
      updateActiveHeading()
    })
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScrollCapture, true)
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScrollCapture, true)
  })

  return { activeHeadingId, updateActiveHeading }
}
