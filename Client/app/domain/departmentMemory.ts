import type { Page, PropDef, Rec } from './types'
import { fold, stems } from './text'

/** The same property that the shopping rules and model use. */
export function departmentProp(page: Page): PropDef | undefined {
  return (page.template === 'shop' || page.props.some(p => p.name === 'Количество'))
    ? page.props.find(p => p.type === 'select')
    : undefined
}

export function departmentStem(text: string): string | undefined {
  const word = fold(text).replace(/^\s*(?:купить|докупить)(?:\s+|$)/, '').split(/[^a-zа-я0-9]+/).find(Boolean)
  return word ? stems(word)[0] : undefined
}

/** An invalid or removed property/option never becomes a record value. */
export function applyDepartment(page: Page, text: string, values: Rec['values'], enabled = true): Rec['values'] {
  if (!enabled || page.deletedAt) return values
  const prop = departmentProp(page)
  const stem = departmentStem(text)
  const option = prop && stem ? page.departmentMemory?.[prop.id]?.[stem] : undefined
  return prop && option && prop.options?.some(o => o.id === option) ? { ...values, [prop.id]: option } : values
}
