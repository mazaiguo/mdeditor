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
              <div class="export-desc">Styled page</div>
            </button>
            <button class="export-option-btn" @click="exportAs('pdf')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3z"/>
                  <path d="M12 16h1a2 2 0 0 0 0-4h-1v4z"/>
                  <path d="M15 13v3"/>
                  <line x1="15" y1="13" x2="17" y2="13"/>
                </svg>
              </div>
              <div class="export-label">PDF</div>
              <div class="export-desc">Print / Save as PDF</div>
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
import { ref, watch } from 'vue'

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

function getTitleFromMarkdown(md: string): string {
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
    if (titleMatch) return titleMatch[1].trim()
  }
  const h1 = md.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return 'document'
}

function downloadFile(content: string | ArrayBuffer, name: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function getAllStyles(): string {
  const parts: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      parts.push(Array.from(sheet.cssRules).map(r => r.cssText).join('\n'))
    } catch {
      // skip cross-origin sheets
    }
  }
  return parts.join('\n')
}

function buildFullHtml(title: string): string {
  const styles = getAllStyles()
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
<style>
${styles}
/* ── Export overrides: reset app layout constraints ── */
html, body {
  height: auto !important;
  min-height: auto !important;
  overflow: auto !important;
  position: static !important;
}
body {
  margin: 0 !important;
  padding: 40px 20px !important;
  background: #fff !important;
}
.app, .editor-layout, .editor-main, .preview-area {
  display: block !important;
  height: auto !important;
  min-height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  position: static !important;
  width: auto !important;
  flex: none !important;
}
.preview-pane {
  display: block !important;
  height: auto !important;
  min-height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  position: static !important;
  max-width: 900px !important;
  margin: 0 auto !important;
  padding: 0 !important;
}
/* ── Print: allow full content to flow across pages ── */
@media print {
  html, body {
    height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .preview-pane {
    max-width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  pre, code, .code-block-wrapper {
    page-break-inside: avoid;
    white-space: pre-wrap !important;
  }
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }
}
</style>
</head>
<body>
<div class="preview-pane theme-${props.theme}">
${props.html}
</div>
</body>
</html>`
}

function exportAs(format: 'md' | 'html' | 'pdf' | 'docx') {
  const base = filename.value.trim() || 'document'

  if (format === 'md') {
    downloadFile(props.markdown, `${base}.md`, 'text/markdown')
    emit('close')
  } else if (format === 'html') {
    downloadFile(buildFullHtml(base), `${base}.html`, 'text/html')
    emit('close')
  } else if (format === 'pdf') {
    exportPdf(base)
  } else if (format === 'docx') {
    exporting.value = true
    exportDocx(base).finally(() => {
      exporting.value = false
      emit('close')
    })
  }
}

function exportPdf(title: string) {
  const html = buildFullHtml(title)
  const win = window.open('', '_blank')
  if (!win) {
    alert('Pop-up was blocked. Please allow pop-ups for this page.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  // Wait for fonts, images and any deferred scripts to finish before printing
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 800)
  })
  // Fallback in case load already fired
  setTimeout(() => {
    if (!win.closed) {
      win.focus()
      win.print()
    }
  }, 2000)
  emit('close')
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
    alert('Word export failed, check the console.')
  }
}
</script>
