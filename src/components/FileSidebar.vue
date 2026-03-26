<template>
  <div class="file-sidebar">
    <div class="file-sidebar-header">
      <span class="file-sidebar-title">Files</span>
      <div class="file-header-actions">
        <button class="file-action-btn" title="Open Folder" @click="openFolder">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button class="file-action-btn" title="New File" @click="$emit('newFile')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="file-sidebar-content">
      <div v-if="!folderName && flatFiles.length === 0" class="file-empty">
        <div class="file-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p class="file-empty-text">Open a folder to browse files</p>
        <button class="file-open-btn" @click="openFolder">Open Folder</button>
      </div>

      <template v-else>
        <div v-if="folderName" class="folder-name">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
          <span>{{ folderName }}</span>
        </div>

        <div v-if="flatFiles.length === 0" class="file-empty-small">No .md files found</div>

        <ul class="file-list">
          <template v-for="node in visibleNodes" :key="node.path">
            <li v-if="node.kind === 'directory'"
              class="tree-folder-label"
              :style="{ paddingLeft: (14 + node.depth * 16) + 'px' }"
              @click="toggleFolder(node.path)"
            >
              <svg class="tree-chevron" :class="{ expanded: expandedDirs.has(node.path) }" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="tree-folder-icon">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <span class="tree-name">{{ node.name }}</span>
            </li>
            <li v-else
              class="file-item"
              :class="{ active: node.name === activeFile }"
              :style="{ paddingLeft: (14 + node.depth * 16) + 'px' }"
              @click="selectFile(node)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span class="file-name">{{ node.name }}</span>
            </li>
          </template>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface FileNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  depth: number
  handle?: FileSystemFileHandle
  parentPath: string
}

defineProps<{
  activeFile?: string
}>()

const emit = defineEmits<{
  fileContent: [content: string, filename: string]
  newFile: []
}>()

const flatFiles = ref<FileNode[]>([])
const folderName = ref('')
const expandedDirs = ref(new Set<string>())

const MD_EXTENSIONS = ['.md', '.markdown', '.txt']

function isMdFile(name: string): boolean {
  return MD_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))
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
  for (const node of flatFiles.value) {
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
    flatFiles.value = await scanDirectory(dirHandle, '', 0)
  } catch (err: any) {
    if (err.name !== 'AbortError') console.error('Failed to open folder:', err)
  }
}

async function selectFile(node: FileNode) {
  if (!node.handle) return
  try {
    const f = await node.handle.getFile()
    const content = await f.text()
    emit('fileContent', content, node.name)
  } catch (err) {
    console.error('Failed to read file:', err)
  }
}

defineExpose({ openFolder })
</script>
