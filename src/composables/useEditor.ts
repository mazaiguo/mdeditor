import { computed, ref, watch } from 'vue'
import { useLocalStorage, useDebounceFn } from '@vueuse/core'
import { parseDocument } from '../utils/markdown'

const DEFAULT_CONTENT = `# Welcome to MD Editor

A beautiful Typora-like Markdown editor built with Vue 3.

## Features

- **Real-time preview** with split or live mode
- **Apple-style code blocks** with syntax highlighting
- **Task lists** support
- **Table** support
- **Math** and more

## Code Example

\`\`\`javascript
function greet(name) {
  const message = \`Hello, \${name}!\`
  console.log(message)
  return message
}

greet('World')
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print([fibonacci(i) for i in range(10)])
\`\`\`

## Tables

| Feature | Status | Note |
|---------|--------|------|
| Markdown | ✅ | Full support |
| Code Highlight | ✅ | Apple style |
| Dark Mode | ✅ | Toggleable |
| Export | ✅ | HTML / MD |

## Task Lists

- [x] Create editor
- [x] Add syntax highlighting
- [ ] Add more themes
- [ ] Cloud sync

## Blockquote

> The best way to predict the future is to invent it.
> — Alan Kay

## Mermaid 图表

\`\`\`mermaid
flowchart LR
    A[开始] --> B{条件判断}
    B -->|满足| C[执行操作]
    B -->|不满足| D[结束]
    C --> D
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 服务器
    用户->>服务器: 发送请求
    服务器-->>用户: 返回结果
\`\`\`

## Inline Elements

You can use **bold**, *italic*, ~~strikethrough~~, \`inline code\`, ==highlight==, H^2^O, CO~2~, and [links](https://github.com).

---

Start editing and enjoy your writing experience!
`

export type ViewMode = 'edit' | 'split' | 'preview'
export type Theme = 'light' | 'dark'

const CONTENT_KEY = 'md-editor-content'

/** Count CJK characters plus English words, ignoring code blocks and markup. */
export function countWords(source: string): number {
  const text = source.replace(/```[\s\S]*?```/g, '').replace(/[\]#*`_~[()>-]/g, '')
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const english = (text.match(/\b[a-zA-Z]+\b/g) || []).length
  return chinese + english
}

function loadContent(): string {
  try {
    return localStorage.getItem(CONTENT_KEY) ?? DEFAULT_CONTENT
  } catch {
    return DEFAULT_CONTENT
  }
}

export function useEditor() {
  // Content is persisted manually (instead of useLocalStorage) so we can
  // detect quota errors: base64 images can easily exceed the ~5MB limit.
  const content = ref(loadContent())
  const storageQuotaExceeded = ref(false)

  const persistContent = useDebounceFn(() => {
    try {
      localStorage.setItem(CONTENT_KEY, content.value)
      storageQuotaExceeded.value = false
    } catch {
      storageQuotaExceeded.value = true
    }
  }, 500)

  watch(content, persistContent)

  const viewMode = useLocalStorage<ViewMode>('md-editor-mode', 'split')
  const theme = useLocalStorage<Theme>('md-editor-theme', 'light')
  const fontSize = useLocalStorage('md-editor-fontsize', 15)
  const wordWrap = useLocalStorage('md-editor-wrap', true)

  const wordCount = computed(() => countWords(content.value))

  const lineCount = computed(() => content.value.split('\n').length)

  // Debounced single-pass parse: HTML + headings share one token stream
  const debouncedContent = ref(content.value)
  watch(content, useDebounceFn((value: string) => { debouncedContent.value = value }, 200))

  const parsed = computed(() => parseDocument(debouncedContent.value))
  const renderedHtml = computed(() => parsed.value.html)
  const headings = computed(() => parsed.value.headings)

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function insertText(before: string, after = '', placeholder = '') {
    return { before, after, placeholder }
  }

  const toolbarActions = {
    bold: () => insertText('**', '**', 'bold text'),
    italic: () => insertText('*', '*', 'italic text'),
    underline: () => insertText('<u>', '</u>', 'underline text'),
    strikethrough: () => insertText('~~', '~~', 'text'),
    highlight: () => insertText('==', '==', 'highlight text'),
    superscript: () => insertText('^', '^', 'sup'),
    subscript: () => insertText('~', '~', 'sub'),
    code: () => insertText('`', '`', 'code'),
    codeBlock: () => insertText('```\n', '\n```', 'code here'),
    mermaid: () => insertText('\n```mermaid\n', '\n```\n', 'flowchart LR\n    A[开始] --> B{判断}\n    B -->|Yes| C[执行]\n    B -->|No| D[结束]'),
    heading1: () => insertText('# ', '', 'Heading 1'),
    heading2: () => insertText('## ', '', 'Heading 2'),
    heading3: () => insertText('### ', '', 'Heading 3'),
    heading4: () => insertText('#### ', '', 'Heading 4'),
    link: () => insertText('[', '](url)', 'link text'),
    image: () => insertText('![', '](url)', 'alt text'),
    quote: () => insertText('> ', '', 'quote'),
    ul: () => insertText('- ', '', 'list item'),
    ol: () => insertText('1. ', '', 'list item'),
    table: () => insertText('| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n', '', ''),
    hr: () => insertText('\n---\n', '', ''),
    taskList: () => insertText('- [ ] ', '', 'task'),
  }

  return {
    content,
    viewMode,
    theme,
    fontSize,
    wordWrap,
    wordCount,
    lineCount,
    renderedHtml,
    headings,
    storageQuotaExceeded,
    toggleTheme,
    setViewMode,
    toolbarActions,
    insertText,
  }
}
