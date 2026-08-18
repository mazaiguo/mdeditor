// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseDocument } from '../markdown'

// Regression: a real-world doc that uses `---` horizontal rules around
// sections. The old front-matter regex (with /m) treated the first mid-doc
// rule as an opening delimiter, swallowed everything up to the next rule
// (headings + tables) and re-rendered it as a YAML meta table.
const DOC = `# 沈鼓气泡图插件 — 客户资料提供清单

> 编制日期：2026-08-18
> 项目交付截止：**2026-10-31**（距今约 **10 周**）
> 收件对象：沈鼓（图纸 / 工装资料）、QMS 方（接口资料）

---

## 如何使用本文档回复

1. 每项资料均有编号（**M1、M2、…**），回复时**直接引用编号**即可，无需全文摘抄。
2. 各节末尾附**客户回复栏**，可在此文档上直接填写后回传，也可按编号逐条邮件回复。
3. 如时间紧张，请**至少先回复第一节「速查表」中的阻塞项（M3、M4、M5）**，其余可随后补充。
4. 资料请以**电子文件**形式提供（图纸给 \`.dwg\` 原文件、表格给 Excel/CSV 原文件，**不要截图或 PDF**），打包发送。

---

## 速查表

| 编号 | 资料 | 说明 |
| --- | --- | --- |
| M1 | 总装图 | 含气泡层 |
| M2 | 管口表 | Excel |

---
`

describe('mid-document --- regression', () => {
  it('keeps every section, heading and table renderable', () => {
    const { html, headings } = parseDocument(DOC)
    // All three headings survive and feed the TOC
    expect(headings.map(h => h.text)).toEqual([
      '沈鼓气泡图插件 — 客户资料提供清单',
      '如何使用本文档回复',
      '速查表',
    ])
    // The list items are body content, not a front-matter table
    expect(html).toContain('直接引用编号')
    expect(html).not.toContain('fm-table')
    // The table (header row included) renders
    expect(html).toContain('<th>编号</th>')
    expect(html).toContain('<td>M1</td>')
    // Numbered sections still qualify for auto numbering
    expect(parseDocument(DOC).autoNumber).toBe(true)
  })
})
