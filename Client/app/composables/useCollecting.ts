// The view a full page shows while it collects records from other pages (v24, И10). The page's composer reads it:
// its chip is «Авто» (or the one page the view collects from), a record without a day of its own gets the filter's
// first day, and the line above the pill says so before anything is typed. One page is open at a time.
import { ref } from 'vue'
import type { Id } from '~/domain/types'

const current = ref<{ pageId: Id, viewId: Id } | null>(null)

export function useCollecting() {
  return current
}
