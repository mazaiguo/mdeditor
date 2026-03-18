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
      <div v-if="!folderName && files.length === 0" class="file-empty">
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

        <div v-if="files.length === 0" class="file-empty-small">No .md files found</div>

        <ul class="file-list">
          <li
            v-for="file in files"
            :key="file.name"
            class="file-item"
            :class="{ active: file.name === activeFile }"
            @click="selectFile(file)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span class="file-name">{{ file.name }}</span>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface MdFile {
  name: string
  handle: FileSystemFileHandle
}

defineProps<{
  activeFile?: string
}>()

const emit = defineEmits<{
  fileContent: [content: string, filename: string]
  newFile: []
}>()

const files = ref<MdFile[]>([])
const folderName = ref('')

async function openFolder() {
  try {
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
    folderName.value = dirHandle.name
    files.value = []

    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt'))) {
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
</script>
