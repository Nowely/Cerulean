// Record templates (v24, И9, И7) and «В заметку» (v24, И3): the parts that read and write bodies without the editor.
// A template is a record's body and subitems kept on its page; it is never a record, so nothing that lists records
// (rows, counts, Сегодня, Поиск, «@») reads `page.templates`.
import type { BodyDoc, BodyNode, Id, Page, RecTemplate } from './types'
import { isEmptyDoc } from './body'
import { count } from './text'

const SUB_FORMS = ['подпункт', 'подпункта', 'подпунктов'] as const

/** What a template brings, on its rows: «текст и 3 подпункта», «текст», «3 подпункта», «только название» */
export function templateBrings(t: Pick<RecTemplate, 'body' | 'subs'>): string {
  const parts = [isEmptyDoc(t.body) ? '' : 'текст', t.subs.length ? count(t.subs.length, SUB_FORMS) : ''].filter(Boolean)
  return parts.join(' и ') || 'только название'
}

/** The template with this id and the page it belongs to, among live pages */
export function findTemplate(pages: Page[], id: Id): { page: Page, tpl: RecTemplate } | null {
  for (const page of pages) {
    const tpl = page.templates?.find(t => t.id === id)
    if (tpl) return { page, tpl }
  }
  return null
}

/** A deep copy, so a template and the records made by it never share a body */
export function copyDoc(doc: BodyDoc | null | undefined): BodyDoc | null {
  return doc && !isEmptyDoc(doc) ? JSON.parse(JSON.stringify(doc)) as BodyDoc : null
}

/** The first text of a paragraph's content with a capital letter; mentions and the rest stay as they are */
function capitalFirst(content: BodyNode[]): BodyNode[] {
  const i = content.findIndex(n => n.type !== 'text' || !!n.text?.trim())
  const first = content[i]
  if (!first || first.type !== 'text' || !first.text) return content
  const text = first.text.replace(/^\s+/, '')
  return [...content.slice(0, i), { ...first, text: text.charAt(0).toUpperCase() + text.slice(1) }, ...content.slice(i + 1)]
}

/**
 * «В заметку»: the body with a new paragraph at its end. Typed words come as a string; a paragraph that holds a
 * mention comes as its inline nodes. Only the first letter changes (to a capital)
 */
export function withParagraph(doc: BodyDoc | null, words: string | BodyNode[]): BodyDoc {
  const inline = typeof words === 'string' ? [{ type: 'text', text: words.trim() }] : words
  const paragraph: BodyNode = { type: 'paragraph', content: capitalFirst(inline.filter(n => n.type !== 'text' || n.text)) }
  const blocks = isEmptyDoc(doc) ? [] : [...(doc?.content ?? [])]
  // Empty lines left at the end go: the new paragraph follows the text
  while (blocks.length && blocks.at(-1)!.type === 'paragraph' && isEmptyDoc({ type: 'doc', content: [blocks.at(-1)!] })) blocks.pop()
  return { type: 'doc', content: [...blocks, paragraph] }
}
