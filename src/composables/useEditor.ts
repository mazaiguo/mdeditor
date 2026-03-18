import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { renderMarkdown, extractHeadings } from '../utils/markdown'

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

export function useEditor() {
  const content = useLocalStorage('md-editor-content', DEFAULT_CONTENT)
  const viewMode = useLocalStorage<ViewMode>('md-editor-mode', 'split')
  const theme = useLocalStorage<Theme>('md-editor-theme', 'light')
  const fontSize = useLocalStorage('md-editor-fontsize', 15)
  const showToc = useLocalStorage('md-editor-toc', true)
  const wordWrap = useLocalStorage('md-editor-wrap', true)

  const wordCount = computed(() => {
    const text = content.value.replace(/```[\s\S]*?```/g, '').replace(/[#*`_~\[\]()>-]/g, '')
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const english = (text.match(/\b[a-zA-Z]+\b/g) || []).length
    return chinese + english
  })

  const lineCount = computed(() => content.value.split('\n').length)

  const renderedHtml = computed(() => renderMarkdown(content.value))

  const headings = computed(() => extractHeadings(content.value))

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
    showToc,
    wordWrap,
    wordCount,
    lineCount,
    renderedHtml,
    headings,
    toggleTheme,
    setViewMode,
    toolbarActions,
    insertText,
  }
}
