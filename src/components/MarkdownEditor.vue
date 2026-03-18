<template>
  <div class="editor-pane" :style="{ fontSize: fontSize + 'px' }">
    <div ref="editorContainer" class="cm-editor-container" />
    <div v-if="isUploadingImage" class="paste-upload-toast">
      <div class="paste-spinner" />
      Uploading image to PicGo...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

const props = defineProps<{
  modelValue: string
  theme: 'light' | 'dark'
  fontSize: number
  wordWrap: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'insert': [before: string, after: string, placeholder: string]
}>()

const editorContainer = ref<HTMLDivElement>()
let editorView: EditorView | null = null
const themeCompartment = new Compartment()
const wrapCompartment = new Compartment()
const mdHighlightCompartment = new Compartment()

function getLightTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
    },
    '.cm-content': {
      padding: '20px 24px',
      minHeight: '100%',
      caretColor: '#0066cc',
      color: '#1d1d1f',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid #e5e5e7',
      color: '#aeaeb2',
      fontSize: '0.8em',
      minWidth: '40px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0, 102, 204, 0.06)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 102, 204, 0.04)',
      borderRadius: '3px',
    },
    '.cm-cursor': {
      borderLeft: '2px solid #0066cc',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(0, 102, 204, 0.15) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(0, 102, 204, 0.2) !important',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(0, 102, 204, 0.15)',
      outline: '1px solid rgba(0, 102, 204, 0.3)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(255, 204, 0, 0.3)',
      outline: '1px solid rgba(255, 204, 0, 0.6)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(255, 149, 0, 0.4)',
    },
  }, { dark: false })
}

function getDarkTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
    },
    '.cm-content': {
      padding: '20px 24px',
      minHeight: '100%',
      caretColor: '#4facfe',
      color: '#e8e8ed',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid #3a3a3c',
      color: '#636366',
      fontSize: '0.8em',
      minWidth: '40px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(79, 172, 254, 0.08)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(79, 172, 254, 0.05)',
      borderRadius: '3px',
    },
    '.cm-cursor': {
      borderLeft: '2px solid #4facfe',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(79, 172, 254, 0.2) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(79, 172, 254, 0.25) !important',
    },
  }, { dark: true })
}

const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.4em', fontWeight: '700', color: '#0066cc' },
  { tag: tags.heading2, fontSize: '1.2em', fontWeight: '600', color: '#0077dd' },
  { tag: tags.heading3, fontSize: '1.1em', fontWeight: '600', color: '#0088ee' },
  { tag: tags.heading4, fontWeight: '600', color: '#0099ff' },
  { tag: tags.strong, fontWeight: '700', color: '#d63384' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#7c3aed' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6c757d' },
  { tag: tags.link, color: '#0066cc', textDecoration: 'underline' },
  { tag: tags.url, color: '#059669' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)', color: '#d97706', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '3px', padding: '1px 3px' },
  { tag: tags.quote, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.list, color: '#0066cc' },
  { tag: tags.meta, color: '#059669' },
  { tag: tags.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#7c3aed', fontWeight: '600' },
])

const darkMarkdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.4em', fontWeight: '700', color: '#60a5fa' },
  { tag: tags.heading2, fontSize: '1.2em', fontWeight: '600', color: '#7db5fb' },
  { tag: tags.heading3, fontSize: '1.1em', fontWeight: '600', color: '#93c5fd' },
  { tag: tags.heading4, fontWeight: '600', color: '#a5d0fd' },
  { tag: tags.strong, fontWeight: '700', color: '#f472b6' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#c084fc' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#94a3b8' },
  { tag: tags.link, color: '#60a5fa', textDecoration: 'underline' },
  { tag: tags.url, color: '#34d399' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', borderRadius: '3px', padding: '1px 3px' },
  { tag: tags.quote, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.list, color: '#60a5fa' },
  { tag: tags.meta, color: '#34d399' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#c084fc', fontWeight: '600' },
])

function buildExtensions() {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    drawSelection(),
    bracketMatching(),
    foldGutter(),
    highlightSelectionMatches(),
    mdHighlightCompartment.of(syntaxHighlighting(props.theme === 'dark' ? darkMarkdownHighlightStyle : markdownHighlightStyle)),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    themeCompartment.of(props.theme === 'dark' ? [oneDark, getDarkTheme()] : getLightTheme()),
    wrapCompartment.of(props.wordWrap ? EditorView.lineWrapping : []),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...foldKeymap,
      indentWithTab,
      {
        key: 'Ctrl-b',
        run(_view) {
          emit('insert', '**', '**', 'bold text')
          return true
        },
      },
      {
        key: 'Ctrl-i',
        run(_view) {
          emit('insert', '*', '*', 'italic text')
          return true
        },
      },
      {
        key: 'Ctrl-k',
        run(_view) {
          emit('insert', '[', '](url)', 'link text')
          return true
        },
      },
      {
        key: 'Ctrl-1',
        run(_view) {
          emit('insert', '# ', '', 'Heading 1')
          return true
        },
      },
      {
        key: 'Ctrl-2',
        run(_view) {
          emit('insert', '## ', '', 'Heading 2')
          return true
        },
      },
      {
        key: 'Ctrl-3',
        run(_view) {
          emit('insert', '### ', '', 'Heading 3')
          return true
        },
      },
      {
        key: 'Ctrl-4',
        run(_view) {
          emit('insert', '#### ', '', 'Heading 4')
          return true
        },
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
  ]
}

onMounted(() => {
  if (!editorContainer.value) return

  editorView = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: buildExtensions(),
    }),
    parent: editorContainer.value,
  })

  editorContainer.value.addEventListener('paste', handlePasteImage)
})

onUnmounted(() => {
  editorContainer.value?.removeEventListener('paste', handlePasteImage)
  editorView?.destroy()
})

watch(() => props.modelValue, (newVal) => {
  if (!editorView) return
  const current = editorView.state.doc.toString()
  if (current !== newVal) {
    editorView.dispatch({
      changes: { from: 0, to: current.length, insert: newVal },
    })
  }
})

watch(() => props.theme, (newTheme) => {
  editorView?.dispatch({
    effects: [
      themeCompartment.reconfigure(newTheme === 'dark' ? [oneDark, getDarkTheme()] : getLightTheme()),
      mdHighlightCompartment.reconfigure(syntaxHighlighting(newTheme === 'dark' ? darkMarkdownHighlightStyle : markdownHighlightStyle)),
    ],
  })
})

watch(() => props.wordWrap, (newWrap) => {
  editorView?.dispatch({
    effects: wrapCompartment.reconfigure(newWrap ? EditorView.lineWrapping : []),
  })
})

function insertAtCursor(before: string, after: string, placeholder: string) {
  if (!editorView) return

  const state = editorView.state
  const selection = state.selection.main
  const selectedText = state.sliceDoc(selection.from, selection.to)
  const insertText = selectedText || placeholder
  const newText = before + insertText + after

  editorView.dispatch({
    changes: { from: selection.from, to: selection.to, insert: newText },
    selection: {
      anchor: selection.from + before.length,
      head: selection.from + before.length + insertText.length,
    },
  })
  editorView.focus()
}

function insertRaw(text: string) {
  if (!editorView) return
  const state = editorView.state
  const pos = state.selection.main.head
  editorView.dispatch({
    changes: { from: pos, to: pos, insert: text },
    selection: { anchor: pos + text.length },
  })
  editorView.focus()
}

// PicGo paste upload — default URL uses current hostname so NAS deploys work automatically
const defaultPicGoUrl = `http://${window.location.hostname}:36677`
const picgoServerUrl = useLocalStorage('picgo-server-url', defaultPicGoUrl)
const isUploadingImage = ref(false)

function getImageTimestamp(): string {
  const now = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3)
  )
}

async function uploadBinaryToPicGo(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append('list[]', file)
  try {
    const base = picgoServerUrl.value.replace(/\/$/, '')
    const res = await fetch(`${base}/upload`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.success && data.result?.length) return data.result[0] as string
    throw new Error(data.message || 'No URL returned')
  } catch (err) {
    console.error('PicGo binary upload failed:', err)
    return null
  }
}

async function saveImageLocally(file: File): Promise<string | null> {
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  try {
    const res = await fetch('/api/save-image', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'X-Image-Ext': ext },
      body: file,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.success) return data.path as string
    throw new Error('Save failed')
  } catch (err) {
    console.error('Local image save failed:', err)
    return null
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadPathToPicGo(filePath: string): Promise<string | null> {
  try {
    const base = picgoServerUrl.value.replace(/\/$/, '')
    const res = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: [filePath] }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.success && data.result?.length) return data.result[0] as string
    throw new Error(data.message || 'No URL returned')
  } catch (err) {
    console.error('PicGo path upload failed:', err)
    return null
  }
}

// Local Windows/Mac image path pattern: ![alt](C:\...\file.ext) or ![alt](/home/...ext)
const LOCAL_IMG_RE = /!\[([^\]]*)\]\(([a-zA-Z]:[^\)]+\.(?:png|jpe?g|gif|webp|bmp|svg)|\/(?:[^\)]+)\.(?:png|jpe?g|gif|webp|bmp|svg))\)/gi

async function replaceLocalImgPaths(text: string): Promise<{ result: string; replaced: boolean }> {
  const matches = [...text.matchAll(LOCAL_IMG_RE)]
  if (!matches.length) return { result: text, replaced: false }

  let result = text
  for (const match of matches) {
    const [fullMatch, altText, localPath] = match
    const url = await uploadPathToPicGo(localPath)
    if (url) {
      result = result.replace(fullMatch, `![${altText || `image-${getImageTimestamp()}`}](${url})`)
    }
  }
  return { result, replaced: result !== text }
}

function handlePasteImage(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  // Check for binary image first (screenshot / copied image)
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue
      isUploadingImage.value = true
      uploadBinaryToPicGo(file).then(async (url) => {
        if (url) {
          isUploadingImage.value = false
          insertRaw(`![image-${getImageTimestamp()}](${url})`)
          return
        }
        // Fallback 1: save to local server
        const localPath = await saveImageLocally(file)
        if (localPath) {
          isUploadingImage.value = false
          insertRaw(`![image-${getImageTimestamp()}](${localPath})`)
          return
        }
        // Fallback 2: embed as base64 so the preview always works
        const dataUrl = await fileToDataUrl(file)
        isUploadingImage.value = false
        insertRaw(`![image-${getImageTimestamp()}](${dataUrl})`)
      })
      return
    }
  }

  // Check for pasted text containing local image paths (e.g. from Typora)
  const plainText = e.clipboardData?.getData('text/plain') ?? ''
  LOCAL_IMG_RE.lastIndex = 0
  if (plainText && LOCAL_IMG_RE.test(plainText)) {
    e.preventDefault()
    LOCAL_IMG_RE.lastIndex = 0
    isUploadingImage.value = true
    replaceLocalImgPaths(plainText).then(({ result }) => {
      isUploadingImage.value = false
      insertRaw(result)
    })
  }
}

async function pickAndInsertLocalImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const alt = file.name.replace(/\.[^.]+$/, '')
    isUploadingImage.value = true

    // Try PicGo first
    const url = await uploadBinaryToPicGo(file)
    if (url) {
      isUploadingImage.value = false
      insertRaw(`![${alt}](${url})`)
      return
    }
    // Try local server save
    const localPath = await saveImageLocally(file)
    if (localPath) {
      isUploadingImage.value = false
      insertRaw(`![${alt}](${localPath})`)
      return
    }
    // Final fallback: base64 embed
    const dataUrl = await fileToDataUrl(file)
    isUploadingImage.value = false
    insertRaw(`![${alt}](${dataUrl})`)
  }
  input.click()
}

defineExpose({ insertAtCursor, pickAndInsertLocalImage })
</script>
