// What simple rules can read from a line without a model: dates, quantities, lists, questions
import type { Due } from './types'
import { addDays, dayKey } from './dates'
import { capitalize } from './text'

const QUESTION_START = /^(что|где|когда|сколько|как|какой|какая|какие|какое|каком|зачем|почему|кто|чем|куда|откуда|есть ли|можно ли|нужно ли|надо ли|был[аио]? ли)(\s|$)/i

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

function strip(text: string, re: RegExp): [string, RegExpMatchArray | null] {
  const m = text.match(re)
  if (!m) return [text, null]
  return [(text.slice(0, m.index) + ' ' + text.slice(m.index! + m[0].length)).replace(/\s+/g, ' ').trim(), m]
}

/**
 * Finds a due date and time in Russian text and returns the text without them:
 * «позвонить стоматологу сегодня в 10» → «позвонить стоматологу», сегодня 10:00.
 */
export function parseDue(text: string, now: number): { due: Due | null, rest: string } {
  let rest = ` ${text} `
  const today = dayKey(now)
  let date: string | null = null
  let time: string | undefined
  let m: RegExpMatchArray | null

  ;[rest, m] = strip(rest, /\s(до\s+|к\s+)?(сегодня|завтра|послезавтра)(?=[\s,.!]|$)/i)
  if (m) date = addDays(today, { сегодня: 0, завтра: 1, послезавтра: 2 }[m[2]!.toLowerCase() as 'сегодня'] ?? 0)

  if (!date) {
    ;[rest, m] = strip(rest, /\s(до\s+|к\s+|в\s+|во\s+)?(понедельник|вторник|среду|среда|четверг|пятницу|пятница|субботу|суббота|воскресенье|пн|вт|ср|чт|пт|сб|вс)(?=[\s,.!]|$)/i)
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
    ;[rest, m] = strip(rest, /\s(до\s+|к\s+)?(\d{1,2})[.\s](\d{1,2}|январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[йя]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь]|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)\.?(?:[.\s](\d{4}))?(?=[\s,.!]|$)/i)
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
    ;[rest, m] = strip(rest, /\sчерез\s+(\d+|день|неделю|месяц)(?:\s+(дн(?:я|ей)|недел[иью]|месяц(?:а|ев)?))?(?=[\s,.!]|$)/i)
    if (m) {
      const n = /^\d+$/.test(m[1]!) ? Number(m[1]) : 1
      const unit = (m[2] ?? m[1]!).toLowerCase()
      date = addDays(today, unit.startsWith('нед') ? n * 7 : unit.startsWith('мес') ? n * 30 : n)
    }
  }

  let hour: string | undefined
  let min: string | undefined
  let part = ''
  ;[rest, m] = strip(rest, /\s(?:в|к|до)\s+(\d{1,2})(?:[:.](\d{2}))?(?:\s+(утра|дня|вечера|ночи))?(?=[\s,.!]|$)/i)
  if (m) {
    [hour, min, part] = [m[1], m[2], (m[3] ?? '').toLowerCase()]
  } else {
    ;[rest, m] = strip(rest, /\s(\d{1,2}):(\d{2})(?=[\s,.!]|$)/)
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
  return { due: date ? (time ? { date, time } : { date }) : null, rest }
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

/** «купить молоко, яйца и сыр» → three lines; used for pages that hold lists of things */
export function splitItems(text: string): string[] {
  return text
    .replace(LIST_VERB, '')
    .split(/\s*(?:,|;|\n|\s+и\s+)\s*/i)
    .map(s => s.trim())
    .filter(Boolean)
    .map(capitalize)
}

/** Text of a record as the user wrote it, without trailing punctuation, capitalised */
export function cleanRecordText(text: string): string {
  return capitalize(text.replace(/[\s,;:]+$/, '').replace(/\?+$/, '').trim())
}
