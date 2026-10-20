// Авто against a real model: every line of cases.json filed on the demo pages, as the app would send it, then scored.
// EVAL_KEY=sk-… pnpm eval   (EVAL_PROVIDER=openai|anthropic|openrouter|custom, EVAL_MODEL, EVAL_BASE_URL, EVAL_EXACT=1)
import { readFileSync } from 'node:fs'
import { it } from 'vitest'
import { demo } from '~/domain/seed'
import { askModel, modelOf, type Connection, type ModelResult } from '~/domain/model'
import type { Provider } from '~/domain/types'

interface Expected { text: string, date?: string | null, anyDate?: boolean, time?: string | null, qty?: string, option?: string, notStarts?: string }
interface Case { line: string, kind?: 'question' | 'unclear', page?: string | (string | null)[], items?: Expected[], newPage?: string }

// Noon UTC on Monday 19 Oct 2026 is the same day in every time zone the cases' dates are written for
const NOW = Date.parse('2026-10-19T12:00:00Z')
const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8')) as Case[]
const env = process.env
const conn: Connection = {
  provider: (env.EVAL_PROVIDER ?? 'openai') as Provider,
  apiKey: env.EVAL_KEY ?? '',
  baseUrl: env.EVAL_BASE_URL ?? '',
  modelId: env.EVAL_MODEL ?? '',
  model: env.EVAL_EXACT ? 'exact' : 'fast'
}

const low = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/ё/g, 'е')

/** What is wrong with an answer, empty when nothing is; `tally` counts each check */
function check(c: Case, a: ModelResult, title: (id: string | null) => string | null, tally: Record<string, [number, number]>): string[] {
  const notes: string[] = []
  const count = (k: string, ok: boolean, note: string) => {
    const t = tally[k] ??= [0, 0]
    t[1]++
    if (ok) t[0]++
    else notes.push(note)
  }
  const page = title(a.pageId)
  const pages = c.page === undefined ? [null] : ([] as (string | null)[]).concat(c.page)
  const want = c.kind ?? 'record'
  const where = want === 'question'
    ? a.kind === 'question'
    : want === 'unclear'
      ? a.kind === 'unclear' || (a.kind === 'record' && page !== null && pages.includes(page))
      : (a.kind === 'record' && pages.includes(page)) || (a.kind === 'unclear' && pages.includes(null))
  count('where', where, `went ${a.kind}${page ? ` → ${page}` : ''}`)
  if (c.items && a.kind === 'record' && page === pages[0]) {
    if (c.page === 'Продукты') count('split', a.items.length === c.items.length, `${a.items.length} items, want ${c.items.length}`)
    else count('one record', a.items.length === 1, `${a.items.length} items, want 1`)
    for (const e of c.items) {
      const found = a.items.find(x => low(x.text).includes(low(e.text).slice(0, 6)))
      const item = found ?? (a.items.length === 1 ? a.items[0] : undefined)
      if (!item) {
        notes.push(`no item «${e.text}»`)
        continue
      }
      count('text', !!found && !(e.notStarts && low(item.text).startsWith(e.notStarts)), `text «${item.text}»`)
      if ('date' in e) count('date', item.date === e.date, `date ${item.date}, want ${e.date}`)
      else if (item.date && !e.anyDate) count('date', false, `date ${item.date}, want none`)
      if ('time' in e) count('time', item.time === e.time, `time ${item.time}, want ${e.time}`)
      if (e.qty) count('qty', low(item.qty).startsWith(low(e.qty)), `qty ${item.qty}, want ${e.qty}`)
      if (e.option) count('department', item.option === e.option, `«${item.text}» in ${item.option}, want ${e.option}`)
    }
  }
  if (c.newPage && a.kind === 'unclear') count('new page name', low(a.newPageName).includes(low(c.newPage)), `new page «${a.newPageName}», want ${c.newPage}…`)
  return notes
}

it.skipIf(!conn.apiKey)(`files ${cases.length} lines with ${conn.provider}`, async () => {
  const pages = demo(NOW).pages.filter(p => !p.deletedAt)
  const title = (id: string | null) => id ? pages.find(p => p.id === id)?.title ?? `?${id}` : null
  const tally: Record<string, [number, number]> = {}
  const lines: string[] = []
  let clean = 0
  const started = Date.now()
  // Four at a time, in order of the file
  const results: (ModelResult | Error)[] = []
  for (let i = 0; i < cases.length; i += 4) {
    const batch = cases.slice(i, i + 4).map(c => askModel(conn, c.line, pages, NOW).catch((e: Error) => e))
    results.push(...await Promise.all(batch))
  }
  cases.forEach((c, i) => {
    const a = results[i]!
    if (a instanceof Error) {
      lines.push(`✗ ${c.line} — ${a.message}`)
      return
    }
    const notes = check(c, a, title, tally)
    if (!notes.length) clean++
    const got = a.kind === 'record' ? `${title(a.pageId)}: ${a.items.map(x => [x.text, x.date, x.time, x.qty, x.option].filter(Boolean).join(' · ')).join(' | ')}` : `${a.kind}${a.newPageName ? ` «${a.newPageName}»` : ''}`
    lines.push(`${notes.length ? '✗' : '✓'} ${c.line} → ${got}${notes.length ? `  [${notes.join('; ')}]` : ''}`)
  })
  console.log([
    `${modelOf(conn)}: ${clean}/${cases.length} lines clean in ${((Date.now() - started) / 1000).toFixed(0)} s`,
    Object.entries(tally).map(([k, [ok, n]]) => `${k} ${ok}/${n}`).join(', '),
    '',
    ...lines
  ].join('\n'))
}, 600_000)
