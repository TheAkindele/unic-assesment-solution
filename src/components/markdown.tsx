import { memo } from "react"

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderMarkdown(markdown: string): string {
  if (!markdown) return ""
  const codeBlocks: string[] = []
  let working = markdown.replace(/```([\s\S]*?)```/g, (_, code: string) => {
    const index = codeBlocks.length
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`)
    return `@@BLOCK_${index}@@`
  })

  working = escapeHtml(working)
  working = working.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  working = working.replace(/\*(?!\*)([^\n]+?)\*(?!\*)/g, "<em>$1</em>")
  working = working.replace(/`([^`]+)`/g, "<code>$1</code>")

  const paragraphs = working.split(/\n{2,}/).map((paragraph) => {
    const trimmed = paragraph.trim()
    if (!trimmed) return ""
    if (/^[-*]\s+/m.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => /^[-*]\s+/.test(line))
        .map((line) => `<li>${line.replace(/^[-*]\s+/, "")}</li>`)
      return `<ul>${items.join("")}</ul>`
    }
    if (/^\d+\.\s+/m.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => /^\d+\.\s+/.test(line))
        .map((line) => `<li>${line.replace(/^\d+\.\s+/, "")}</li>`)
      return `<ol>${items.join("")}</ol>`
    }
    return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`
  })

  let html = paragraphs.join("")

  codeBlocks.forEach((block, index) => {
    html = html.replace(`@@BLOCK_${index}@@`, block)
  })

  return html
}

interface MarkdownProps {
  content: string
  className?: string
}

export const Markdown = memo(({ content, className }: MarkdownProps) => {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
})

Markdown.displayName = "Markdown"
