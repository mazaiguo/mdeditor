<template>
  <div class="app" :class="[`theme-${theme}`, `mode-${viewMode}`]">
    <input ref="fileInputRef" type="file" accept=".md,.txt,.markdown" style="display:none" @change="handleFileOpen" />

    <EditorToolbar
      :view-mode="viewMode"
      :theme="theme"
      :show-file-sidebar="showSidePanel"
      @action="handleToolbarAction"
      @set-mode="setViewMode"
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
        @file-content="setContentFromSource"
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

    <StatusBar
      v-model:word-wrap="wordWrap"
      v-model:font-size="fontSize"
      :active-file-name="activeFileName"
      :dirty="dirty"
      :line-count="lineCount"
      :word-count="wordCount"
      :storage-quota-exceeded="storageQuotaExceeded"
    />

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
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import EditorToolbar from './components/EditorToolbar.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import ExportDialog from './components/ExportDialog.vue'
import SidePanel from './components/SidePanel.vue'
import PicGoDialog from './components/PicGoDialog.vue'
import StatusBar from './components/StatusBar.vue'
import { useEditor } from './composables/useEditor'
import { useFileManager } from './composables/useFileManager'
import { useTocTracking } from './composables/useTocTracking'
import { useSplitter } from './composables/useSplitter'
import { escapeRegExp } from './utils/escape'

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
const showExport = ref(false)
const showSidePanel = ref(false)
const showPicGo = ref(false)

const {
  activeFileName,
  dirty,
  fileInputRef,
  setContentFromSource,
  handleFileOpen,
  handleOpenFile,
  handleNewFile,
  saveCurrentFile,
} = useFileManager(content)

const { activeHeadingId, updateActiveHeading } = useTocTracking(headings)
const { startDrag, editorAreaStyle, previewAreaStyle } = useSplitter(viewMode)

function handleToolbarAction(action: string) {
  const fn = toolbarActions[action as keyof typeof toolbarActions]
  if (!fn) return
  const { before, after, placeholder } = fn()
  editorRef.value?.insertAtCursor(before, after, placeholder)
}

function handleOpenFolder() {
  showSidePanel.value = true
  sidePanelRef.value?.openFolder()
}

function handleReplaceImage(oldPath: string, newUrl: string) {
  // Replace all occurrences of the local path with the PicGo URL in the
  // editor content, handling both forward and backward slashes.
  const normalized = oldPath.replace(/\\/g, '/')
  content.value = content.value
    .replace(new RegExp(escapeRegExp(oldPath), 'g'), newUrl)
    .replace(new RegExp(escapeRegExp(normalized), 'g'), newUrl)
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

// Window title reflects dirty state + active filename.
watch([dirty, activeFileName], ([isDirty, name]) => {
  document.title = (isDirty ? '● ' : '') + (name ? `${name} - ` : '') + 'MD Editor'
})

// Re-evaluate the active TOC heading after the preview re-renders.
watch(renderedHtml, () => {
  nextTick(updateActiveHeading)
})

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  nextTick(updateActiveHeading)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>
