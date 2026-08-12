<template>
  <div class="editor-pane" :style="{ fontSize: fontSize + 'px' }">
    <div ref="editorContainer" class="cm-editor-container" />
    <div v-if="isUploadingImage" class="paste-upload-overlay">
      <div class="paste-upload-card">
        <div class="paste-spinner" />
        <span>Uploading image...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { getLightTheme, getDarkTheme, markdownHighlight } from '../utils/codemirrorTheme'
import { useImageUpload } from '../composables/useImageUpload'

const props = defineProps<{
  modelValue: string
  theme: 'light' | 'dark'
  fontSize: number
  wordWrap: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLDivElement>()
let editorView: EditorView | null = null
const themeCompartment = new Compartment()
const wrapCompartment = new Compartment()
const mdHighlightCompartment = new Compartment()

// Markdown shortcut keys. Each calls our own insertAtCursor directly
// (previously these emitted an `insert` event that App forwarded back here).
const markdownKeymap = [
  { key: 'Ctrl-b', run: () => { insertAtCursor('**', '**', 'bold text'); return true } },
  { key: 'Ctrl-i', run: () => { insertAtCursor('*', '*', 'italic text'); return true } },
  { key: 'Ctrl-k', run: () => { insertAtCursor('[', '](url)', 'link text'); return true } },
  { key: 'Ctrl-1', run: () => { insertAtCursor('# ', '', 'Heading 1'); return true } },
  { key: 'Ctrl-2', run: () => { insertAtCursor('## ', '', 'Heading 2'); return true } },
  { key: 'Ctrl-3', run: () => { insertAtCursor('### ', '', 'Heading 3'); return true } },
  { key: 'Ctrl-4', run: () => { insertAtCursor('#### ', '', 'Heading 4'); return true } },
]

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
    mdHighlightCompartment.of(markdownHighlight(props.theme)),
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
      ...markdownKeymap,
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
      mdHighlightCompartment.reconfigure(markdownHighlight(newTheme)),
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

const { isUploadingImage, handlePasteImage, pickAndInsertLocalImage } = useImageUpload(insertRaw)

defineExpose({ insertAtCursor, pickAndInsertLocalImage })
</script>
