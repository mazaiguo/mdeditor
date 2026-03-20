<template>
  <div
    class="preview-pane"
    :class="`theme-${theme}`"
    :style="{ fontSize: fontSize + 'px' }"
    v-html="html"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
  />

  <!-- Image right-click context menu -->
  <Teleport to="body">
    <div
      v-if="ctxMenu.visible"
      class="img-context-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @click.stop
    >
      <div class="ctx-menu-item" @click="uploadLocalImage">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 16 12 12 8 16"/>
          <line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
        Upload to PicGo
      </div>
      <div class="ctx-menu-item ctx-menu-copy" @click="copyImageUrl">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy path/URL
      </div>
    </div>
    <div v-if="ctxMenu.visible" class="ctx-menu-overlay" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu" />

    <!-- Upload status toast -->
    <div v-if="uploading" class="img-upload-toast">
      <div class="paste-spinner" />
      Uploading to PicGo...
    </div>

    <!-- Image lightbox -->
    <div v-if="lightboxSrc" class="img-lightbox" @click="closeLightbox">
      <div class="lightbox-close">&times;</div>
      <img :src="lightboxSrc" @click.stop alt="Preview" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, reactive, ref, onUnmounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

const props = defineProps<{
  html: string
  theme: 'light' | 'dark'
  fontSize: number
}>()

const emit = defineEmits<{
  'replace-image': [oldPath: string, newUrl: string]
}>()

const picgoServerUrl = useLocalStorage('picgo-server-url', 'http://127.0.0.1:36677')
const uploading = ref(false)

const ctxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  imgSrc: '',   // actual src in DOM (may be /api/local-image?path=...)
  localPath: '' // decoded original local path if applicable
})

const lightboxSrc = ref('')

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    e.preventDefault()
    lightboxSrc.value = (target as HTMLImageElement).src
    return
  }
  if (target.tagName === 'A') {
    const href = (target as HTMLAnchorElement).href
    if (href && !href.startsWith('#')) {
      e.preventDefault()
      window.open(href, '_blank')
    }
  }
}

function closeLightbox() {
  lightboxSrc.value = ''
}

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
    const base = picgoServerUrl.value.replace(/\/$/, '')
    const res = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: [ctxMenu.localPath] }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.success && data.result?.length) {
      const newUrl = data.result[0] as string
      emit('replace-image', ctxMenu.localPath, newUrl)
    } else {
      console.error('PicGo upload failed:', data.message)
    }
  } catch (err) {
    console.error('PicGo upload error:', err)
  } finally {
    uploading.value = false
  }
}

function copyImageUrl() {
  const text = ctxMenu.localPath || ctxMenu.imgSrc
  navigator.clipboard.writeText(text).catch(() => {})
  closeCtxMenu()
}

function initCodeBlocks() {
  const previewEl = document.querySelector('.preview-pane')
  if (!previewEl) return

  // Initialize copy buttons
  previewEl.querySelectorAll('.copy-btn').forEach((btn) => {
    const newBtn = btn.cloneNode(true) as HTMLElement
    btn.replaceWith(newBtn)
    newBtn.addEventListener('click', () => {
      const wrapper = newBtn.closest('.code-block-wrapper')
      const code = wrapper?.querySelector('code')
      if (code) {
        const text = Array.from(code.querySelectorAll('.code-line'))
          .map(el => el.textContent ?? '')
          .join('\n')
        navigator.clipboard.writeText(text).then(() => {
          const original = newBtn.innerHTML
          newBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
          newBtn.classList.add('copied')
          setTimeout(() => {
            newBtn.innerHTML = original
            newBtn.classList.remove('copied')
          }, 2000)
        })
      }
    })
  })

  // Initialize collapse buttons
  previewEl.querySelectorAll('.collapse-btn').forEach((btn) => {
    const newBtn = btn.cloneNode(true) as HTMLElement
    btn.replaceWith(newBtn)
    newBtn.addEventListener('click', () => {
      const wrapper = newBtn.closest('.code-block-wrapper') as HTMLElement
      if (!wrapper) return
      const body = wrapper.querySelector('.code-block-body') as HTMLElement
      const header = wrapper.querySelector('.code-block-header') as HTMLElement
      const isCollapsed = wrapper.classList.toggle('collapsed')

      if (isCollapsed) {
        const headerH = header ? header.getBoundingClientRect().height : 32
        wrapper.style.maxHeight = `${Math.ceil(headerH)}px`
        wrapper.style.height = `${Math.ceil(headerH)}px`
        if (body) body.style.display = 'none'
      } else {
        wrapper.style.maxHeight = ''
        wrapper.style.height = ''
        if (body) body.style.display = ''
      }
      newBtn.title = isCollapsed ? 'Expand' : 'Collapse/Expand'
    })
  })

  // Auto-collapse blocks marked with data-collapsed="true"
  previewEl.querySelectorAll<HTMLElement>('.code-block-wrapper[data-collapsed="true"]').forEach((wrapper) => {
    const body = wrapper.querySelector('.code-block-body') as HTMLElement
    const header = wrapper.querySelector('.code-block-header') as HTMLElement
    const btn = wrapper.querySelector('.collapse-btn') as HTMLElement
    wrapper.classList.add('collapsed')
    const headerH = header ? header.getBoundingClientRect().height : 32
    wrapper.style.maxHeight = `${Math.ceil(headerH)}px`
    wrapper.style.height = `${Math.ceil(headerH)}px`
    if (body) body.style.display = 'none'
    if (btn) btn.title = 'Expand'
  })
}

function onDocumentClick() {
  if (ctxMenu.visible) closeCtxMenu()
}

async function renderMermaid() {
  const previewEl = document.querySelector('.preview-pane')
  if (!previewEl) return
  const nodes = previewEl.querySelectorAll<HTMLElement>('.mermaid')
  if (!nodes.length) return
  try {
    await mermaid.run({ nodes: Array.from(nodes) })
  } catch (e) {
    console.warn('Mermaid render error:', e)
  }
}

watch(() => props.html, async () => {
  await nextTick()
  initCodeBlocks()
  await renderMermaid()
})

onMounted(() => {
  nextTick(async () => {
    initCodeBlocks()
    await renderMermaid()
  })
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
