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
      @open-file="fileInputRef?.click()"
      @new-file="handleNewFile"
      @toggle-file-sidebar="showSidePanel = !showSidePanel"
      @picgo="showPicGo = true"
      @local-image="editorRef?.pickAndInsertLocalImage()"
    />

    <div class="editor-layout">
      <Transition name="toc-slide">
        <SidePanel
          v-if="showSidePanel"
          :active-file="activeFileName"
          :headings="headings"
          @file-content="handleFileContent"
          @new-file="handleNewFile"
        />
      </Transition>

      <div class="editor-main">
        <div v-if="viewMode !== 'preview'" class="editor-area">
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

        <div v-if="viewMode !== 'edit'" class="preview-area" :style="previewStyle">
          <MarkdownPreview
            :html="renderedHtml"
            :theme="theme"
            :font-size="fontSize"
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
        <span class="status-item">{{ lineCount }} lines</span>
        <span class="status-item">{{ wordCount }} words</span>
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
import { ref } from 'vue'
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
  toggleTheme,
  setViewMode,
  toolbarActions,
} = useEditor()

const editorRef = ref<InstanceType<typeof MarkdownEditor>>()
const fileInputRef = ref<HTMLInputElement>()
const showExport = ref(false)
const showSidePanel = ref(false)
const showPicGo = ref(false)
const activeFileName = ref('')
const splitRatio = ref(50)
let isDragging = false

const previewStyle = ref({})

function handleToolbarAction(action: string) {
  const fn = toolbarActions[action as keyof typeof toolbarActions]
  if (!fn) return
  const { before, after, placeholder } = fn()
  editorRef.value?.insertAtCursor(before, after, placeholder)
}

function handleInsert(before: string, after: string, placeholder: string) {
  editorRef.value?.insertAtCursor(before, after, placeholder)
}

function handleFileOpen(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    content.value = ev.target?.result as string ?? ''
  }
  reader.readAsText(file, 'utf-8')
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleNewFile() {
  if (content.value.trim() && !confirm('Create new document? Unsaved changes will be lost.')) return
  content.value = '# New Document\n\nStart writing here...\n'
  activeFileName.value = ''
}

function handleFileContent(fileContent: string, filename: string) {
  content.value = fileContent
  activeFileName.value = filename
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
