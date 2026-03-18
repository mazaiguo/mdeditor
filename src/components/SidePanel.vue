<template>
  <div class="side-panel" @click="closeCtxMenu">
    <!-- File context menu -->
    <Teleport to="body">
      <div
        v-if="fileCtxMenu.visible"
        class="file-ctx-menu"
        :style="{ left: fileCtxMenu.x + 'px', top: fileCtxMenu.y + 'px' }"
        @click.stop
      >
        <div class="file-ctx-item" @click="copyFileName">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          复制文件名
        </div>
        <div class="file-ctx-item" @click="copyFilePath">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          复制路径
        </div>
        <div class="file-ctx-item" @click="openFileFromMenu">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          打开文件
        </div>
      </div>
      <div v-if="fileCtxMenu.visible" class="file-ctx-overlay" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu" />
    </Teleport>
    <div class="side-panel-tabs">
      <button
        class="side-tab"
        :class="{ active: activeTab === 'files' }"
        @click="activeTab = 'files'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        Files
      </button>
      <button
        class="side-tab"
        :class="{ active: activeTab === 'toc' }"
        @click="activeTab = 'toc'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="15" y2="18"/>
        </svg>
        Contents
      </button>
    </div>

    <!-- Files Tab -->
    <div v-if="activeTab === 'files'" class="side-panel-body">
      <div class="tab-header-actions">
        <button class="file-action-btn" title="Open Folder" @click="openFolder">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Open Folder
        </button>
        <button class="file-action-btn icon-only" title="New File" @click="$emit('newFile')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div v-if="!folderName && files.length === 0" class="side-empty">
        <div class="side-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p>Open a folder to browse .md files</p>
      </div>

      <template v-else>
        <div v-if="folderName" class="folder-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
          {{ folderName }}
        </div>
        <div v-if="files.length === 0" class="side-empty-sm">No .md files found</div>
        <ul class="file-list">
          <li
            v-for="file in files"
            :key="file.name"
            class="file-item"
            :class="{ active: file.name === activeFile }"
            @click="selectFile(file)"
            @contextmenu.prevent.stop="showFileCtxMenu(file, $event)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span class="file-name">{{ file.name }}</span>
          </li>
        </ul>
      </template>
    </div>

    <!-- Contents (TOC) Tab -->
    <div v-else class="side-panel-body">
      <div v-if="headings.length === 0" class="side-empty">
        <p>No headings found</p>
      </div>
      <ul v-else class="toc-list">
        <li
          v-for="(heading, idx) in headings"
          :key="idx"
          class="toc-item"
          :class="`toc-level-${heading.level}`"
          @click="scrollToHeading(heading.id)"
        >
          <span class="toc-item-text">{{ heading.text }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

interface MdFile {
  name: string
  handle: FileSystemFileHandle
}

defineProps<{
  activeFile?: string
  headings: Array<{ level: number; text: string; id: string }>
}>()

const emit = defineEmits<{
  fileContent: [content: string, filename: string]
  newFile: []
}>()

const activeTab = ref<'files' | 'toc'>('files')
const files = ref<MdFile[]>([])
const folderName = ref('')

const fileCtxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  file: null as MdFile | null,
})

async function openFolder() {
  try {
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
    folderName.value = dirHandle.name
    files.value = []
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && /\.(md|markdown|txt)$/i.test(name)) {
        files.value.push({ name, handle: handle as FileSystemFileHandle })
      }
    }
    files.value.sort((a, b) => a.name.localeCompare(b.name))
  } catch (err: any) {
    if (err.name !== 'AbortError') console.error('Failed to open folder:', err)
  }
}

async function selectFile(file: MdFile) {
  try {
    const f = await file.handle.getFile()
    const content = await f.text()
    emit('fileContent', content, file.name)
  } catch (err) {
    console.error('Failed to read file:', err)
  }
}

function showFileCtxMenu(file: MdFile, e: MouseEvent) {
  fileCtxMenu.file = file
  fileCtxMenu.x = e.clientX
  fileCtxMenu.y = e.clientY
  fileCtxMenu.visible = true
}

function closeCtxMenu() {
  fileCtxMenu.visible = false
}

function copyFileName() {
  if (!fileCtxMenu.file) return
  navigator.clipboard.writeText(fileCtxMenu.file.name)
  closeCtxMenu()
}

function copyFilePath() {
  if (!fileCtxMenu.file) return
  const path = folderName.value
    ? `${folderName.value}/${fileCtxMenu.file.name}`
    : fileCtxMenu.file.name
  navigator.clipboard.writeText(path)
  closeCtxMenu()
}

async function openFileFromMenu() {
  if (!fileCtxMenu.file) return
  await selectFile(fileCtxMenu.file)
  closeCtxMenu()
}

function scrollToHeading(id: string) {
  const previewEl = document.querySelector('.preview-pane')
  if (!previewEl) return
  const target = previewEl.querySelector(`[id="${id}"]`)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
