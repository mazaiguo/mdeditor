import { downloadBlob } from './download'

export type ExportFormat = 'md' | 'html' | 'pdf' | 'docx'

export interface ExportOptions {
  markdown: string
  html: string
  theme: string
  /** Filename without extension (already trimmed/non-empty). */
  filename: string
}

/** Derive a document title from front-matter `title:` or the first H1, else "document". */
export function getTitleFromMarkdown(md: string): string {
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
    if (titleMatch) return titleMatch[1].trim()
  }
  const h1 = md.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return 'document'
}

/** Collect every stylesheet rule the app has injected (skips cross-origin sheets). */
function collectStyles(): string {
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

/** Build a standalone HTML document that reproduces the preview, with print overrides. */
export function buildFullHtml(title: string, html: string, theme: string): string {
  const styles = collectStyles()
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
<div class="preview-pane theme-${theme}">
${html}
</div>
</body>
</html>`
}

/**
 * Prepare the preview HTML for Word export.
 *
 * html-docx-js-typescript writes the MHT part with
 * `Content-Transfer-Encoding: quoted-printable` but only escapes `=`,
 * leaving raw UTF-8 bytes for CJK characters. Word's strict QP decoder
 * then misreads them and shows mojibake (乱码). Converting every
 * non-ASCII character to an HTML numeric entity keeps the MHT stream
 * pure ASCII and sidesteps the bug entirely.
 *
 * We also strip interactive/UI chrome (SVG buttons, traffic-light dots,
 * line-number gutter, language chips) that Word cannot render and which
 * otherwise leak as stray markup/text into the document.
 *
 * Table borders need special handling: the preview defines them via CSS
 * class selectors and custom properties (var(--table-border)), which
 * Word's altChunk renderer silently ignores, leaving tables borderless.
 * We inline border styles on every table/th/td and add the legacy
 * border="1" attribute so the grid is visible in Word.
 */
function prepareHtmlForDocx(fullHtml: string): string {
  const doc = new DOMParser().parseFromString(fullHtml, 'text/html')

  // Strip interactive UI chrome that Word cannot render
  doc.querySelectorAll(
    '.copy-btn, .collapse-btn, .traffic-lights, .code-file-icon, .code-lang-label, .line-numbers-gutter',
  ).forEach((el) => el.remove())

  // Inline table borders: Word ignores <style> rules that use class
  // selectors and CSS custom properties, so tables would render
  // borderless. The legacy border attribute plus inline styles
  // guarantees a visible grid in the exported document.
  doc.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
    table.setAttribute('border', '1')
    table.setAttribute('cellspacing', '0')
    table.setAttribute('cellpadding', '6')
    table.style.borderCollapse = 'collapse'
    table.style.border = '1px solid #999'
    table.querySelectorAll<HTMLElement>('th, td').forEach((cell) => {
      cell.style.border = '1px solid #999'
      if (cell.tagName === 'TH') {
        cell.style.background = '#7babee'
        cell.style.color = '#ffffff'
      }
    })
  })

  const serialized = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  // eslint-disable-next-line no-control-regex -- intentional: match every non-ASCII byte
  return serialized.replace(/[^\x00-\x7F]/g, (ch) => {
    const code = ch.codePointAt(0)!
    return `&#${code};`
  })
}

function exportPdf(title: string, html: string, theme: string): void {
  const full = buildFullHtml(title, html, theme)
  const win = window.open('', '_blank')
  if (!win) {
    alert('Pop-up was blocked. Please allow pop-ups for this page.')
    return
  }
  win.document.open()
  win.document.write(full)
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
}

async function exportDocx(base: string, html: string, theme: string): Promise<void> {
  try {
    const { default: htmlDocx } = await import('html-docx-js-typescript')
    const prepared = prepareHtmlForDocx(buildFullHtml(base, html, theme))
    const blob = await htmlDocx.asBlob(prepared, {
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

/**
 * Export the document in the requested format. Resolves when the download
 * (or print window) has been triggered. The caller owns UI state (the
 * "exporting" spinner and closing the dialog).
 */
export async function exportDocument(format: ExportFormat, opts: ExportOptions): Promise<void> {
  const base = opts.filename || 'document'
  if (format === 'md') {
    downloadBlob(opts.markdown, `${base}.md`, 'text/markdown')
  } else if (format === 'html') {
    downloadBlob(buildFullHtml(base, opts.html, opts.theme), `${base}.html`, 'text/html')
  } else if (format === 'pdf') {
    exportPdf(base, opts.html, opts.theme)
  } else if (format === 'docx') {
    await exportDocx(base, opts.html, opts.theme)
  }
}
