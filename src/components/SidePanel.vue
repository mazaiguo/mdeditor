<template>
  <div class="side-panel" @click="closeCtxMenu">
    <!-- File right-click menu -->
    <ContextMenu
      :visible="fileCtxMenu.visible"
      :x="fileCtxMenu.x"
      :y="fileCtxMenu.y"
      menu-class="file-ctx-menu"
      overlay-class="file-ctx-overlay"
      @close="closeCtxMenu"
    >
      <div class="file-ctx-item" @click="copyFileName">
        <Icon name="copy" :size="13" />
        复制文件名
      </div>
      <div class="file-ctx-item" @click="copyFilePath">
        <Icon name="link" :size="13" />
        复制路径
      </div>
      <div class="file-ctx-item" @click="openFileFromMenu">
        <Icon name="file" :size="13" />
        打开文件
      </div>
    </ContextMenu>

    <div class="side-panel-tabs">
      <button class="side-tab" :class="{ active: activeTab === 'files' }" @click="activeTab = 'files'">
        <Icon name="folder" :size="13" />
        Files
      </button>
      <button class="side-tab" :class="{ active: activeTab === 'toc' }" @click="activeTab = 'toc'">
        <Icon name="list" :size="13" />
        Contents
      </button>
    </div>

    <FileTree
      v-if="activeTab === 'files'"
      :nodes="visibleNodes"
      :folder-name="folderName"
      :expanded-dirs="expandedDirs"
      :flat-count="flatNodes.length"
      :active-file="activeFile"
      @toggle="toggleFolder"
      @select="selectFileNode"
      @contextmenu="showFileCtxMenu"
      @open-folder="openFolder"
      @new-file="$emit('newFile')"
    />
    <TocPanel
      v-else
      :headings="headings"
      :active-id="activeHeadingId"
      @scroll="scrollToHeading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import Icon from './Icon.vue'
import ContextMenu from './ContextMenu.vue'
import FileTree from './FileTree.vue'
import TocPanel from './TocPanel.vue'
import { useFileTree, type FileNode } from '../composables/useFileTree'

defineProps<{
  activeFile?: string
  headings: Array<{ level: number; text: string; html: string; id: string }>
  activeHeadingId?: string
}>()

const emit = defineEmits<{
  fileContent: [content: string, filename: string, handle: FileSystemFileHandle | null]
  newFile: []
}>()

const activeTab = ref<'files' | 'toc'>('files')

const { flatNodes, folderName, expandedDirs, visibleNodes, toggleFolder, openFolder, selectFileNode } = useFileTree(
  (content, name, handle) => emit('fileContent', content, name, handle),
)

const fileCtxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null as FileNode | null,
})

function showFileCtxMenu(node: FileNode, e: MouseEvent) {
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
  const target = document.getElementById(id)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ openFolder })
</script>
