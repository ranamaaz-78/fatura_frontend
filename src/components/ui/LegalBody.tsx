import { Fragment, type ReactNode } from 'react'

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; lines: string[] }

/** Reads the simple format the admin writes in: "## Heading", "- bullet", and paragraphs split by a blank line. */
function parse(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', lines: paragraph })
    if (list.length > 0) blocks.push({ kind: 'list', items: list })
    paragraph = []
    list = []
  }

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()

    if (line === '') {
      flush()
    } else if (line.startsWith('## ')) {
      flush()
      blocks.push({ kind: 'heading', text: line.slice(3).trim() })
    } else if (/^[-*]\s+/.test(line)) {
      if (paragraph.length > 0) flush()
      list.push(line.replace(/^[-*]\s+/, ''))
    } else {
      if (list.length > 0) flush()
      paragraph.push(line)
    }
  }
  flush()

  return blocks
}

/** `**bold**` inside a line; everything else is plain text, so nothing the admin types can inject markup. */
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>,
  )
}

/**
 * A legal page written by the platform admin, drawn as the website's own text. The first paragraph, before any
 * heading, is the introduction.
 */
export function LegalBody({ text }: { text: string }) {
  const blocks = parse(text)
  let seenHeading = false

  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          seenHeading = true
          return (
            <h3 key={index} className="mt-7 mb-0 text-[16px] font-bold text-[#0b1c30]">
              {inline(block.text)}
            </h3>
          )
        }

        if (block.kind === 'list') {
          return (
            <ul key={index} className="mt-2 mb-0 list-disc pl-5 text-[15px] leading-relaxed text-[#434655]">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </ul>
          )
        }

        const intro = !seenHeading && index === 0
        return (
          <p key={index} className={intro ? 'm-0 text-[15.5px] leading-relaxed text-[#434655]' : 'mt-2 mb-0 text-[15px] leading-relaxed text-[#434655]'}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </>
  )
}
