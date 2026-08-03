<template>
  <div class="app" :class="[`theme-${theme}`, `mode-${viewMode}`]">
    <input ref="fileInputRef" type="file" accept=".md,.txt,.markdown" style="display:none" @change="handleFileOpen" />

    <EditorToolbar
      :view-mode="viewMode"
      :theme="theme"
      :show-file-sidebar="showSidePanel"
      @action="handleToolbarAction"
      @set-mode="setViewMode"
      @toggle-toc="showSidePanel = !showSidePanel"
      @toggle-theme="toggleTheme"
      @export="showExport = true"
      @open-file="handleOpenFile"
      @open-folder="handleOpenFolder"
      @new-file="handleNewFile"
      @toggle-file-sidebar="showSidePanel = !showSidePanel"
      @picgo="showPicGo = true"
      @local-image="editorRef?.pickAndInsertLocalImage()"
    />

    <div class="editor-layout">
      <SidePanel
        v-show="showSidePanel"
        ref="sidePanelRef"
        :active-file="activeFileName"
        :headings="headings"
        :active-heading-id="activeHeadingId"
        @file-content="handleFileContent"
        @new-file="handleNewFile"
      />

      <div class="editor-main">
        <div v-if="viewMode !== 'preview'" class="editor-area" :style="editorAreaStyle">
          <MarkdownEditor
            ref="editorRef"
            v-model="content"
            :theme="theme"
            :font-size="fontSize"
            :word-wrap="wordWrap"
            @insert="handleInsert"
          />
        </div>

        <div v-if="viewMode === 'split'" class="splitter" @mousedown="startDrag" />

        <div v-if="viewMode !== 'edit'" class="preview-area" :style="previewAreaStyle">
          <MarkdownPreview
            :html="renderedHtml"
            :theme="theme"
            :font-size="fontSize"
            :auto-number="autoNumber"
            @replace-image="handleReplaceImage"
          />
        </div>
      </div>
    </div>

    <div class="statusbar">
      <div class="status-left">
        <span class="status-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Markdown
        </span>
        <span v-if="activeFileName" class="status-item">
          {{ dirty ? '● ' : '' }}{{ activeFileName }}
        </span>
        <span class="status-item">{{ lineCount }} lines</span>
        <span class="status-item">{{ wordCount }} words</span>
        <span v-if="storageQuotaExceeded" class="status-item status-warning" title="Content is too large for localStorage auto-save">
          Auto-save disabled (content too large)
        </span>
      </div>
      <div class="status-right">
        <button class="status-btn" @click="wordWrap = !wordWrap" :title="wordWrap ? 'Disable wrap' : 'Enable wrap'">
          Wrap: {{ wordWrap ? 'On' : 'Off' }}
        </button>
        <span class="status-item font-size-ctrl">
          <button class="status-btn" @click="fontSize = Math.max(11, fontSize - 1)">A-</button>
          <span>{{ fontSize }}px</span>
          <button class="status-btn" @click="fontSize = Math.min(24, fontSize + 1)">A+</button>
        </span>
      </div>
    </div>

    <ExportDialog
      :visible="showExport"
      :markdown="content"
      :html="renderedHtml"
      :theme="theme"
      @close="showExport = false"
    />

    <PicGoDialog
      :visible="showPicGo"
      @close="showPicGo = false"
      @insert="(md) => editorRef?.insertAtCursor(md, '', '')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import EditorToolbar from './components/EditorToolbar.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import ExportDialog from './components/ExportDialog.vue'
import SidePanel from './components/SidePanel.vue'
import PicGoDialog from './components/PicGoDialog.vue'
import { useEditor } from './composables/useEditor'

const {
  content,
  viewMode,
  theme,
  fontSize,
  wordWrap,
  wordCount,
  lineCount,
  renderedHtml,
  headings,
  autoNumber,
  storageQuotaExceeded,
  toggleTheme,
  setViewMode,
  toolbarActions,
} = useEditor()

const editorRef = ref<InstanceType<typeof MarkdownEditor>>()
const sidePanelRef = ref<InstanceType<typeof SidePanel>>()
const fileInputRef = ref<HTMLInputElement>()
const showExport = ref(false)
const showSidePanel = ref(false)
const showPicGo = ref(false)
const activeFileName = ref('')
const dirty = ref(false)
const currentFileHandle = ref<FileSystemFileHandle | null>(null)
const activeHeadingId = ref('')

// Split view ratio (percent of editor pane), persisted across sessions
const splitRatio = useLocalStorage('md-editor-split-ratio', 50)
let isDragging = false

const editorAreaStyle = computed(() =>
  viewMode.value === 'split' ? { flex: `0 0 ${splitRatio.value}%` } : {}
)
const previewAreaStyle = computed(() =>
  viewMode.value === 'split' ? { flex: '1 1 0%' } : {}
)

function handleToolbarAction(action: string) {
  const fn = toolbarActions[action as keyof typeof toolbarActions]
  if (!fn) return
  const { before, after, placeholder } = fn()
  editorRef.value?.insertAtCursor(before, after, placeholder)
}

function handleInsert(before: string, after: string, placeholder: string) {
  editorRef.value?.insertAtCursor(before, after, placeholder)
}

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

// Prefer the File System Access API (gives a writable handle for Ctrl+S),
// fall back to the hidden <input type="file"> when unavailable.
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

function handleOpenFolder() {
  showSidePanel.value = true
  sidePanelRef.value?.openFolder()
}

function handleFileContent(fileContent: string, filename: string, handle: FileSystemFileHandle | null) {
  setContentFromSource(fileContent, filename, handle)
}

async function saveCurrentFile() {
  const handle = currentFileHandle.value
  if (!handle) {
    // No writable handle: fall back to downloading the markdown
    const blob = new Blob([content.value], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (activeFileName.value || 'document').replace(/\.[^.]+$/, '') + '.md'
    a.click()
    URL.revokeObjectURL(url)
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

function handleReplaceImage(oldPath: string, newUrl: string) {
  // Replace all occurrences of the local path with the PicGo URL in the editor content
  // Handles both forward and backward slashes
  const normalized = oldPath.replace(/\\/g, '/')
  content.value = content.value
    .replace(new RegExp(escapeRegExp(oldPath), 'g'), newUrl)
    .replace(new RegExp(escapeRegExp(normalized), 'g'), newUrl)
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function handleGlobalKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return

  if (e.shiftKey && (e.key === 'O' || e.key === 'o' || e.code === 'KeyO')) {
    e.preventDefault()
    handleOpenFolder()
    return
  }
  if (e.key === 'o' || e.code === 'KeyO') {
    e.preventDefault()
    handleOpenFile()
    return
  }
  if (e.key === 'n' || e.code === 'KeyN') {
    e.preventDefault()
    handleNewFile()
    return
  }
  if (e.key === 's' || e.code === 'KeyS') {
    e.preventDefault()
    saveCurrentFile()
  }
}

// Track dirty state + window title
watch(content, () => {
  dirty.value = true
})
watch([dirty, activeFileName], ([isDirty, name]) => {
  document.title = (isDirty ? '● ' : '') + (name ? `${name} - ` : '') + 'MD Editor'
})

// TOC scroll tracking: highlight the heading currently visible at the top of
// the preview pane. Uses a capture-phase window listener so it survives the
// preview element being recreated when switching view modes.
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
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('scroll', handleScrollCapture, true)
  nextTick(updateActiveHeading)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('scroll', handleScrollCapture, true)
})

watch(renderedHtml, () => {
  nextTick(updateActiveHeading)
})

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
</script>
