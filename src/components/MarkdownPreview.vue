<template>
  <div
    ref="previewRoot"
    class="preview-pane"
    :class="[`theme-${theme}`, { 'no-auto-number': !autoNumber }]"
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
import type Mermaid from 'mermaid'
import { uploadPathToPicGo } from '../utils/picgo'

const props = withDefaults(defineProps<{
  html: string
  theme: 'light' | 'dark'
  fontSize: number
  autoNumber?: boolean
}>(), {
  autoNumber: true,
})

const emit = defineEmits<{
  'replace-image': [oldPath: string, newUrl: string]
}>()

const picgoServerUrl = useLocalStorage('picgo-server-url', 'http://127.0.0.1:36677')
const uploading = ref(false)
const previewRoot = ref<HTMLElement>()

const ctxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  imgSrc: '',   // actual src in DOM (may be /api/local-image?path=...)
  localPath: '' // decoded original local path if applicable
})

const lightboxSrc = ref('')

/* ── Mermaid: lazy-load the ~2MB bundle only when a diagram is present ── */

let mermaidInstance: typeof Mermaid | null = null
let mermaidLoading: Promise<typeof Mermaid> | null = null

async function getMermaid(): Promise<typeof Mermaid> {
  if (mermaidInstance) return mermaidInstance
  if (!mermaidLoading) {
    mermaidLoading = import('mermaid').then(({ default: m }) => {
      m.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' })
      mermaidInstance = m
      return m
    })
  }
  return mermaidLoading
}

// Cache rendered SVGs by diagram source so unchanged diagrams are not
// re-rendered on every keystroke.
const mermaidSvgCache = new Map<string, string>()

async function renderMermaid() {
  const previewEl = previewRoot.value
  if (!previewEl) return
  const nodes = Array.from(previewEl.querySelectorAll<HTMLElement>('.mermaid:not([data-rendered])'))
  if (!nodes.length) return

  const pending: HTMLElement[] = []
  for (const node of nodes) {
    const source = node.textContent ?? ''
    const cached = mermaidSvgCache.get(source)
    if (cached) {
      node.innerHTML = cached
      node.setAttribute('data-rendered', 'true')
    } else {
      node.setAttribute('data-mermaid-source', source)
      pending.push(node)
    }
  }
  if (!pending.length) return

  try {
    const m = await getMermaid()
    await m.run({ nodes: pending })
    for (const node of pending) {
      const source = node.getAttribute('data-mermaid-source') ?? ''
      mermaidSvgCache.set(source, node.innerHTML)
      node.removeAttribute('data-mermaid-source')
      node.setAttribute('data-rendered', 'true')
    }
  } catch (e) {
    console.warn('Mermaid render error:', e)
  }
}

/* ── Click handling (single delegated listener, survives v-html re-renders) ── */

function handleCopyCode(btn: HTMLElement) {
  const wrapper = btn.closest('.code-block-wrapper')
  const code = wrapper?.querySelector('code')
  if (!code) return
  const text = Array.from(code.querySelectorAll('.code-line'))
    .map(el => el.textContent ?? '')
    .join('\n')
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.innerHTML
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    btn.classList.add('copied')
    setTimeout(() => {
      btn.innerHTML = original
      btn.classList.remove('copied')
    }, 2000)
  })
}

function handleCollapse(btn: HTMLElement) {
  const wrapper = btn.closest('.code-block-wrapper') as HTMLElement
  if (!wrapper) return
  const isCollapsed = wrapper.classList.toggle('collapsed')
  btn.title = isCollapsed ? 'Expand' : 'Collapse/Expand'
}

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement

  const copyBtn = target.closest('.copy-btn') as HTMLElement | null
  if (copyBtn) {
    handleCopyCode(copyBtn)
    return
  }
  const collapseBtn = target.closest('.collapse-btn') as HTMLElement | null
  if (collapseBtn) {
    handleCollapse(collapseBtn)
    return
  }

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
    const newUrl = await uploadPathToPicGo(picgoServerUrl.value, ctxMenu.localPath)
    if (newUrl) {
      emit('replace-image', ctxMenu.localPath, newUrl)
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

/* ── Post-render state: auto-collapse blocks marked with data-collapsed ── */

function applyCollapsedState() {
  const previewEl = previewRoot.value
  if (!previewEl) return
  previewEl.querySelectorAll<HTMLElement>('.code-block-wrapper[data-collapsed="true"]').forEach((wrapper) => {
    wrapper.classList.add('collapsed')
    const btn = wrapper.querySelector('.collapse-btn') as HTMLElement | null
    if (btn) btn.title = 'Expand'
  })
}

function onDocumentClick() {
  if (ctxMenu.visible) closeCtxMenu()
}

watch(() => props.html, async () => {
  await nextTick()
  applyCollapsedState()
  await renderMermaid()
})

onMounted(() => {
  nextTick(async () => {
    applyCollapsedState()
    await renderMermaid()
  })
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
