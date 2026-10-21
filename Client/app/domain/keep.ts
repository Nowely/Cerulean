// Keeping data in a browser that may clear it: when Главная reminds to save a copy
import type { Rec, Settings } from './types'

const MONTH = 30 * 86400000
/** Before the first copy, this many records bring the reminder sooner than a month */
export const COPY_AFTER = 20

/**
 * The row under the sections of Главная. Never once the browser keeps the data for good (`persisted`).
 * After a copy: a month after it. Before any copy: after 20 records, or a month after the first run once there is
 * anything to lose. «Не сейчас» puts it off for a month either way.
 */
export function copyDue(
  s: Pick<Settings, 'copiedAt' | 'copyHiddenAt' | 'startedAt'>,
  records: Rec[],
  now: number,
  persisted: boolean | null
): boolean {
  if (persisted) return false
  if (s.copyHiddenAt && now - s.copyHiddenAt < MONTH) return false
  if (s.copiedAt) return now - s.copiedAt >= MONTH
  const written = records.filter(r => r.addedAt >= s.startedAt).length
  return written >= COPY_AFTER || (written > 0 && now - s.startedAt >= MONTH)
}
