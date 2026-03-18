import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import markdownItAnchor from 'markdown-it-anchor'
import markdownItTaskLists from 'markdown-it-task-lists'
// @ts-ignore - no types
import markdownItMark from 'markdown-it-mark'
// @ts-ignore
import markdownItSub from 'markdown-it-sub'
// @ts-ignore
import markdownItSup from 'markdown-it-sup'
import yaml from 'js-yaml'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string, attrs: string) {
    const language = lang || 'plaintext'
    // Support fold/collapsed keyword to default-collapse the code block
    const defaultCollapsed = /\b(fold|collapsed)\b/i.test(attrs || '')

    // Mermaid diagrams: return a special placeholder rendered client-side
    if (lang === 'mermaid') {
      const escaped = str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<div class="mermaid-wrapper"><div class="mermaid">${escaped}</div></div>`
    }

    let highlighted = ''
    try {
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } else {
        highlighted = hljs.highlightAuto(str).value
      }
    } catch {
      highlighted = md.utils.escapeHtml(str)
    }

    const lines = highlighted.split('\n')
    // Remove all trailing blank lines (empty or whitespace-only)
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

    const lineNumbers = lines
      .map((_, i) => `<span class="line-num">${i + 1}</span>`)
      .join('')

    const codeLines = lines
      .map(line => `<span class="code-line">${line || '&#8203;'}</span>`)
      .join('')

    const langLabel = lang
      ? `<span class="code-lang-label">${lang}</span>`
      : ''

    const copyBtn = `<button class="copy-btn" title="Copy"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`

    const collapseBtn = `<button class="collapse-btn" title="Collapse/Expand"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg></button>`

    const trafficLights = `<div class="traffic-lights"><span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span></div>`

    const collapsedAttr = defaultCollapsed ? ' data-collapsed="true"' : ''
    return `<div class="code-block-wrapper"${collapsedAttr}><div class="code-block-header">${trafficLights}${langLabel}${copyBtn}${collapseBtn}</div><div class="code-block-body"><pre class="line-numbers-gutter">${lineNumbers}</pre><pre class="hljs"><code class="language-${language}">${codeLines}</code></pre></div></div>`
  },
})

// Rewrite local file paths in image src to use the dev server proxy
const defaultImageRenderer = md.renderer.rules.image
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const src = token.attrGet('src') || ''
  // Windows path: C:/... or C:\... or Mac/Linux: /home/...
  if (/^[a-zA-Z]:[/\\]/.test(src) || /^\/(?!\/)[^\s]+\.(?:png|jpe?g|gif|webp|bmp|svg)$/i.test(src)) {
    token.attrSet('src', `/api/local-image?path=${encodeURIComponent(src)}`)
  }
  if (defaultImageRenderer) {
    return defaultImageRenderer(tokens, idx, options, env, self)
  }
  return self.renderToken(tokens, idx, options)
}

md.use(markdownItMark)
md.use(markdownItSub)
md.use(markdownItSup)

md.use(markdownItAnchor, {
  permalink: markdownItAnchor.permalink.ariaHidden({
    placement: 'before',
    symbol: '#',
  }),
})

md.use(markdownItTaskLists, { enabled: true, label: true })

/**
 * Parse YAML front matter from Markdown content.
 * Returns { meta, body } where meta is the parsed object and body is the remaining Markdown.
 */
function parseFrontMatter(source: string): { meta: Record<string, unknown> | null; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/m)
  if (!match) return { meta: null, body: source }
  try {
    const meta = yaml.load(match[1]) as Record<string, unknown>
    return { meta: typeof meta === 'object' && meta !== null ? meta : null, body: match[2] }
  } catch {
    return { meta: null, body: source }
  }
}

function formatFmValue(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (Array.isArray(value)) {
    return value.map(v => `<span class="fm-tag">${String(v)}</span>`).join(' ')
  }
  if (value === null || value === undefined) return ''
  return md.utils.escapeHtml(String(value))
}

function renderFrontMatter(meta: Record<string, unknown>): string {
  const rows = Object.entries(meta)
    .map(([key, value]) => {
      const val = formatFmValue(value)
      return `<tr><td class="fm-key">${md.utils.escapeHtml(key)}</td><td class="fm-val">${val}</td></tr>`
    })
    .join('')
  return `<div class="front-matter-block"><table class="fm-table">${rows}</table></div>`
}

export function renderMarkdown(source: string): string {
  const { meta, body } = parseFrontMatter(source)
  const fmHtml = meta ? renderFrontMatter(meta) : ''
  return fmHtml + md.render(body)
}

export function extractHeadings(source: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = []
  const { body } = parseFrontMatter(source)
  const lines = body.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
        .replace(/\s+/g, '-')
      headings.push({ level, text, id })
    }
  }
  return headings
}
