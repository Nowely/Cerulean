// «@» in the composer (v24, items 12 and 13): a name picked after «@» is a chip in the field, and the record it makes keeps
// it as plain words, «Позвонить @Стоматолог», with a link to Стоматолог. That «@name» is the mention marker: a rename of
// Стоматолог follows in the title, and export writes it as [[Стоматолог]]. A typed «@word» with no link is left alone.
// The rules both platforms share (shared/logic.js: retitle, mdTitle, menLinks), without Vue or the editor.
import type { BodyDoc, BodyNode, Id } from './types'
import { mentionName, plainName, type MentionTarget, type NameOf } from './body'

/** The «@» row while it is open: the query typed after «@», up to three names, the one Enter takes (marked on desktop) */
export interface FieldMention {
  query: string
  items: MentionTarget[]
  hi: number
}

/** Something a line links to, with its live name */
export interface Named {
  id: Id
  name: string
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** «@name» as a whole: «@Кот» is not the start of «@Котик» */
const marker = (name: string, flags = 'gu') => new RegExp(`@${escape(name)}(?![\\p{L}\\p{N}])`, flags)

/** A rename of what a title names after «@» follows in the title; the caller checks that the title links to it */
export function retitle(text: string, oldName: string, newName: string): string {
  if (!oldName || oldName === newName) return text
  return text.replace(marker(oldName), () => `@${newName}`)
}

/** Export: each linked «@name» in a title is written as [[name]], as a mention in a body is (longest names first) */
export function mdTitle(text: string, names: string[]): string {
  return [...names].filter(Boolean).sort((a, b) => b.length - a.length).reduce((t, n) => t.replace(marker(n), () => `[[${n}]]`), text)
}

/** The links a title holds with their marker: one line, several records, each links only to the names in its own text */
export function menLinks<T extends Named>(text: string, links: T[]): T[] {
  return links.filter(l => !!l.name && marker(l.name, 'iu').test(text))
}

/** The composer's words: a chip reads «@Name», each paragraph is a line */
export function fieldText(doc: BodyDoc | null | undefined, name: NameOf = plainName): string {
  return (doc?.content ?? []).map(p => (p.content ?? []).map(n => n.type === 'mention' ? `@${mentionName(n, name)}` : n.text ?? '').join('')).join('\n')
}

/** One line of the field as inline nodes: each «@Name» of a link is its chip again, the rest plain text */
export function inlineOf(line: string, links: Named[]): BodyNode[] {
  const named = links.filter(l => l.name).sort((a, b) => b.name.length - a.name.length)
  if (!named.length) return line ? [{ type: 'text', text: line }] : []
  const re = new RegExp(named.map(l => `@${escape(l.name)}(?![\\p{L}\\p{N}])`).join('|'), 'gu')
  const out: BodyNode[] = []
  let at = 0
  for (const m of line.matchAll(re)) {
    const link = named.find(l => m[0] === `@${l.name}`)!
    if (m.index > at) out.push({ type: 'text', text: line.slice(at, m.index) })
    out.push({ type: 'mention', attrs: { id: link.id, label: link.name, mentionSuggestionChar: '@' } })
    at = m.index + m[0].length
  }
  if (at < line.length) out.push({ type: 'text', text: line.slice(at) })
  return out
}

/** The field's content from its words («Отменить», a dictation, a draft put back): a paragraph per line */
export function fieldDoc(text: string, links: Named[]): BodyDoc {
  return {
    type: 'doc',
    content: text.split('\n').map((line) => {
      const content = inlineOf(line, links)
      return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
    })
  }
}
