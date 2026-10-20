// Actions on records with the one-tap fix: deleting shows a toast with «Отменить»
import type { Id, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useJournalStore } from '~/stores/journal'
import { count, RECORD_FORMS } from '~/domain/text'
import { useNotify } from './useNotify'

export function useRecordActions() {
  const data = useDataStore()
  const ui = useUiStore()
  const journal = useJournalStore()
  const notify = useNotify()

  function remove(ids: Id[]) {
    data.removeRecords(ids)
    notify(ids.length === 1 ? 'Запись в корзине' : `${count(ids.length, RECORD_FORMS)} в корзине`, { label: 'Отменить', run: () => data.restoreRecords(ids) })
  }

  /** «Переместить»: pick a page; a record waiting in Входящие also settles its Уточнение in Чат */
  function move(ids: Id[]) {
    const first = data.records[ids[0]!]
    if (!first) return
    const from = first.pageId
    ui.pick({
      title: ids.length === 1 ? `Переместить «${first.text}»` : `Переместить ${count(ids.length, RECORD_FORMS)}`,
      current: from,
      run: (choice) => {
        const target = 'pageId' in choice ? data.pages[choice.pageId] : data.createPage({ title: choice.newPage })
        if (!target) return
        for (const id of ids) {
          if (data.records[id]?.tags.includes('clarify')) journal.chooseForRecord(id, { pageId: target.id })
        }
        data.moveRecords(ids.filter(id => data.records[id]?.pageId !== target.id), target.id)
        notify(`Перемещено в ${target.title || 'Без названия'}`, { label: 'Отменить', run: () => data.moveRecords(ids, from, { teach: false }) })
      }
    })
  }

  async function copy(rec: Rec) {
    try {
      await navigator.clipboard.writeText(rec.text)
      notify('Текст скопирован', undefined, 3000)
    } catch {
      notify('Не удалось скопировать', undefined, 3000)
    }
  }

  function favorite(rec: Rec) {
    data.toggleFavorite({ kind: 'record', id: rec.id })
    notify(rec.favorite === null ? 'Убрано из избранного' : 'Добавлено в избранное', undefined, 3000)
  }

  return { remove, move, copy, favorite }
}
