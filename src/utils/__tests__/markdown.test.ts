// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  parseFrontMatter,
  renderMarkdown,
  extractHeadings,
  parseDocument,
  sanitizeHtml,
} from '../markdown'
import { countWords } from '../../composables/useEditor'

describe('parseFrontMatter', () => {
  it('parses YAML front matter and returns body', () => {
    const src = '---\ntitle: Hello\ntags:\n  - a\n---\n# Body'
    const { meta, body } = parseFrontMatter(src)
    expect(meta).toEqual({ title: 'Hello', tags: ['a'] })
    expect(body.trim()).toBe('# Body')
  })

  it('returns null meta when no front matter', () => {
    const src = '# Just a heading'
    const { meta, body } = parseFrontMatter(src)
    expect(meta).toBeNull()
    expect(body).toBe(src)
  })
})

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).toContain('<p>ok</p>')
    expect(out).not.toContain('script')
  })

  it('strips event handler attributes', () => {
    const out = sanitizeHtml('<img src=x onerror="alert(1)">')
    expect(out).not.toContain('onerror')
  })
})

describe('renderMarkdown', () => {
  it('renders headings with anchor ids', () => {
    const html = renderMarkdown('# Title\n\n## Sub')
    expect(html).toContain('id="user-content-title"')
    expect(html).toContain('href="#user-content-title"')
    expect(html).toContain('<h2')
  })

  it('sanitizes dangerous HTML', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
  })

  it('renders fenced code blocks with copy button and language class', () => {
    const html = renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('copy-btn')
    expect(html).toContain('language-js')
  })
})

describe('extractHeadings / parseDocument', () => {
  it('extracts headings with level, text and id', () => {
    const headings = extractHeadings('# One\n\n## Two Three\n\n### Deep')
    expect(headings).toHaveLength(3)
    expect(headings[0]).toMatchObject({ level: 1, id: 'user-content-one' })
    expect(headings[1].text).toBe('Two Three')
  })

  it('parseDocument returns html and headings from one parse', () => {
    const { html, headings } = parseDocument('# Hi\n\nhello')
    expect(html).toContain('Hi')
    expect(headings).toHaveLength(1)
  })
})

describe('countWords', () => {
  it('counts CJK characters and latin words', () => {
    expect(countWords('你好 world')).toBe(3)
  })

  it('excludes fenced code blocks', () => {
    expect(countWords('text\n```\ncode code code\n```\n')).toBe(1)
  })

  it('returns 0 for empty content', () => {
    expect(countWords('')).toBe(0)
  })
})
