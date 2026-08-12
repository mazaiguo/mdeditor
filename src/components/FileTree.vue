<template>
  <div class="side-panel-body">
    <div class="tab-header-actions">
      <button class="file-action-btn" title="Open Folder" @click="$emit('openFolder')">
        <Icon name="folder" :size="13" />
        Open Folder
      </button>
      <button class="file-action-btn icon-only" title="New File" @click="$emit('newFile')">
        <Icon name="plus" :size="13" />
      </button>
    </div>

    <div v-if="!folderName && flatCount === 0" class="side-empty">
      <div class="side-empty-icon">
        <Icon name="folder" :size="28" :stroke-width="1.5" />
      </div>
      <p>Open a folder to browse .md files</p>
    </div>

    <template v-else>
      <div v-if="folderName" class="folder-label">
        <Icon name="folderFill" :size="12" />
        {{ folderName }}
      </div>
      <div v-if="flatCount === 0" class="side-empty-sm">No .md files found</div>
      <ul class="file-list">
        <template v-for="node in nodes" :key="node.path">
          <li
            v-if="node.kind === 'directory'"
            class="tree-folder-label"
            :style="{ paddingLeft: (10 + node.depth * 14) + 'px' }"
            @click="$emit('toggle', node.path)"
          >
            <Icon
              name="chevron"
              :size="9"
              :stroke-width="2.5"
              class="tree-chevron"
              :class="{ expanded: expandedDirs.has(node.path) }"
            />
            <Icon name="folderFill" :size="12" class="tree-folder-icon" />
            <span class="tree-name">{{ node.name }}</span>
          </li>
          <li
            v-else
            class="file-item"
            :class="{ active: node.name === activeFile }"
            :style="{ paddingLeft: (10 + node.depth * 14) + 'px' }"
            @click="$emit('select', node)"
            @contextmenu.prevent.stop="$emit('contextmenu', node, $event)"
          >
            <Icon name="file" :size="12" />
            <span class="file-name">{{ node.name }}</span>
          </li>
        </template>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
import type { FileNode } from '../composables/useFileTree'

defineProps<{
  nodes: FileNode[]
  folderName: string
  expandedDirs: Set<string>
  flatCount: number
  activeFile?: string
}>()

defineEmits<{
  toggle: [path: string]
  select: [node: FileNode]
  contextmenu: [node: FileNode, event: MouseEvent]
  openFolder: []
  newFile: []
}>()
</script>
