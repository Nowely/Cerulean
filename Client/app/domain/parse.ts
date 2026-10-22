// What simple rules can read from a line without a model: dates, quantities, lists, questions
import type { Due } from './types'
import { addDays, dayKey } from './dates'
import { capitalize } from './text'

/**
 * Only an explicit search gives the found card: «найти…», «найди…», «где…», «поиск…», «искать…» (v22, U10).
 * Any other line, a question with «?» included, is written down like everything else.
 */
const SEARCH_START = /^(найти|найди|где|поиск|искать|ищи)(\s|$|[?,:])/i

export function isSearch(text: string): boolean {
  return SEARCH_START.test(text.trim())
}

const QUESTION_START = /^(что|когда|сколько|как|какой|какая|какие|какое|каком|зачем|почему|кто|чем|куда|откуда|есть ли|можно ли|нужно ли|надо ли|был[аио]? ли)(\s|$)/i

/** A question written down («когда менять фильтр?»): its receipt shows records like it, «Похожее в записях» */
export function isQuestion(text: string): boolean {
  const t = text.trim()
  return /\?\s*$/.test(t) || QUESTION_START.test(t)
}

const WEEKDAY_STEMS: [RegExp, number][] = [
  [/^(понедельник|пн)/, 1],
  [/^(вторник|вт)/, 2],
  [/^(сред[ау]|ср)/, 3],
  [/^(четверг|чт)/, 4],
  [/^(пятниц[ау]|пт)/, 5],
  [/^(суббот[ау]|сб)/, 6],
  [/^(воскресенье|вс)/, 0]
]

const MONTH_STEMS = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function monthIndex(word: string): number {
  const w = word.toLowerCase()
  if (/^ма[йя]/.test(w)) return 4
  return MONTH_STEMS.findIndex((s, i) => i !== 4 && w.startsWith(s))
}

const pad = (n: number) => String(n).padStart(2, '0')

/** A run of the typed text the date was read from, as [start, end) in that text */
export type Span = [number, number]

/**
 * Takes what `re` matches out of the text, leaving spaces of the same length, so every position still points into
 * the typed text and the spans can tint the words where they were typed (main flow, item 7)
 */
function strip(text: string, re: RegExp, spans: Span[]): [string, RegExpMatchArray | null] {
  const m = text.match(re)
  if (!m) return [text, null]
  const lead = m[0].length - m[0].trimStart().length
  const start = m.index! + lead
  const end = m.index! + m[0].length
  // The text is padded with one space on each side: positions in the typed text are one less
  spans.push([start - 1, end - 1])
  return [text.slice(0, start) + ' '.repeat(end - start) + text.slice(end), m]
}

/**
 * Finds a due date and time in Russian text and returns the text without them:
 * «позвонить стоматологу сегодня в 10» → «позвонить стоматологу», сегодня 10:00.
 */
export function parseDue(text: string, now: number): { due: Due | null, rest: string } {
  const { due, rest } = readDue(text, now)
  return { due, rest }
}

/** `parseDue` with where the date was typed: the runs of words it was read from, in order */
export function readDue(text: string, now: number): { due: Due | null, rest: string, spans: Span[] } {
  const spans: Span[] = []
  let rest = ` ${text} `
  const today = dayKey(now)
  let date: string | null = null
  let time: string | undefined
  let m: RegExpMatchArray | null

  ;[rest, m] = strip(rest, /\s(до\s+|к\s+)?(сегодня|завтра|послезавтра)(?=[\s,.!]|$)/i, spans)
  if (m) date = addDays(today, { сегодня: 0, завтра: 1, послезавтра: 2 }[m[2]!.toLowerCase() as 'сегодня'] ?? 0)

  if (!date) {
    ;[rest, m] = strip(rest, /\s(до\s+|к\s+|в\s+|во\s+)?(понедельник|вторник|среду|среда|четверг|пятницу|пятница|субботу|суббота|воскресенье|пн|вт|ср|чт|пт|сб|вс)(?=[\s,.!]|$)/i, spans)
    if (m) {
      const word = m[2]!.toLowerCase()
      const target = WEEKDAY_STEMS.find(([re]) => re.test(word))![1]
      const cur = new Date(now).getDay()
      let diff = (target - cur + 7) % 7
      if (diff === 0) diff = 7
      date = addDays(today, diff)
    }
  }

  if (!date) {
    ;[rest, m] = strip(rest, /\s(до\s+|к\s+)?(\d{1,2})[.\s](\d{1,2}|январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[йя]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь]|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)\.?(?:[.\s](\d{4}))?(?=[\s,.!]|$)/i, spans)
    if (m) {
      const day = Number(m[2])
      const mon = /^\d+$/.test(m[3]!) ? Number(m[3]) - 1 : monthIndex(m[3]!)
      if (mon >= 0 && mon < 12 && day >= 1 && day <= 31) {
        const nowD = new Date(now)
        let year = m[4] ? Number(m[4]) : nowD.getFullYear()
        let key = `${year}-${pad(mon + 1)}-${pad(day)}`
        if (!m[4] && key < today) {
          year += 1
          key = `${year}-${pad(mon + 1)}-${pad(day)}`
        }
        date = key
      }
    }
  }

  if (!date) {
    ;[rest, m] = strip(rest, /\sчерез\s+(\d+|день|неделю|месяц)(?:\s+(дн(?:я|ей)|недел[иью]|месяц(?:а|ев)?))?(?=[\s,.!]|$)/i, spans)
    if (m) {
      const n = /^\d+$/.test(m[1]!) ? Number(m[1]) : 1
      const unit = (m[2] ?? m[1]!).toLowerCase()
      date = addDays(today, unit.startsWith('нед') ? n * 7 : unit.startsWith('мес') ? n * 30 : n)
    }
  }

  let hour: string | undefined
  let min: string | undefined
  let part = ''
  ;[rest, m] = strip(rest, /\s(?:в|к|до)\s+(\d{1,2})(?:[:.](\d{2}))?(?:\s+(утра|дня|вечера|ночи))?(?=[\s,.!]|$)/i, spans)
  if (m) {
    [hour, min, part] = [m[1], m[2], (m[3] ?? '').toLowerCase()]
  } else {
    ;[rest, m] = strip(rest, /\s(\d{1,2}):(\d{2})(?=[\s,.!]|$)/, spans)
    if (m) [hour, min] = [m[1], m[2]]
  }
  if (hour !== undefined) {
    let h = Number(hour)
    if (h <= 23) {
      if ((part === 'вечера' || part === 'дня') && h < 12) h += 12
      else if (!part && h >= 1 && h <= 7) h += 12
      time = `${h}:${min ?? '00'}`
      if (!date) {
        const nowD = new Date(now)
        const mins = nowD.getHours() * 60 + nowD.getMinutes()
        date = h * 60 + Number(min ?? 0) > mins ? today : addDays(today, 1)
      }
    }
  }

  rest = rest.replace(/\s+/g, ' ').replace(/[\s,;:.-]+$/, '').replace(/^[\s,;:.-]+/, '').trim()
  const due = date ? (time ? { date, time } : { date }) : null
  return { due, rest, spans: due ? joinSpans(text, spans) : [] }
}

/** Runs next to each other («завтра в 10») are one; a time read without a day it belongs to stays its own run */
function joinSpans(text: string, spans: Span[]): Span[] {
  const out: Span[] = []
  for (const s of [...spans].sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1]
    if (last && !text.slice(last[1], s[0]).trim()) last[1] = s[1]
    else out.push([s[0], s[1]])
  }
  return out
}

/** The words a date was read from, as one string: what a tap on the date chip drops («завтра в 10») */
export function dueWords(text: string, spans: Span[]): string {
  return spans.map(([a, b]) => text.slice(a, b)).join(' ')
}

const UNITS: [RegExp, string][] = [
  [/^(л|литр[аов]*)$/, 'л'],
  [/^мл$/, 'мл'],
  [/^(г|гр|грамм[аов]*)$/, 'г'],
  [/^(кг|кило|килограмм[аов]*)$/, 'кг'],
  [/^(шт|штук[аи]?)$/, 'шт'],
  [/^(уп|упаков[а-я]*)$/, 'уп'],
  [/^(пач[а-я]*)$/, 'пач'],
  [/^(бут[а-я]*)$/, 'бут'],
  [/^(бан[а-я]*)$/, 'бан']
]

/** «молоко 2 л» → «Молоко», «2 л» */
export function parseQty(text: string): { qty: string | null, rest: string } {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(л|литр[аов]*|мл|г|гр|грамм[аов]*|кг|кило|килограмм[аов]*|шт|штук[аи]?|уп|упаков[а-я]*|пач[а-я]*|бут[а-я]*|бан[а-я]*)\.?(?=[\s,]|$)/i)
  if (!m) return { qty: null, rest: text }
  const unit = UNITS.find(([re]) => re.test(m[2]!.toLowerCase()))?.[1] ?? m[2]!
  const rest = (text.slice(0, m.index) + text.slice(m.index! + m[0].length)).replace(/\s+/g, ' ').trim()
  return { qty: `${m[1]!.replace('.', ',')} ${unit}`, rest }
}

/** «купить», «надо взять»… in front of a shopping list say nothing the page doesn't already say */
const LIST_VERB = /^(?:(?:надо|нужно|не забыть)\s+)?(?:купить|купи|докупить|взять|возьми)\s+/i

/** Commas (not the one in «2,5 л»), semicolons and new lines: a send is a list on every page and in Авто */
const PARTS = /\s*(?:(?<!\d),|,(?!\d)|;|\n)\s*/

/**
 * A part that starts with a digit or one of these words is a detail of the part before it, not a record of its own
 * (main flow, item 8): «молоко 2,5%, большую пачку» is one record
 */
const DETAIL = /^(?:\d|(?:без|для|на|по|из|большую|большой|маленькую|маленький|побольше|поменьше|если)(?:\s|$))/i

function joinDetails(parts: string[], glue: string): string[] {
  const out: string[] = []
  for (const p of parts) {
    if (out.length && DETAIL.test(p)) out[out.length - 1] += glue + p
    else out.push(p)
  }
  return out
}

/** «сыр, позвонить бабушке» → two parts; a line without a separator is one part */
export function splitParts(text: string): string[] {
  return joinDetails(text.split(PARTS).map(s => s.trim()).filter(Boolean), ', ')
}

/** «купить молоко, яйца и сыр» → three lines; on pages that hold lists of things «и» splits too */
export function splitItems(text: string): string[] {
  return splitParts(text.replace(LIST_VERB, ''))
    .flatMap(part => joinDetails(part.split(/\s+и\s+/i).map(s => s.trim()).filter(Boolean), ' и '))
    .map(capitalize)
}

/** A first word Авто understood as the page («идея: …», «цель: …»): the page says it, the record does not */
const ROUTE_PREFIX = /^(?:идея|идеи|цель|задача|заметка|мысль|покупки|купить)\s*:\s*/i

export function dropPrefix(text: string): string {
  return text.replace(ROUTE_PREFIX, '')
}

/** Text of a record as the user typed it: «?», punctuation and case kept, only the first letter capitalised */
export function cleanRecordText(text: string): string {
  return capitalize(text.replace(/[\s,;:]+$/, '').trim())
}
