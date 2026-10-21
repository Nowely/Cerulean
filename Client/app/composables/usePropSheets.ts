// «Свойства» (the list) and «Свойство» (the editor) are one sheet, a dialog on desktop, that several places open:
// the page «⋯», «Новое свойство» in «Настроить вид», «Добавить свойство» on a Доска without columns and
// «Новое свойство…» on a record. It is mounted once (AppShell, PropSheets.vue); this is what they ask it.
import { ref } from 'vue'
import type { Id, PropDef, PropType } from '~/domain/types'
import { useLater } from './useLater'

export interface PropSheet {
  pageId: Id
  /** The list, or the editor of `propId` (null: a new property, nothing is saved before «Создать») */
  screen: 'list' | 'edit'
  propId: Id | null
  /** Where the editor was opened: «Готово» goes back there (the list stays in the same sheet) */
  from: 'list' | 'view' | 'board' | 'record'
  /** A new property starts as this type (Выбор from a Доска) */
  type?: PropType
  /** «Создать»: what the opener does with the new property (switches it on in the view, adds it to the record) */
  onCreate?: (prop: PropDef) => void
  /** Back where it was opened, once the sheet has closed; gets the property made, if any */
  onBack?: (prop: PropDef | null) => void
}

const sheet = ref<PropSheet | null>(null)

export function usePropSheets() {
  const later = useLater()
  function show(s: PropSheet) {
    void later.load()
    sheet.value = s
  }
  return {
    sheet,
    /** The page's «Свойства» */
    list: (pageId: Id) => show({ pageId, screen: 'list', propId: null, from: 'list' }),
    /** The editor of a new property */
    create: (pageId: Id, opts: Pick<PropSheet, 'from' | 'type' | 'onCreate' | 'onBack'>) => show({ pageId, screen: 'edit', propId: null, ...opts })
  }
}
