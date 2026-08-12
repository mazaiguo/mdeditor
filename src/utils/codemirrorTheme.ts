import { EditorView } from '@codemirror/view'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const MONO_FONT = '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, Consolas, monospace'

export function getLightTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      fontFamily: MONO_FONT,
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

export function getDarkTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      fontFamily: MONO_FONT,
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

export const markdownHighlightStyle = HighlightStyle.define([
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

export const darkMarkdownHighlightStyle = HighlightStyle.define([
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

/** Convenience: the syntax-highlighting extension for the active theme. */
export function markdownHighlight(theme: 'light' | 'dark') {
  return syntaxHighlighting(theme === 'dark' ? darkMarkdownHighlightStyle : markdownHighlightStyle)
}
