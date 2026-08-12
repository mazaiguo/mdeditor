<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box export-modal">
        <div class="modal-header">
          <h3>Export Document</h3>
          <button class="modal-close" @click="$emit('close')">
            <Icon name="close" :size="16" />
          </button>
        </div>
        <div class="modal-body">
          <div class="export-filename-row">
            <label class="export-filename-label">Filename</label>
            <div class="export-filename-input-wrap">
              <input
                v-model="filename"
                class="export-filename-input"
                type="text"
                placeholder="document"
                @keydown.enter.stop
              />
            </div>
          </div>
          <div class="export-options">
            <button class="export-option-btn export-primary" @click="exportAs('md')">
              <div class="export-icon"><Icon name="exportMd" :size="28" :stroke-width="1.5" /></div>
              <div class="export-label">Markdown</div>
              <div class="export-desc">.md file</div>
            </button>
            <button class="export-option-btn" @click="exportAs('html')">
              <div class="export-icon"><Icon name="code" :size="28" :stroke-width="1.5" /></div>
              <div class="export-label">HTML</div>
              <div class="export-desc">Styled page</div>
            </button>
            <button class="export-option-btn" @click="exportAs('pdf')">
              <div class="export-icon"><Icon name="exportPdf" :size="28" :stroke-width="1.5" /></div>
              <div class="export-label">PDF</div>
              <div class="export-desc">Print / Save as PDF</div>
            </button>
            <button class="export-option-btn" :disabled="exporting" @click="exportAs('docx')">
              <div class="export-icon"><Icon name="exportWord" :size="28" :stroke-width="1.5" /></div>
              <div class="export-label">Word</div>
              <div class="export-desc">{{ exporting ? 'Generating...' : '.docx file' }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { exportDocument, getTitleFromMarkdown, type ExportFormat } from '../utils/export'

const props = defineProps<{
  visible: boolean
  markdown: string
  html: string
  theme: string
}>()

const emit = defineEmits<{
  close: []
}>()

const filename = ref('document')
const exporting = ref(false)

watch(() => props.visible, (val) => {
  if (val) filename.value = getTitleFromMarkdown(props.markdown)
})

async function exportAs(format: ExportFormat) {
  const base = filename.value.trim() || 'document'
  if (format === 'docx') {
    exporting.value = true
    try {
      await exportDocument('docx', { filename: base, markdown: props.markdown, html: props.html, theme: props.theme })
    } finally {
      exporting.value = false
      emit('close')
    }
    return
  }
  await exportDocument(format, { filename: base, markdown: props.markdown, html: props.html, theme: props.theme })
  emit('close')
}
</script>
