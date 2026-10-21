// Demo data from the spec, relative to now: open the app with ?demo on an empty database to see it
import type { Entry, Id, Page, PropDef, Rec, Section } from './types'
import { addDays, dayKey, keyToDate } from './dates'
import { newEntry, newPage, newRecord, newSection, systemPages } from './factory'
import { listView, shoppingProps } from './templates'
import { uid } from './ids'

export interface Dataset {
  pages: Page[]
  records: Rec[]
  sections: Section[]
  entries: Entry[]
}

export function firstRun(now = Date.now()): Dataset {
  const [inbox, today] = systemPages(now)
  today!.favorite = 0
  return { pages: [inbox!, today!], records: [], sections: [], entries: [] }
}

export function demo(now = Date.now()): Dataset {
  const day = dayKey(now)
  /** A moment today (or `shift` days away) at h:m */
  const at = (h: number, m: number, shift = 0) => {
    const d = keyToDate(addDays(day, shift))
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }
  const date = (shift: number) => addDays(day, shift)
  const records: Rec[] = []
  let order = 0
  const add = (page: Page, text: string, extra: Partial<Rec> = {}) => {
    const r = newRecord({ pageId: page.id, text, order: order++, addedAt: at(8, 0, -3), ...extra }, now)
    records.push(r)
    return r
  }

  const [inbox, today] = systemPages(now)
  const home = newSection('Дом', 0)
  const personal = newSection('Личное', 1)

  // Покупки: «Купить» grouped by Отдел, «Запасы» with numbers against a norm, «Куплено»
  const shop = shoppingProps()
  const qty = shop[0]!
  const dept = shop[1]!
  const left: PropDef = { id: uid('f'), name: 'Осталось', type: 'number', unit: 'шт' }
  const norm: PropDef = { id: uid('f'), name: 'Норма', type: 'number', unit: 'шт' }
  left.normProp = norm.id
  const opt = (name: string) => dept.options!.find(o => o.name === name)!.id
  const products = newPage({
    title: 'Покупки',
    glyph: 'basket',
    color: 'green',
    sectionId: home.id,
    order: 0,
    template: 'shop',
    description: 'еда, напитки, бытовая химия',
    noun: ['купить', 'купить', 'купить'],
    props: [qty, dept, left, norm],
    views: [
      listView('Купить', { filter: [{ field: 'done', op: 'is', value: false }, { field: left.id, op: 'empty' }], groupBy: dept.id, shown: [qty.id] }),
      listView('Запасы', { filter: [{ field: left.id, op: 'notEmpty' }], shown: [left.id] }),
      listView('Куплено', { filter: [{ field: 'done', op: 'is', value: true }, { field: left.id, op: 'empty' }], shown: [] })
    ],
    openedAt: at(9, 0),
    seenAt: at(9, 0)
  }, now)

  const tasks = newPage({
    title: 'Задачи',
    glyph: 'check',
    color: 'blue',
    sectionId: personal.id,
    order: 0,
    template: 'todo',
    description: 'дела со сроком: звонки, оплаты, документы',
    noun: ['дело', 'дела', 'дел'],
    views: [
      listView('Список', { filter: [{ field: 'done', op: 'is', value: false }], sort: 'due' }),
      listView('Готово', { filter: [{ field: 'done', op: 'is', value: true }] })
    ],
    openedAt: at(8, 55),
    seenAt: at(8, 55)
  }, now)

  const status: PropDef = {
    id: uid('f'),
    name: 'Статус',
    type: 'select',
    options: ['В процессе', 'Достигнута', 'Отложена'].map(name => ({ id: uid('o'), name }))
  }
  const goals = newPage({
    title: 'Цели',
    glyph: 'target',
    color: 'pink',
    sectionId: personal.id,
    order: 1,
    template: 'goal',
    hasDone: false,
    description: 'цели на год',
    noun: ['цель', 'цели', 'целей'],
    props: [status],
    views: [listView('Список', { shown: [status.id, 'due'] }), listView('По статусу', { layout: 'board', groupBy: status.id })],
    openedAt: at(19, 30, -2),
    seenAt: at(19, 30, -2)
  }, now)

  const ideas = newPage({
    title: 'Идеи',
    glyph: 'bulb',
    color: 'yellow',
    sectionId: personal.id,
    order: 2,
    hasDone: false,
    description: 'идеи и «а что если»',
    noun: ['идея', 'идеи', 'идей'],
    views: [listView('Список')],
    openedAt: at(21, 0, -4),
    seenAt: at(21, 0, -4)
  }, now)

  const books = newPage({
    title: 'Книги',
    glyph: 'book',
    color: 'purple',
    sectionId: personal.id,
    order: 3,
    hasDone: false,
    titles: true,
    description: 'что прочитать',
    noun: ['книга', 'книги', 'книг'],
    views: [listView('Список')],
    openedAt: at(22, 0, -9),
    seenAt: at(22, 0, -9)
  }, now)

  const chores = newPage({
    title: 'Дела по дому',
    glyph: 'home',
    color: 'brown',
    sectionId: home.id,
    order: 1,
    template: 'todo',
    description: 'ремонт, уборка, мастера',
    noun: ['дело', 'дела', 'дел'],
    views: [
      listView('Список', { filter: [{ field: 'done', op: 'is', value: false }], sort: 'due' }),
      listView('Готово', { filter: [{ field: 'done', op: 'is', value: true }] })
    ],
    openedAt: at(18, 10, -1),
    seenAt: at(18, 10, -1)
  }, now)

  inbox!.openedAt = at(9, 3)
  inbox!.seenAt = at(9, 3)
  today!.favorite = 0
  today!.openedAt = at(8, 50)

  // Покупки
  const chat = (h: number, m: number, shift = 0) => ({ via: 'chat' as const, addedAt: at(h, m, shift) })
  const bread = add(products, 'Хлеб', { ...chat(9, 10), values: { [dept.id]: opt('Хлеб и выпечка') } })
  bread.order = -1
  const milk = add(products, 'Молоко', { ...chat(8, 40), values: { [qty.id]: '2 л', [dept.id]: opt('Молочное') } })
  const cheese = add(products, 'Сыр', { ...chat(8, 40), values: { [qty.id]: '300 г', [dept.id]: opt('Молочное') } })
  const eggs = add(products, 'Яйца', {
    ...chat(8, 40),
    values: { [qty.id]: '10 шт', [dept.id]: opt('Молочное') },
    note: 'Брать С0, десяток в картонной упаковке. Если нет, подойдут С1.'
  })
  add(products, 'Взять два десятка, если будет скидка', { parentId: eggs.id, addedAt: at(8, 41) })
  add(products, 'Бананы', { values: { [qty.id]: '1 кг', [dept.id]: opt('Овощи и фрукты') }, addedAt: at(18, 0, -1) })
  add(products, 'Порошок', { values: { [dept.id]: opt('Бытовая химия') }, addedAt: at(18, 1, -1) })
  add(products, 'Кофе в зёрнах', { ...chat(10, 0, -3), done: true, doneAt: at(19, 0, -2), values: { [dept.id]: opt('Бакалея') } })
  add(products, 'Помидоры', { ...chat(10, 0, -4), done: true, doneAt: at(19, 0, -2), values: { [dept.id]: opt('Овощи и фрукты') } })
  for (const [text, n, min] of [['Куриная грудка', 2, 1], ['Яблоки', 0, 3], ['Макароны', 3, 1], ['Туалетная бумага', 1, 2]] as const) {
    add(products, text, { values: { [left.id]: n, [norm.id]: min }, addedAt: at(12, 0, -10) })
  }

  // Задачи
  const dentist = add(tasks, 'Позвонить стоматологу', { ...chat(8, 52), due: { date: date(0), time: '10:00' } })
  add(tasks, 'Оплатить интернет', { due: { date: date(-1) }, addedAt: at(20, 0, -5) })
  const library = add(tasks, 'Вернуть книгу в библиотеку', { due: { date: date(6) }, addedAt: at(20, 5, -5) })
  add(tasks, 'Отправить документы', { done: true, doneAt: at(17, 0, -1), addedAt: at(9, 0, -6) })

  // Цели: «Полумарафон к маю» is a record with its own page, icon and steps
  const marathon = add(goals, 'Полумарафон к маю', {
    ...chat(9, 30, -7),
    glyph: 'flag',
    color: 'pink',
    favorite: 1,
    due: { date: '2027-05-18' },
    values: { [status.id]: status.options![0]!.id },
    note: 'Зачем: вернуть форму и полгода держать регулярность. Три пробежки в неделю, длинная по выходным.\n\nКолено ноет после 8 км, спросить про стельки. Пульс на длинных ниже 150.',
    openedAt: at(7, 30)
  })
  for (const [text, done, due] of [
    ['Пробежать 5 км', true, null],
    ['Пробежать 8 км', true, null],
    ['10 км без остановки', true, null],
    ['Пробежка 6 км', false, { date: date(0), time: '19:00' }],
    ['Записаться на забег', false, { date: addDays(day, 13) }],
    ['Длинная пробежка 14 км', false, null]
  ] as const) {
    add(goals, text, { parentId: marathon.id, done, due: due ? { ...due } : null, addedAt: at(9, 31, -7) })
  }
  add(goals, '24 книги за год', { addedAt: at(9, 40, -7) })

  add(ideas, 'Семейный бюджет в приложении', { addedAt: at(21, 0, -4) })
  const habits = add(books, 'Атомные привычки', { addedAt: at(22, 0, -9) })
  library.links = [habits.id]
  marathon.links = [habits.id]
  const filter = add(chores, 'Поменять фильтр воды', { due: { date: date(2) }, addedAt: at(18, 0, -2) })
  add(chores, 'Вызвать мастера', { addedAt: at(18, 5, -2) })

  // Входящие: two records Авто could not place
  const gift = add(inbox!, 'Подарок маме на др', { ...chat(9, 2), tags: ['clarify'], guesses: [tasks.id, ideas.id, chores.id] })
  const series = add(inbox!, 'Посмотреть тот сериал', { ...chat(22, 15, -1), tags: ['clarify'], guesses: [ideas.id, tasks.id, books.id] })

  // Корзина: a record from Задачи deleted yesterday, a page with its records, a record from Покупки
  add(tasks, 'Позвонить в банк', { addedAt: at(10, 0, -6), deletedAt: at(18, 0, -1) })
  add(products, 'Овсянка', { addedAt: at(10, 0, -9), deletedAt: at(12, 0, -7) })
  const dacha = newPage({
    title: 'Поездка на дачу',
    glyph: 'leaf',
    color: 'green',
    sectionId: home.id,
    order: 2,
    template: 'todo',
    noun: ['дело', 'дела', 'дел'],
    views: [listView('Список')],
    deletedAt: at(19, 0, -5)
  }, now)
  for (const text of ['Взять рассаду', 'Закрыть воду', 'Забрать шланг', 'Купить уголь']) add(dacha, text, { addedAt: at(9, 0, -12) })

  const entries: Entry[] = [
    newEntry({ at: at(22, 15, -1), text: 'посмотреть тот сериал', kind: 'ask', pageId: inbox!.id, recordIds: [series.id], newName: 'Фильмы' }),
    newEntry({ at: at(8, 40), text: 'молоко, яйца, сыр', kind: 'routed', pageId: products.id, recordIds: [milk.id, eggs.id, cheese.id] }),
    newEntry({ at: at(8, 52), text: 'позвонить стоматологу сегодня в 10', kind: 'routed', pageId: tasks.id, recordIds: [dentist.id] }),
    newEntry({ at: at(9, 2), text: 'подарок маме на др', kind: 'ask', pageId: inbox!.id, recordIds: [gift.id], newName: 'Подарки' }),
    newEntry({ at: at(9, 5), text: 'когда менять фильтр воды?', kind: 'found', hits: [filter.id] }),
    newEntry({ at: at(9, 10), text: 'хлеб', kind: 'routed', pageId: products.id, recordIds: [bread.id] })
  ]

  const pages = [inbox!, today!, products, chores, tasks, goals, ideas, books, dacha]
  return { pages, records, sections: [home, personal], entries }
}

/** Ids of pages written to lately, newest first: the fallback guesses for Уточнение */
export function recentPages(entries: Entry[]): Id[] {
  return [...entries].sort((a, b) => b.at - a.at).map(e => e.pageId).filter((id): id is Id => !!id)
}
