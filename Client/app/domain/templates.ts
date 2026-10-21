// Starting points for a page. After a template is applied the page is an ordinary page.
import type { Glyph, Layout, Page, PageColor, PropDef, TemplateKey, ViewDef } from './types'
import { uid } from './ids'

export const RECORD_NOUN: Page['noun'] = ['запись', 'записи', 'записей']

export interface Template {
  key: TemplateKey
  name: string
  glyph: Glyph
  color: PageColor
  description: string
  hasDone: boolean
  noun: Page['noun']
  props: () => PropDef[]
  views: (props: PropDef[]) => ViewDef[]
}

/** «Как показывать», as a view's own name and in lower case after it («Купить · список») */
export const LAYOUT_NAMES: Record<Layout, string> = { list: 'Список', board: 'Доска', table: 'Таблица', calendar: 'Календарь' }

/** A new view is named after its type; a second one of a type is «Список 2» (v22, U14) */
export function nameForLayout(views: ViewDef[], layout: Layout, except?: string): string {
  const base = LAYOUT_NAMES[layout]
  const taken = new Set(views.filter(v => v.id !== except).map(v => v.name))
  let n = 1
  while (taken.has(n === 1 ? base : `${base} ${n}`)) n++
  return n === 1 ? base : `${base} ${n}`
}

export function listView(name: string, patch: Partial<ViewDef> = {}): ViewDef {
  return { id: uid('v'), name, layout: 'list', filter: [], groupBy: null, sort: 'manual', shown: ['due'], ...patch }
}

/** «Список» shows what is left, «Готово» what is done; a page without «Готово» shows everything */
export function defaultViews(hasDone: boolean): ViewDef[] {
  if (!hasDone) return [listView('Список')]
  return [
    listView('Список', { filter: [{ field: 'done', op: 'is', value: false }] }),
    listView('Готово', { filter: [{ field: 'done', op: 'is', value: true }] })
  ]
}

export const DEPARTMENTS = ['Хлеб и выпечка', 'Молочное', 'Овощи и фрукты', 'Мясо и рыба', 'Бакалея', 'Бытовая химия', 'Прочее']
/** Option dots of the departments in the property editor, as the mockups colour them */
const DEPARTMENT_COLORS: PageColor[] = ['yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'gray']

export function shoppingProps(): PropDef[] {
  return [
    { id: uid('f'), name: 'Количество', type: 'text' },
    { id: uid('f'), name: 'Отдел', type: 'select', options: DEPARTMENTS.map((name, i) => ({ id: uid('o'), name, color: DEPARTMENT_COLORS[i] })) }
  ]
}

/** The four starters, in the same order on first run and on a new page */
export const TEMPLATES: Template[] = [
  {
    key: 'shop',
    name: 'Покупки',
    glyph: 'basket',
    color: 'green',
    description: 'что купить: еда, бытовое',
    hasDone: true,
    noun: ['купить', 'купить', 'купить'],
    props: shoppingProps,
    views: props => [
      listView('Купить', {
        filter: [{ field: 'done', op: 'is', value: false }],
        groupBy: props.find(p => p.name === 'Отдел')?.id ?? null,
        shown: props.filter(p => p.name === 'Количество').map(p => p.id)
      }),
      listView('Куплено', { filter: [{ field: 'done', op: 'is', value: true }], shown: [] })
    ]
  },
  {
    key: 'todo',
    name: 'Задачи',
    glyph: 'check',
    color: 'blue',
    description: 'дела и сроки',
    hasDone: true,
    noun: ['дело', 'дела', 'дел'],
    props: () => [],
    views: () => [
      listView('Список', { filter: [{ field: 'done', op: 'is', value: false }] }),
      listView('Готово', { filter: [{ field: 'done', op: 'is', value: true }] })
    ]
  },
  {
    key: 'goal',
    name: 'Цели',
    glyph: 'target',
    color: 'pink',
    description: 'цели с подпунктами',
    hasDone: true,
    noun: ['цель', 'цели', 'целей'],
    props: () => [],
    views: () => defaultViews(true)
  },
  {
    key: 'note',
    name: 'Идеи',
    glyph: 'bulb',
    color: 'yellow',
    description: 'мысли, ссылки, черновики',
    hasDone: false,
    noun: ['идея', 'идеи', 'идей'],
    props: () => [],
    views: () => defaultViews(false)
  }
]

export function templateByKey(key: TemplateKey): Template {
  return TEMPLATES.find(t => t.key === key)!
}

/** Fields a template sets on a page; an empty title takes the template's name */
export function applyTemplate(page: Page, key: TemplateKey): Partial<Page> {
  const t = templateByKey(key)
  const props = t.props()
  return {
    template: key,
    title: page.title.trim() ? page.title : t.name,
    glyph: t.glyph,
    color: t.color,
    description: page.description.trim() ? page.description : t.description,
    hasDone: t.hasDone,
    noun: t.noun,
    props,
    views: t.views(props)
  }
}
