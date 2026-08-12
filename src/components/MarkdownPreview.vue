<template>
  <div
    ref="previewRoot"
    class="preview-pane"
    :class="[`theme-${theme}`, { 'no-auto-number': !autoNumber }]"
    :style="{ fontSize: fontSize + 'px' }"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    v-html="html"
  />

  <!-- Image right-click context menu -->
  <ContextMenu
    :visible="ctxMenu.visible"
    :x="ctxMenu.x"
    :y="ctxMenu.y"
    menu-class="img-context-menu"
    overlay-class="ctx-menu-overlay"
    @close="closeCtxMenu"
  >
    <div class="ctx-menu-item" @click="uploadLocalImage">
      <Icon name="cloudUpload" :size="13" />
      Upload to PicGo
    </div>
    <div class="ctx-menu-item ctx-menu-copy" @click="copyImageUrl">
      <Icon name="copy" :size="13" />
      Copy path/URL
    </div>
  </ContextMenu>

  <Teleport to="body">
    <!-- Upload status toast -->
    <div v-if="uploading" class="img-upload-toast">
      <div class="paste-spinner" />
      Uploading to PicGo...
    </div>

    <!-- Image lightbox -->
    <div v-if="lightboxSrc" class="img-lightbox" @click="closeLightbox">
      <div class="lightbox-close">&times;</div>
      <img :src="lightboxSrc" alt="Preview" @click.stop />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick, ref, onUnmounted } from 'vue'
import Icon from './Icon.vue'
import ContextMenu from './ContextMenu.vue'
import { useMermaid } from '../composables/useMermaid'
import { useImageContextMenu } from '../composables/useImageContextMenu'

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

const { renderMermaid } = useMermaid()
const previewRoot = ref<HTMLElement>()
const lightboxSrc = ref('')

const { uploading, ctxMenu, handleContextMenu, closeCtxMenu, uploadLocalImage, copyImageUrl, onDocumentClick } =
  useImageContextMenu((oldPath, newUrl) => emit('replace-image', oldPath, newUrl))

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

watch(() => props.html, async () => {
  await nextTick()
  applyCollapsedState()
  await renderMermaid(previewRoot.value!)
})

onMounted(() => {
  nextTick(async () => {
    applyCollapsedState()
    await renderMermaid(previewRoot.value!)
  })
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>
