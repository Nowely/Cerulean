// What a Поиск row says under its name, the same on a phone and in the desktop dialog:
// a page its section («в Личное», none for Входящие), a record its path and date («в Задачи · сегодня, 10:00»).
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { formatDue, isOverdue } from '~/domain/dates'
import { inPlace } from '~/domain/text'

export function useFindRows() {
  const data = useDataStore()
  const now = useNow()

  function pageLine(p: Page): string {
    if (p.kind === 'inbox') return ''
    return inPlace(p.sectionId ? data.sections[p.sectionId]?.name ?? '' : 'Мои страницы')
  }

  function recLine(r: Rec): string {
    const place = data.placeOf(r).title
    const due = r.due ? `${!r.done && isOverdue(r.due, now.value) ? 'было ' : ''}${formatDue(r.due, now.value)}` : ''
    return [place ? inPlace(place) : '', due].filter(Boolean).join(' · ')
  }

  return { pageLine, recLine }
}
