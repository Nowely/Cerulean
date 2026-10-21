// The day a page's calendar has selected. The page's composer writes on it («Запись на вс, 25 окт») and gives a
// record without its own date that day, so the calendar stays where it is (v22, G6). One calendar shows at a time.
import { ref } from 'vue'
import type { Id } from '~/domain/types'

const day = ref<{ pageId: Id, date: string } | null>(null)

export function useCalendarDay() {
  return day
}
