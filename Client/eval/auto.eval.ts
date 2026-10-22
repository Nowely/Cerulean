// Авто against a real model: every line of cases.json filed on the demo pages (or the first run's, `"on": "first"`),
// as the app would send it, then scored. Each record is filed on its own page (main flow, item 23).
// EVAL_KEY=sk-… pnpm eval   (EVAL_PROVIDER=openai|anthropic|openrouter|custom, EVAL_MODEL, EVAL_BASE_URL, EVAL_EXACT=1)
import { readFileSync } from 'node:fs'
import { it } from 'vitest'
import { demo, firstRun } from '~/domain/seed'
import { newPage } from '~/domain/factory'
import { askModel, modelOf, type Connection, type ModelResult } from '~/domain/model'
import { onlyCollects } from '~/domain/collect'
import type { Page, Provider } from '~/domain/types'

type Where = string | null | (string | null)[]
/** A record the line should give; `page` overrides the line's, `body` is the start of its text */
interface Expected { text: string, page?: Where, body?: string, date?: string | null, anyDate?: boolean, time?: string | null, qty?: string, option?: string, notStarts?: string }
/**
 * A line and where its records go: `page` is the place, or the places that are all fine, with null for Входящие.
 * `unclear` means no page clearly fits: Входящие or a listed page. `on: "first"` files on the first run's pages,
 * with `extra` pages the person made.
 */
interface Case { line: string, kind?: 'question' | 'unclear', page?: Where, items?: Expected[], on?: 'first', extra?: string[] }

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
  const places = (w: Where | undefined) => w === undefined ? [null] : ([] as (string | null)[]).concat(w)
  if (c.kind === 'question' || a.kind === 'question') {
    count('question', (c.kind === 'question') === (a.kind === 'question'), c.kind === 'question' ? `filed ${a.items.length} records` : 'read as a question')
    return notes
  }
  // Every record on a page the line allows: its own when the case names one
  for (const item of a.items) {
    const want = c.items?.find(e => low(item.text).includes(low(e.text).slice(0, 6)))
    count('where', places(want && 'page' in want ? want.page : c.page).includes(title(item.pageId)), `«${item.text}» → ${title(item.pageId) ?? 'Входящие'}`)
  }
  if (!c.items) return notes
  if (c.items.length > 1) count('split', a.items.length === c.items.length, `${a.items.length} records, want ${c.items.length}`)
  else count('one record', a.items.length === 1, `${a.items.length} records, want 1`)
  for (const e of c.items) {
    const found = a.items.find(x => low(x.text).includes(low(e.text).slice(0, 6)))
    const item = found ?? (a.items.length === 1 ? a.items[0] : undefined)
    if (!item) {
      notes.push(`no record «${e.text}»`)
      continue
    }
    count('text', !!found && !(e.notStarts && low(item.text).startsWith(e.notStarts)), `text «${item.text}»`)
    if (e.body) count('note', low(item.note).startsWith(low(e.body)), `«${item.text}» note «${item.note}», want «${e.body}…»`)
    if ('date' in e) count('date', item.date === e.date, `date ${item.date}, want ${e.date}`)
    else if (item.date && !e.anyDate) count('date', false, `date ${item.date}, want none`)
    if ('time' in e) count('time', item.time === e.time, `time ${item.time}, want ${e.time}`)
    if (e.qty) count('qty', low(item.qty).startsWith(low(e.qty)), `qty ${item.qty}, want ${e.qty}`)
    if (e.option) count('department', item.option === e.option, `«${item.text}» in ${item.option}, want ${e.option}`)
  }
  return notes
}

/** The pages a line is filed on, as the app sends them (no page that only collects): the demo's, or the first run's */
const targets = (pages: Page[]) => pages.filter(p => !p.deletedAt && !onlyCollects(p))
const demoPages = targets(demo(NOW).pages)
const firstPages = targets(firstRun(NOW).pages)
const own = new Map<string, Page>()
const pagesFor = (c: Case) => c.on !== 'first'
  ? demoPages
  : [...firstPages, ...(c.extra ?? []).map(t => own.get(t) ?? own.set(t, newPage({ title: t }, NOW)).get(t)!)]

it.skipIf(!conn.apiKey)(`files ${cases.length} lines with ${conn.provider}`, async () => {
  const all = [...demoPages, ...firstPages, ...cases.flatMap(pagesFor)]
  const title = (id: string | null) => id ? all.find(p => p.id === id)?.title ?? `?${id}` : null
  const tally: Record<string, [number, number]> = {}
  const lines: string[] = []
  let clean = 0
  const started = Date.now()
  // Four at a time, in order of the file
  const results: (ModelResult | Error)[] = []
  for (let i = 0; i < cases.length; i += 4) {
    const batch = cases.slice(i, i + 4).map(c => askModel(conn, c.line, pagesFor(c), NOW).catch((e: Error) => e))
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
    const got = a.kind === 'record' ? a.items.map(x => `${[x.text, x.note, x.date, x.time, x.qty, x.option].filter(Boolean).join(' · ')} → ${title(x.pageId) ?? 'Входящие'}`).join(' | ') : a.kind
    lines.push(`${notes.length ? '✗' : '✓'} ${c.line} → ${got}${notes.length ? `  [${notes.join('; ')}]` : ''}`)
  })
  console.log([
    `${modelOf(conn)}: ${clean}/${cases.length} lines clean in ${((Date.now() - started) / 1000).toFixed(0)} s`,
    Object.entries(tally).map(([k, [ok, n]]) => `${k} ${ok}/${n}`).join(', '),
    '',
    ...lines
  ].join('\n'))
}, 600_000)
