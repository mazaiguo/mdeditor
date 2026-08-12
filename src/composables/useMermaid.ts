import type Mermaid from 'mermaid'

/* ── Mermaid: lazy-load the ~2MB bundle only when a diagram is present ── */

// Module-scoped so the singleton instance and the render cache survive
// MarkdownPreview being recreated when switching view modes.
let mermaidInstance: typeof Mermaid | null = null
let mermaidLoading: Promise<typeof Mermaid> | null = null

// Cache rendered SVGs by diagram source so unchanged diagrams are not
// re-rendered on every keystroke.
const mermaidSvgCache = new Map<string, string>()

async function getMermaid(): Promise<typeof Mermaid> {
  if (mermaidInstance) return mermaidInstance
  if (!mermaidLoading) {
    mermaidLoading = import('mermaid').then(({ default: m }) => {
      m.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' })
      mermaidInstance = m
      return m
    })
  }
  return mermaidLoading
}

/**
 * Render every unrendered `.mermaid` block inside `previewEl`.
 * Extracted from MarkdownPreview; returns the render function.
 */
export function useMermaid() {
  async function renderMermaid(previewEl: HTMLElement) {
    const nodes = Array.from(previewEl.querySelectorAll<HTMLElement>('.mermaid:not([data-rendered])'))
    if (!nodes.length) return

    const pending: HTMLElement[] = []
    for (const node of nodes) {
      const source = node.textContent ?? ''
      const cached = mermaidSvgCache.get(source)
      if (cached) {
        node.innerHTML = cached
        node.setAttribute('data-rendered', 'true')
      } else {
        node.setAttribute('data-mermaid-source', source)
        pending.push(node)
      }
    }
    if (!pending.length) return

    try {
      const m = await getMermaid()
      await m.run({ nodes: pending })
      for (const node of pending) {
        const source = node.getAttribute('data-mermaid-source') ?? ''
        mermaidSvgCache.set(source, node.innerHTML)
        node.removeAttribute('data-mermaid-source')
        node.setAttribute('data-rendered', 'true')
      }
    } catch (e) {
      console.warn('Mermaid render error:', e)
    }
  }

  return { renderMermaid }
}
