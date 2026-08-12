<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <!-- Headings -->
      <div class="toolbar-group">
        <button
          v-for="item in headingGroup"
          :key="item.action"
          class="toolbar-btn"
          :title="item.title"
          @click="$emit('action', item.action)"
        >
          <span class="heading-label">{{ item.text }}</span>
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Inline formatting -->
      <div class="toolbar-group">
        <button
          v-for="item in inlineGroup"
          :key="item.action"
          class="toolbar-btn"
          :title="item.title"
          @click="$emit('action', item.action)"
        >
          <Icon v-if="item.icon" :name="item.icon" :size="15" />
          <span v-else-if="item.glyph === 'sup'" style="font-size:12px;font-weight:600;line-height:1">X<sup style="font-size:8px">2</sup></span>
          <span v-else-if="item.glyph === 'sub'" style="font-size:12px;font-weight:600;line-height:1">X<sub style="font-size:8px">2</sub></span>
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Code / blocks -->
      <div class="toolbar-group">
        <button
          v-for="item in codeGroup"
          :key="item.action"
          class="toolbar-btn"
          :title="item.title"
          @click="$emit('action', item.action)"
        >
          <Icon :name="item.icon" :size="15" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Lists / tables -->
      <div class="toolbar-group">
        <button
          v-for="item in listGroup"
          :key="item.action"
          class="toolbar-btn"
          :title="item.title"
          @click="$emit('action', item.action)"
        >
          <Icon :name="item.icon" :size="15" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Links / media (mixed events) -->
      <div class="toolbar-group">
        <button class="toolbar-btn" title="Link (Ctrl+K)" @click="$emit('action', 'link')">
          <Icon name="link" :size="15" />
        </button>
        <button class="toolbar-btn" title="Insert Local Image" @click="$emit('localImage')">
          <Icon name="image" :size="15" />
        </button>
        <button class="toolbar-btn" title="Upload Image via PicGo" @click="$emit('picgo')">
          <Icon name="upload" :size="15" />
        </button>
        <button class="toolbar-btn" title="Horizontal Rule" @click="$emit('action', 'hr')">
          <Icon name="hr" :size="15" />
        </button>
      </div>
    </div>

    <div class="toolbar-right">
      <!-- View modes -->
      <div class="toolbar-group">
        <button
          v-for="mode in viewModes"
          :key="mode.value"
          class="toolbar-btn mode-btn"
          :class="{ active: viewMode === mode.value }"
          :title="mode.title"
          @click="$emit('setMode', mode.value)"
        >
          <Icon :name="mode.icon" :size="15" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- File operations -->
      <div class="toolbar-group">
        <button class="toolbar-btn" title="Open File (Ctrl+O)" @click="$emit('openFile')">
          <Icon name="file" :size="15" color="#6cb6ff" />
        </button>
        <button class="toolbar-btn" title="Open Folder (Ctrl+Shift+O)" @click="$emit('openFolder')">
          <Icon name="folder" :size="15" color="#e8a838" />
        </button>
        <button class="toolbar-btn" title="New Document (Ctrl+N)" @click="$emit('newFile')">
          <Icon name="filePlus" :size="15" color="#5dd87a" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- View toggles -->
      <div class="toolbar-group">
        <button class="toolbar-btn" :class="{ active: showFileSidebar }" title="Toggle Side Panel (Files / Contents)" @click="$emit('toggleFileSidebar')">
          <Icon name="sidebar" :size="15" />
        </button>
        <button class="toolbar-btn" :title="theme === 'light' ? 'Dark Mode' : 'Light Mode'" @click="$emit('toggleTheme')">
          <Icon :name="theme === 'light' ? 'moon' : 'sun'" :size="15" />
        </button>
        <button class="toolbar-btn" title="Export" @click="$emit('export')">
          <Icon name="download" :size="15" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
import type { ViewMode, Theme } from '../composables/useEditor'

interface ActionItem {
  title: string
  action: string
  icon?: string
  text?: string
  glyph?: 'sup' | 'sub'
}

defineProps<{
  viewMode: ViewMode
  theme: Theme
  showFileSidebar: boolean
}>()

defineEmits<{
  action: [action: string]
  setMode: [mode: ViewMode]
  toggleTheme: []
  export: []
  openFile: []
  openFolder: []
  newFile: []
  toggleFileSidebar: []
  picgo: []
  localImage: []
}>()

const headingGroup: ActionItem[] = [
  { title: 'Heading 1', action: 'heading1', text: 'H1' },
  { title: 'Heading 2', action: 'heading2', text: 'H2' },
  { title: 'Heading 3', action: 'heading3', text: 'H3' },
  { title: 'Heading 4', action: 'heading4', text: 'H4' },
]

const inlineGroup: ActionItem[] = [
  { title: 'Bold (Ctrl+B)', action: 'bold', icon: 'bold' },
  { title: 'Italic (Ctrl+I)', action: 'italic', icon: 'italic' },
  { title: 'Underline', action: 'underline', icon: 'underline' },
  { title: 'Strikethrough', action: 'strikethrough', icon: 'strikethrough' },
  { title: 'Highlight (==text==)', action: 'highlight', icon: 'highlight' },
  { title: 'Superscript (^text^)', action: 'superscript', glyph: 'sup' },
  { title: 'Subscript (~text~)', action: 'subscript', glyph: 'sub' },
]

const codeGroup: ActionItem[] = [
  { title: 'Inline Code (Ctrl+`)', action: 'code', icon: 'code' },
  { title: 'Code Block', action: 'codeBlock', icon: 'codeBlock' },
  { title: 'Mermaid Diagram', action: 'mermaid', icon: 'mermaid' },
  { title: 'Quote', action: 'quote', icon: 'quote' },
]

const listGroup: ActionItem[] = [
  { title: 'Unordered List', action: 'ul', icon: 'ul' },
  { title: 'Ordered List', action: 'ol', icon: 'ol' },
  { title: 'Task List', action: 'taskList', icon: 'taskList' },
  { title: 'Table', action: 'table', icon: 'table' },
]

const viewModes: { value: ViewMode; title: string; icon: string }[] = [
  { value: 'edit', title: 'Edit Mode', icon: 'edit' },
  { value: 'split', title: 'Split Mode', icon: 'split' },
  { value: 'preview', title: 'Preview Mode', icon: 'preview' },
]
</script>
