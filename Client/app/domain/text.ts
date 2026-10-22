// Russian text helpers: plural agreement, case, word stems for matching

/** 1 запись, 2 записи, 5 записей */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n) % 10
  const b = Math.abs(n) % 100
  if (a === 1 && b !== 11) return forms[0]
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return forms[1]
  return forms[2]
}

export function count(n: number, forms: readonly [string, string, string]): string {
  return `${n} ${plural(n, forms)}`
}

export const RECORD_FORMS = ['запись', 'записи', 'записей'] as const
export const PAGE_FORMS = ['страница', 'страницы', 'страниц'] as const

export function capitalize(s: string): string {
  const t = s.trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** «Хлеб» → «хлеб» in an enumeration, but keeps abbreviations like «ДР» or «iPhone» */
export function lowerFirst(s: string): string {
  if (s.length > 1 && s.charAt(1) === s.charAt(1).toUpperCase() && s.charAt(1) !== s.charAt(1).toLowerCase()) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}

/**
 * A one-letter preposition or conjunction («в, к, с, у, о, и, а») stays with the next word: a no-break space after it
 * (v23, F9). For titles, line 2 and the question card as shown; a draft being typed is left as typed, and a saved
 * title turns it back into a plain space (`\s` takes it), so the stored text never holds it.
 */
export function nb(s: string): string {
  return s.replace(/(?<=^|[\s(«„"])([вксуоиаВКСУОИА]) (?=\S)/g, '$1 ')
}

/** Lower case without ё, same length as the input (safe for index math) */
/** A name cut to `max` characters with «…», for notices that must keep what comes after it */
export function clip(s: string, max = 24): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

export function fold(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

export function normalize(s: string): string {
  return fold(s).replace(/\s+/g, ' ').trim()
}

const STOP = new Set([
  'и', 'в', 'во', 'на', 'с', 'со', 'к', 'ко', 'по', 'за', 'из', 'у', 'о', 'об', 'от', 'до', 'для', 'не', 'ни', 'а', 'но',
  'это', 'то', 'что', 'как', 'же', 'ли', 'бы', 'мне', 'мой', 'моя', 'мои', 'надо', 'нужно', 'например', 'или', 'все', 'всё'
])

/** Rough stems: lower case, no ё, first five letters of each meaningful word */
export function stems(s: string, min = 3): string[] {
  return normalize(s)
    .split(/[^a-zа-я0-9]+/)
    .filter(w => w.length >= min && !STOP.has(w))
    .map(w => w.slice(0, 5))
}

/** Where `query` occurs in `text`, for highlighting a search match */
export function splitMatch(text: string, query: string): { pre: string, mid: string, post: string } {
  const q = fold(query.trim())
  if (!q) return { pre: text, mid: '', post: '' }
  const k = fold(text).indexOf(q)
  if (k < 0) return { pre: text, mid: '', post: '' }
  return { pre: text.slice(0, k), mid: text.slice(k, k + q.length), post: text.slice(k + q.length) }
}

/** «Без статуса», «Без отдела»: a rough genitive of a property name, good for the usual nouns */
export function genitive(word: string): string {
  const w = lowerFirst(word.trim())
  if (/[бвгджзклмнпрстфхцчшщ]$/.test(w)) return `${w}а`
  // Feminine -ость, -ль and a soft sign after a hissing sound: «сложности», «цели»; the rest is masculine: «календаря»
  if (/(сть|ль|[жчшщ]ь)$/.test(w)) return `${w.slice(0, -1)}и`
  if (/[ьй]$/.test(w)) return `${w.slice(0, -1)}я`
  if (/мя$/.test(w)) return `${w.slice(0, -1)}ени`
  if (/[гкхжчшщ]а$/.test(w)) return `${w.slice(0, -1)}и`
  if (/а$/.test(w)) return `${w.slice(0, -1)}ы`
  if (/я$/.test(w)) return `${w.slice(0, -1)}и`
  if (/о$/.test(w)) return `${w.slice(0, -1)}а`
  return w
}

/**
 * A property after «без»: «Без отдела», «1 запись без статуса». A name the genitive can't handle well (several
 * words, an adjective, a plural, a verb like «Осталось», a vowel ending) stays as it is, in quotes: «Без «Тип связи»».
 */
export function ofProp(name: string): string {
  const n = name.trim()
  if (!n) return 'значения'
  if (/\s/.test(n) || /(ое|ее|ый|ий|ой|ая|яя|ые|ие|сь|ся)$/i.test(n) || /[еиуыэюё]$/i.test(n)) return `«${n}»`
  return genitive(n)
}
