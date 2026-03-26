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

      <div v-if="!folderName && flatNodes.length === 0" class="side-empty">
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
        <div v-if="flatNodes.length === 0" class="side-empty-sm">No .md files found</div>
        <ul class="file-list">
          <template v-for="node in visibleNodes" :key="node.path">
            <li v-if="node.kind === 'directory'"
              class="tree-folder-label"
              :style="{ paddingLeft: (10 + node.depth * 14) + 'px' }"
              @click="toggleFolder(node.path)"
            >
              <svg class="tree-chevron" :class="{ expanded: expandedDirs.has(node.path) }" xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="tree-folder-icon">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <span class="tree-name">{{ node.name }}</span>
            </li>
            <li v-else
              class="file-item"
              :class="{ active: node.name === activeFile }"
              :style="{ paddingLeft: (10 + node.depth * 14) + 'px' }"
              @click="selectFileNode(node)"
              @contextmenu.prevent.stop="showFileCtxMenuNode(node, $event)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span class="file-name">{{ node.name }}</span>
            </li>
          </template>
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
import { ref, reactive, computed } from 'vue'

interface FileNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  depth: number
  parentPath: string
  handle?: FileSystemFileHandle
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
const flatNodes = ref<FileNode[]>([])
const folderName = ref('')
const expandedDirs = ref(new Set<string>())

const fileCtxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null as FileNode | null,
})

function isMdFile(name: string): boolean {
  return /\.(md|markdown|txt)$/i.test(name)
}

async function scanDirectory(dirHandle: FileSystemDirectoryHandle, parentPath: string, depth: number): Promise<FileNode[]> {
  const result: FileNode[] = []
  const entries: { name: string; handle: FileSystemHandle }[] = []

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.') || name === 'node_modules') continue
    entries.push({ name, handle })
  }

  const dirEntries = entries.filter(e => e.handle.kind === 'directory').sort((a, b) => a.name.localeCompare(b.name))
  const fileEntries = entries.filter(e => e.handle.kind === 'file' && isMdFile(e.name)).sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of dirEntries) {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name
    const children = await scanDirectory(entry.handle as FileSystemDirectoryHandle, path, depth + 1)
    if (children.length > 0) {
      result.push({ name: entry.name, path, kind: 'directory', depth, parentPath })
      result.push(...children)
    }
  }

  for (const entry of fileEntries) {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name
    result.push({ name: entry.name, path, kind: 'file', depth, parentPath, handle: entry.handle as FileSystemFileHandle })
  }

  return result
}

const visibleNodes = computed(() => {
  const result: FileNode[] = []
  for (const node of flatNodes.value) {
    if (node.depth === 0) {
      result.push(node)
      continue
    }
    const parts = node.parentPath.split('/')
    let checkPath = ''
    let visible = true
    for (const part of parts) {
      checkPath = checkPath ? `${checkPath}/${part}` : part
      if (!expandedDirs.value.has(checkPath)) {
        visible = false
        break
      }
    }
    if (visible) result.push(node)
  }
  return result
})

function toggleFolder(path: string) {
  if (expandedDirs.value.has(path)) {
    expandedDirs.value.delete(path)
  } else {
    expandedDirs.value.add(path)
  }
  expandedDirs.value = new Set(expandedDirs.value)
}

async function openFolder() {
  try {
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
    folderName.value = dirHandle.name
    expandedDirs.value = new Set()
    flatNodes.value = await scanDirectory(dirHandle, '', 0)
  } catch (err: any) {
    if (err.name !== 'AbortError') console.error('Failed to open folder:', err)
  }
}

async function selectFileNode(node: FileNode) {
  if (!node.handle) return
  try {
    const f = await node.handle.getFile()
    const content = await f.text()
    emit('fileContent', content, node.name)
  } catch (err) {
    console.error('Failed to read file:', err)
  }
}

function showFileCtxMenuNode(node: FileNode, e: MouseEvent) {
  fileCtxMenu.node = node
  fileCtxMenu.x = e.clientX
  fileCtxMenu.y = e.clientY
  fileCtxMenu.visible = true
}

function closeCtxMenu() {
  fileCtxMenu.visible = false
}

function copyFileName() {
  if (!fileCtxMenu.node) return
  navigator.clipboard.writeText(fileCtxMenu.node.name)
  closeCtxMenu()
}

function copyFilePath() {
  if (!fileCtxMenu.node) return
  const path = folderName.value
    ? `${folderName.value}/${fileCtxMenu.node.path}`
    : fileCtxMenu.node.path
  navigator.clipboard.writeText(path)
  closeCtxMenu()
}

async function openFileFromMenu() {
  if (!fileCtxMenu.node) return
  await selectFileNode(fileCtxMenu.node)
  closeCtxMenu()
}

function scrollToHeading(id: string) {
  const previewEl = document.querySelector('.preview-pane')
  if (!previewEl) return
  const target = previewEl.querySelector(`[id="${id}"]`)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ openFolder })
</script>
