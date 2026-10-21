// Record templates (v24, И9, И7) and «В заметку» (v24, И3): the helpers and the store
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { bodyOf, docText } from '~/domain/body'
import { copyDoc, findTemplate, templateBrings, withParagraph } from '~/domain/recordTemplates'
import type { BodyDoc } from '~/domain/types'

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const doc = (...content: BodyDoc['content']): BodyDoc => ({ type: 'doc', content })

let n = 0
async function fresh() {
  setActivePinia(createPinia())
  const data = useDataStore()
  const dbName = `templates-${++n}`
  await data.init({ demo: true, dbName })
  return { data, dbName }
}
async function reload(dbName: string) {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ dbName })
  return data
}

/** Встреча as the delta seeds it: a body, three subitems, the first one done */
function meeting(data: ReturnType<typeof useDataStore>) {
  const page = data.livePages.find(p => p.title === 'Задачи')!
  const rec = data.addRecord({ pageId: page.id, text: 'Встреча', due: { date: '2026-10-22' } })
  data.setBody({ kind: 'record', id: rec.id }, doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Повестка' }] }, para('Кто что делает.')))
  const subs = ['Разослать повестку', 'Записать решения', 'Отправить итоги'].map(text => data.addRecord({ pageId: page.id, parentId: rec.id, text }))
  data.updateRecord(subs[0]!.id, { done: true })
  return { page, rec }
}

describe('template helpers', () => {
  it('says what a template brings', () => {
    expect(templateBrings({ body: doc(para('x')), subs: ['a', 'b', 'c'] })).toBe('текст и 3 подпункта')
    expect(templateBrings({ body: doc(para('x')), subs: [] })).toBe('текст')
    expect(templateBrings({ body: null, subs: ['a'] })).toBe('1 подпункт')
    expect(templateBrings({ body: doc(para('')), subs: ['a', 'b', 'c', 'd', 'e'] })).toBe('5 подпунктов')
    expect(templateBrings({ body: null, subs: [] })).toBe('только название')
  })

  it('appends a paragraph with a capital first letter and nothing else changed', () => {
    const before = doc(para('Брать С0.'), para(''), para(''))
    const after = withParagraph(before, '  мама просила ещё перепелиные, если будут.')
    expect(after.content.map(b => docText(doc(b)))).toEqual(['Брать С0.', 'Мама просила ещё перепелиные, если будут.'])
    expect(withParagraph(null, 'первый абзац').content).toEqual([para('Первый абзац')])
    // A paragraph that starts with a mention keeps it as it is
    const mention = { type: 'mention', attrs: { id: 'r1', label: 'Молоко' } }
    expect(withParagraph(null, [mention, { type: 'text', text: ' к омлету' }]).content[0]!.content).toEqual([mention, { type: 'text', text: ' к омлету' }])
    expect(before.content).toHaveLength(3)
  })

  it('copies a body deeply, and an empty one as none', () => {
    const body = doc(para('x'))
    const copy = copyDoc(body)!
    expect(copy).toEqual(body)
    expect(copy.content[0]).not.toBe(body.content[0])
    expect(copyDoc(doc(para('')))).toBeNull()
    expect(findTemplate([], 't1')).toBeNull()
  })
})

describe('record templates in the store', () => {
  it('makes a template from a record: its body and its subitems, unticked; the record stays', async () => {
    const { data, dbName } = await fresh()
    const { page, rec } = meeting(data)
    const made = data.makeTemplate(rec.id)!
    expect(made.updated).toBe(false)
    expect(made.page.id).toBe(page.id)
    const tpl = data.pages[page.id]!.templates![0]!
    expect(tpl).toMatchObject({ name: 'Встреча', subs: ['Разослать повестку', 'Записать решения', 'Отправить итоги'] })
    expect(docText(tpl.body)).toContain('Повестка')
    expect(data.records[rec.id]!.deletedAt).toBeNull()
    expect(data.subitemsOf(rec.id).filter(s => s.done)).toHaveLength(1)
    // Not a record: nothing that lists records sees it
    expect(data.liveRecords.filter(r => r.text === 'Встреча')).toHaveLength(1)
    await data.flush()
    const again = await reload(dbName)
    expect(again.pages[page.id]!.templates).toHaveLength(1)
    expect(again.templateOf(tpl.id)?.tpl.name).toBe('Встреча')
  })

  it('updates the template of the same name, and undo takes exactly that back', async () => {
    const { data } = await fresh()
    const { page, rec } = meeting(data)
    const first = data.makeTemplate(rec.id)!
    data.addRecord({ pageId: page.id, parentId: rec.id, text: 'Обсудить бюджет' })
    const second = data.makeTemplate(rec.id)!
    expect(second.updated).toBe(true)
    expect(second.tpl.id).toBe(first.tpl.id)
    expect(data.pages[page.id]!.templates).toHaveLength(1)
    expect(data.pages[page.id]!.templates![0]!.subs).toHaveLength(4)
    second.undo()
    expect(data.pages[page.id]!.templates![0]!.subs).toHaveLength(3)
    first.undo()
    expect(data.pages[page.id]!.templates).toEqual([])
  })

  it('removes a template and puts it back in its place', async () => {
    const { data } = await fresh()
    const { page, rec } = meeting(data)
    const other = data.addRecord({ pageId: page.id, text: 'Планёрка' })
    const a = data.makeTemplate(rec.id)!.tpl
    const b = data.makeTemplate(other.id)!.tpl
    expect(data.pages[page.id]!.templates!.map(t => t.name)).toEqual(['Встреча', 'Планёрка'])
    const gone = data.removeTemplate(a.id)!
    expect(gone.page.id).toBe(page.id)
    expect(data.pages[page.id]!.templates!.map(t => t.id)).toEqual([b.id])
    gone.undo()
    expect(data.pages[page.id]!.templates!.map(t => t.name)).toEqual(['Встреча', 'Планёрка'])
  })

  it('fills a new record from a template, and edits to the template leave it alone', async () => {
    const { data } = await fresh()
    const { page, rec } = meeting(data)
    const tpl = data.makeTemplate(rec.id)!.tpl
    const made = data.addRecord({ pageId: page.id, text: 'Созвон с Лизой', via: 'manual' })
    data.fillFromTemplate(made.id, tpl.id)
    expect(docText(bodyOf(data.records[made.id]))).toContain('Повестка')
    expect(data.subitemsOf(made.id).map(s => [s.text, s.done])).toEqual([['Разослать повестку', false], ['Записать решения', false], ['Отправить итоги', false]])
    data.updateTemplate(tpl.id, { subs: ['Одно'], body: null })
    data.setBody({ kind: 'template', id: tpl.id }, doc(para('Другое')))
    expect(docText(bodyOf(data.records[made.id]))).toContain('Повестка')
    expect(data.subitemsOf(made.id)).toHaveLength(3)
    // Records made by a deleted template keep their text and subitems
    data.removeTemplate(tpl.id)
    expect(data.subitemsOf(made.id)).toHaveLength(3)
  })

  it('appends a paragraph «В заметку» to a record and to a template', async () => {
    const { data } = await fresh()
    const { rec } = meeting(data)
    data.appendParagraph({ kind: 'record', id: rec.id }, 'разослать до пятницы')
    expect(bodyOf(data.records[rec.id])!.content.at(-1)).toEqual(para('Разослать до пятницы'))
    expect(data.subitemsOf(rec.id)).toHaveLength(3)
    const tpl = data.makeTemplate(rec.id)!.tpl
    data.appendParagraph({ kind: 'template', id: tpl.id }, 'ещё абзац')
    expect(data.templateOf(tpl.id)!.tpl.body!.content.at(-1)).toEqual(para('Ещё абзац'))
  })
})
