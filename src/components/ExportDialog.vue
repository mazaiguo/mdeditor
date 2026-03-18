<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box export-modal">
        <div class="modal-header">
          <h3>Export Document</h3>
          <button class="modal-close" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
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
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="10" y2="11"/>
                  <line x1="10" y1="11" x2="12" y2="13"/>
                  <line x1="12" y1="13" x2="14" y2="11"/>
                  <line x1="14" y1="11" x2="16" y2="13"/>
                </svg>
              </div>
              <div class="export-label">Markdown</div>
              <div class="export-desc">.md file</div>
            </button>
            <button class="export-option-btn" @click="exportAs('html')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <div class="export-label">HTML</div>
              <div class="export-desc">Standalone page</div>
            </button>
            <button class="export-option-btn" @click="exportAs('txt')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div class="export-label">Plain Text</div>
              <div class="export-desc">.txt file</div>
            </button>
            <button class="export-option-btn" :disabled="exporting" @click="exportAs('docx')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <text x="6" y="19" font-size="6" fill="currentColor" stroke="none" font-weight="bold">W</text>
                </svg>
              </div>
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
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
  markdown: string
  html: string
}>()

const emit = defineEmits<{
  close: []
}>()

const filename = ref('document')
const exporting = ref(false)

function downloadFile(content: string | ArrayBuffer, name: string, type: string) {
  const blob = content instanceof ArrayBuffer
    ? new Blob([content], { type })
    : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function exportAs(format: 'md' | 'html' | 'txt' | 'docx') {
  const base = filename.value.trim() || 'document'

  if (format === 'md') {
    downloadFile(props.markdown, `${base}.md`, 'text/markdown')
  } else if (format === 'txt') {
    const text = props.markdown.replace(/[#*`_~\[\]()>-]/g, '').replace(/\n{3,}/g, '\n\n')
    downloadFile(text, `${base}.txt`, 'text/plain')
  } else if (format === 'html') {
    const fullHtml = buildFullHtml(base)
    downloadFile(fullHtml, `${base}.html`, 'text/html')
    emit('close')
  } else if (format === 'docx') {
    exporting.value = true
    exportDocx(base).finally(() => {
      exporting.value = false
      emit('close')
    })
    return
  }
  emit('close')
}

function buildFullHtml(title: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1d1d1f; line-height: 1.8; padding: 40px 20px; }
  .container { max-width: 800px; margin: 0 auto; }
  h1,h2,h3,h4,h5,h6 { font-weight: 600; margin: 1.5em 0 0.6em; line-height: 1.3; }
  h1 { font-size: 2em; border-bottom: 2px solid #e5e5e7; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e5e5e7; padding-bottom: 0.2em; }
  p { margin: 0.8em 0; }
  code { font-family: 'SF Mono', Menlo, monospace; background: #f0f0f5; color: #c7254e; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
  pre { background: #1d1d1f; border-radius: 12px; padding: 20px; overflow-x: auto; margin: 1.2em 0; }
  pre code { background: none; color: #e8e8ed; font-size: 0.875em; }
  blockquote { border-left: 4px solid #0066cc; padding: 8px 16px; margin: 1em 0; background: rgba(0,102,204,0.05); border-radius: 0 8px 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th,td { border: 1px solid #e5e5e7; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f7; font-weight: 600; }
  img { max-width: 100%; border-radius: 8px; }
  a { color: #0066cc; text-decoration: none; }
  a:hover { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e5e5e7; margin: 2em 0; }
  mark { background: #fff3b0; padding: 1px 2px; border-radius: 2px; }
  .code-block-wrapper { background: #1d1d1f; border-radius: 12px; margin: 1.2em 0; overflow: hidden; }
  .code-block-header { background: #2d2d2f; padding: 6px 14px; font-size: 12px; color: #8e8e93; }
  .code-block-body pre { background: transparent; padding: 12px 14px; color: #e8e8ed; }
</style>
</head>
<body>
<div class="container">
${props.html}
</div>
</body>
</html>`
}

async function exportDocx(base: string) {
  try {
    const { default: htmlDocx } = await import('html-docx-js-typescript')
    const html = buildFullHtml(base)
    const blob = await htmlDocx.asBlob(html, {
      orientation: 'portrait',
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
    }) as Blob
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}.docx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Word export failed:', err)
    alert('Word 导出失败，请检查控制台')
  }
}
</script>
