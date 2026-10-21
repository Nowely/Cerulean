// Bodies (v23): a record's or a page's short document, stored as the editor's JSON (ProseMirror). Everything here
// reads that JSON without the editor, so search, «Связано», export and the static view work before Tiptap loads.
import type { BodyDoc, BodyMark, BodyNode, Id } from './types'
import { capitalize, fold } from './text'

/** Something that has a body: a record or a page. `note` is the plain «Заметка» from before v23 */
export interface HasBody {
  body?: BodyDoc | null
  note?: string
}

/** Whose body it is */
export interface BodyOwner {
  kind: 'record' | 'page'
  id: Id
}

/** How a mention reads: the live name of what it points at, or the name it had when it was made */
export type NameOf = (id: Id, label?: string) => string

export const plainName: NameOf = (_id, label) => label ?? ''

/** A note from before v23 reads as a body: one paragraph per line (no migration step) */
export function noteDoc(note: string): BodyDoc | null {
  const lines = note.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return null
  return { type: 'doc', content: lines.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) }
}

export function bodyOf(x: HasBody | null | undefined): BodyDoc | null {
  if (!x) return null
  if (x.body !== undefined && x.body !== null) return x.body
  return x.note ? noteDoc(x.note) : null
}

/** Nothing worth keeping: no text, no mention, no divider */
export function isEmptyDoc(doc: BodyDoc | null | undefined): boolean {
  if (!doc) return true
  const full = (n: BodyNode): boolean =>
    (n.type === 'text' && !!n.text?.trim()) || n.type === 'mention' || n.type === 'horizontalRule' || (n.content ?? []).some(full)
  return !full(doc)
}

export type LineKind = 'p' | 'h' | 'ul' | 'ol' | 'q' | 'hr'

/** A body read as lines: each paragraph, heading, list item or quoted paragraph is one line */
export interface Line {
  kind: LineKind
  /** Nesting of lists (0 at the top) */
  depth: number
  /** The number of a numbered list item */
  n?: number
  inline: BodyNode[]
}

export function linesOf(doc: BodyDoc | null | undefined): Line[] {
  const out: Line[] = []
  const walk = (nodes: BodyNode[], ctx: { kind: LineKind, depth: number }) => {
    for (const node of nodes) {
      switch (node.type) {
        case 'paragraph':
          out.push({ kind: ctx.kind, depth: ctx.depth, inline: node.content ?? [] })
          break
        case 'heading':
          out.push({ kind: 'h', depth: 0, inline: node.content ?? [] })
          break
        case 'horizontalRule':
          out.push({ kind: 'hr', depth: 0, inline: [] })
          break
        case 'blockquote':
          walk(node.content ?? [], { kind: 'q', depth: ctx.depth })
          break
        case 'bulletList':
        case 'orderedList': {
          const kind: LineKind = node.type === 'bulletList' ? 'ul' : 'ol'
          const depth = ctx.kind === 'ul' || ctx.kind === 'ol' ? ctx.depth + 1 : 0
          let n = Number(node.attrs?.start ?? 1) || 1
          for (const item of node.content ?? []) {
            const first = out.length
            walk(item.content ?? [], { kind, depth })
            if (kind === 'ol' && out[first]) out[first]!.n = n
            n++
          }
          break
        }
        default:
          if (node.content) walk(node.content, ctx)
      }
    }
  }
  walk(doc?.content ?? [], { kind: 'p', depth: 0 })
  return out
}

/** The text of a line, a mention read as its name */
export function inlineText(inline: BodyNode[], name: NameOf = plainName): string {
  return inline.map(n => n.type === 'mention' ? mentionName(n, name) : n.type === 'text' ? n.text ?? '' : '').join('')
}

export function mentionName(node: BodyNode, name: NameOf = plainName): string {
  const id = String(node.attrs?.id ?? '')
  const label = typeof node.attrs?.label === 'string' ? node.attrs.label : undefined
  return name(id, label) || label || ''
}

/** The text of a body, a line per line */
export function docText(doc: BodyDoc | null | undefined, name: NameOf = plainName): string {
  return linesOf(doc).map(l => inlineText(l.inline, name)).filter(Boolean).join('\n')
}

/** The first words of a body, for the «Заметка к странице» row */
export function firstWords(text: string, n = 6): string {
  const words = text.split(/\s+/).filter(Boolean)
  return words.slice(0, n).join(' ')
}

/** What a body mentions, each once, in order */
export function mentionIds(doc: BodyDoc | null | undefined): Id[] {
  const out: Id[] = []
  const walk = (nodes: BodyNode[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type === 'mention') {
        const id = String(n.attrs?.id ?? '')
        if (id && !out.includes(id)) out.push(id)
      }
      walk(n.content)
    }
  }
  walk(doc?.content)
  return out
}

/** The sentence of `text` that holds position `at` */
export function sentence(text: string, at: number): string {
  const re = /[^.!?…]+[.!?…]*\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (at < m.index + m[0].length) return m[0].trim()
  }
  return text.trim()
}

/**
 * Why a body mentions `id`: the sentence around its first mention, shown in «Связано» of the other side. A mention that
 * is a sentence on its own gives its whole line, so the reason is never just the name
 */
export function mentionReason(doc: BodyDoc | null | undefined, id: Id, name: NameOf = plainName): string {
  for (const line of linesOf(doc)) {
    const text = inlineText(line.inline, name)
    let pos = 0
    for (const n of line.inline) {
      const own = n.type === 'mention' ? mentionName(n, name) : n.type === 'text' ? n.text ?? '' : ''
      if (n.type === 'mention' && String(n.attrs?.id ?? '') === id) {
        const why = sentence(text, pos)
        return why === own ? text.trim() : why
      }
      pos += own.length
    }
  }
  return ''
}

const sameMarks = (a: BodyMark[] | undefined, b: BodyMark[] | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

/** Adjacent text nodes with the same marks become one */
function joinText(nodes: BodyNode[]): BodyNode[] {
  const out: BodyNode[] = []
  for (const n of nodes) {
    const last = out[out.length - 1]
    if (n.type === 'text' && !n.text) continue
    if (last && last.type === 'text' && n.type === 'text' && sameMarks(last.marks, n.marks)) out[out.length - 1] = { ...last, text: (last.text ?? '') + (n.text ?? '') }
    else out.push(n)
  }
  return out
}

/** Every mention of `id` turned back into plain words: the link it made goes, the words stay */
export function unmention(doc: BodyDoc, id: Id, name: NameOf = plainName): BodyDoc {
  const walk = (node: BodyNode): BodyNode => {
    if (!node.content) return node
    let hit = false
    const content = node.content.map((n) => {
      if (n.type === 'mention' && String(n.attrs?.id ?? '') === id) {
        hit = true
        return { type: 'text', text: mentionName(n, name) } as BodyNode
      }
      return walk(n)
    })
    return { ...node, content: hit ? joinText(content) : content }
  }
  return walk(doc) as BodyDoc
}

/** Mentions point at what their ids became (an import with ids taken here); a mention of something not brought goes to words */
export function remapMentions(doc: BodyDoc, to: (id: Id) => Id | undefined): BodyDoc {
  const walk = (node: BodyNode): BodyNode => {
    if (node.type === 'mention') {
      const id = to(String(node.attrs?.id ?? ''))
      return id ? { ...node, attrs: { ...node.attrs, id } } : { type: 'text', text: mentionName(node) }
    }
    return node.content ? { ...node, content: joinText(node.content.map(walk)) } : node
  }
  return walk(doc) as BodyDoc
}

/** Export: the body as Markdown, a mention as [[Name]]; items of one list stay on consecutive lines */
export function bodyMarkdown(doc: BodyDoc | null | undefined, name: NameOf = plainName): string {
  const lines = linesOf(doc)
  const inline = (nodes: BodyNode[]) => nodes.map((n) => {
    if (n.type === 'mention') return `[[${mentionName(n, name)}]]`
    if (n.type !== 'text') return ''
    let t = n.text ?? ''
    const marks = n.marks ?? []
    if (marks.some(m => m.type === 'bold')) t = `**${t}**`
    if (marks.some(m => m.type === 'italic')) t = `*${t}*`
    const link = marks.find(m => m.type === 'link')
    if (link?.attrs?.href) t = `[${t}](${link.attrs.href})`
    return t
  }).join('')
  let out = ''
  lines.forEach((l, i) => {
    const t = inline(l.inline)
    const pad = '  '.repeat(l.depth)
    const text = { p: t, h: `## ${t}`, ul: `${pad}- ${t}`, ol: `${pad}${l.n ?? 1}. ${t}`, q: `> ${t}`, hr: '---' }[l.kind]
    const prev = lines[i - 1]
    const tight = !!prev && (l.kind === 'ul' || l.kind === 'ol' || l.kind === 'q') && (prev.kind === l.kind || ((prev.kind === 'ul' || prev.kind === 'ol') && (l.kind === 'ul' || l.kind === 'ol')))
    out += (i ? (tight ? '\n' : '\n\n') : '') + text
  })
  return out
}

export interface Snippet {
  pre: string
  mid: string
  post: string
}

/** A one-line snippet around `q` for Поиск: from a word before the match («…» when cut), the match, the rest */
export function snippet(text: string, q: string): Snippet | null {
  const query = q.trim()
  if (!query) return null
  const k = fold(text).indexOf(fold(query))
  if (k < 0) return null
  let from = Math.max(0, k - 24)
  if (from > 0) {
    const sp = text.indexOf(' ', from)
    if (sp >= 0 && sp < k) from = sp + 1
  }
  return { pre: (from > 0 ? '…' : '') + text.slice(from, k), mid: text.slice(k, k + query.length), post: text.slice(k + query.length) }
}

/** The body as one line of text, for search and snippets */
export function searchText(x: HasBody, name: NameOf = plainName): string {
  return docText(bodyOf(x), name).replace(/\n/g, ' ')
}

// ---------- «Сделать подпунктом» ----------

/**
 * Where the line closes up after the selected words leave it. `before` and `after` are the line's text on either side of
 * the selection. A whole sentence takes its full stop with it, no space is left before punctuation, and words at the
 * start of the line leave the next one capitalised. Returns how many characters go at the end of `before` and at the
 * start of `after`, what goes between, and whether the first letter left after is capitalised.
 */
export function closeUp(before: string, after: string): { cutBefore: number, cutAfter: number, join: string, capital: boolean } {
  const lead = !before.trim()
  let rest = after
  if (lead || /[.!?…]\s*$/.test(before)) rest = rest.replace(/^\s*[.!?…]+/, '')
  if (lead) rest = rest.replace(/^[\s,;:]+/, '')
  const restTrim = rest.replace(/^\s+/, '')
  const cutAfter = after.length - restTrim.length
  const kept = lead ? '' : before.replace(/\s+$/, '')
  const cutBefore = before.length - kept.length
  const join = !kept || !restTrim || /^[,.;:!?…)]/.test(restTrim) ? '' : ' '
  return { cutBefore, cutAfter, join, capital: lead && !!restTrim }
}

/** The subitem the selected words make: plain words, the first letter capitalised, no punctuation at the ends */
export function subText(selected: string): string {
  return capitalize(selected.replace(/\s+/g, ' ').replace(/^[\s,;:.!?…]+|[\s,;:.!?…]+$/g, ''))
}

// ---------- «@»: what to offer ----------

export interface MentionTarget {
  id: Id
  kind: 'record' | 'page'
  name: string
  done?: boolean
  /** A record's page */
  pageId?: Id
  /** A page: last opened */
  openedAt?: number
}

const WORD = /[^0-9a-zа-яё]+/

/**
 * Up to `limit` things to mention. Without a query: records and pages whose names share a word with the record (or page)
 * and the line, records on pages named so, those pages, then what it is linked to already, then pages opened lately.
 * With a query: names that start with it, then names with a word that starts with it (open records, then pages)
 */
export function mentionOptions(opts: {
  query: string
  context: string
  records: MentionTarget[]
  pages: MentionTarget[]
  linked: Id[]
  limit?: number
}): MentionTarget[] {
  const limit = opts.limit ?? 3
  const out: MentionTarget[] = []
  const push = (x: MentionTarget | undefined) => {
    if (x && out.length < limit && !out.some(y => y.id === x.id)) out.push(x)
  }
  const q = fold(opts.query.trim())
  if (q) {
    const score = (x: MentionTarget) => {
      const n = fold(x.name)
      if (n.startsWith(q)) return 0
      return n.split(WORD).some(w => w && w.startsWith(q)) ? 1 : 2
    }
    for (const k of [0, 1]) {
      opts.records.filter(x => !x.done && score(x) === k).forEach(push)
      opts.pages.filter(x => score(x) === k).forEach(push)
    }
    return out
  }
  const words = fold(opts.context).split(WORD).filter(w => w.length > 3).map(w => w.slice(0, 4))
  const near = (name: string) => {
    const n = fold(name)
    return words.some(w => n.includes(w))
  }
  const nearPages = opts.pages.filter(x => near(x.name))
  opts.records.filter(x => near(x.name)).forEach(push)
  opts.records.filter(x => !x.done && nearPages.some(p => p.id === x.pageId)).forEach(push)
  nearPages.forEach(push)
  for (const id of opts.linked) push(opts.records.find(x => x.id === id) ?? opts.pages.find(x => x.id === id))
  ;[...opts.pages].sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0)).forEach(push)
  return out
}
