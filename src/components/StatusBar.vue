<template>
  <div class="statusbar">
    <div class="status-left">
      <span class="status-item">
        <Icon name="file" :size="12" />
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
      <button class="status-btn" :title="wordWrap ? 'Disable wrap' : 'Enable wrap'" @click="$emit('update:wordWrap', !wordWrap)">
        Wrap: {{ wordWrap ? 'On' : 'Off' }}
      </button>
      <span class="status-item font-size-ctrl">
        <button class="status-btn" @click="$emit('update:fontSize', Math.max(11, fontSize - 1))">A-</button>
        <span>{{ fontSize }}px</span>
        <button class="status-btn" @click="$emit('update:fontSize', Math.min(24, fontSize + 1))">A+</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  activeFileName: string
  dirty: boolean
  lineCount: number
  wordCount: number
  storageQuotaExceeded: boolean
  wordWrap: boolean
  fontSize: number
}>()

defineEmits<{
  'update:wordWrap': [value: boolean]
  'update:fontSize': [value: number]
}>()
</script>
