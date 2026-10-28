// The places a record can be written or moved to: Входящие, then the pages as Главная lists them (Избранное, Мои страницы,
// the sections). Never Сегодня or a page that only collects from others: nothing is filed there
import { computed, type ComputedRef } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { onlyCollects } from '~/domain/collect'

export function usePlaces(): ComputedRef<Page[]> {
  const data = useDataStore()
  return computed(() => {
    const order = [
      data.inbox,
      ...data.favorites.flatMap(f => f.kind === 'page' ? [f.page] : []),
      ...data.recentlyMade,
      ...data.sectionList.flatMap(s => data.livePages.filter(p => p.sectionId === s.id))
    ]
    return order.filter((p, i) => order.indexOf(p) === i && (p.kind === 'inbox' || (p.kind === 'page' && !onlyCollects(p))))
  })
}
