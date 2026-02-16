import { describe, expect, it } from 'vitest'
import { formatDate, formatTime, generateId, isDueOverdue, isDueSoon, relativeTime, twJoin } from '~/utils'

describe('utils', () => {
  it('joins classes', () => {
    expect(twJoin('a', false, 'b', null, undefined, 'c')).toBe('a b c')
  })

  it('generates stable prefixed ids', () => {
    const id = generateId('task')
    expect(id.startsWith('task')).toBe(true)
  })

  it('formats relative time and absolute dates', () => {
    const now = new Date().toISOString()
    const weekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()

    expect(relativeTime(now)).toBe('just now')
    expect(relativeTime(weekAgo).length).toBeGreaterThan(0)
  })

  it('formats time and date strings', () => {
    const ts = new Date().toISOString()
    expect(formatTime(ts)).toContain(':')
    expect(typeof formatDate(ts)).toBe('string')
  })

  it('detects overdue and due-soon tasks', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
    const far = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString()

    expect(isDueOverdue(past)).toBe(true)
    expect(isDueSoon(soon)).toBe(true)
    expect(isDueSoon(far)).toBe(false)
  })
})
