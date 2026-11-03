import { stepStock, stockLow, stockUnit } from '../../domain/stock'
import type { Page, Rec, StockConfig } from '../../domain/types'

export function stepperText(rec: Rec, page: Page, stock: StockConfig, open: boolean): string {
  const amount = rec.values[stock.amountProp]
  const norm = rec.values[stock.normProp]
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return ''
  const number = (value: number) => String(value).replace('.', ',')
  const unit = stockUnit(rec, page, stock.amountProp)
  return `${number(amount)}/${typeof norm === 'number' && Number.isFinite(norm) ? number(norm) : '—'}${open || unit !== 'шт' ? ` ${unit}` : ''}`
}

export function stepperPatch(page: Page | undefined, rec: Rec | undefined, stock: StockConfig, step: -1 | 1, conflict: boolean): { patch: Partial<Rec>, becameLow: boolean } | null {
  if (!page || page.deletedAt || !rec || rec.deletedAt || rec.pageId !== page.id || conflict || stock.amountProp === stock.normProp) return null
  const relevant = (page.stocks ?? []).filter(s => s.amountProp === stock.amountProp || s.normProp === stock.amountProp || s.amountProp === stock.normProp || s.normProp === stock.normProp)
  if (relevant.length !== 1 || !relevant.some(s => s.amountProp === stock.amountProp && s.normProp === stock.normProp && s.buyViewId === stock.buyViewId && s.stockViewId === stock.stockViewId)) return null
  const amounts = page.props.filter(p => p.id === stock.amountProp)
  const norms = page.props.filter(p => p.id === stock.normProp)
  if (amounts.length !== 1 || norms.length !== 1 || amounts[0]?.type !== 'number' || amounts[0].normProp !== stock.normProp || norms[0]?.type !== 'number') return null
  const next = stepStock(rec, stock, step)
  if (!next) return null
  const patch: Partial<Rec> = { values: next.values }
  if (next.done !== rec.done) patch.done = next.done
  return { patch, becameLow: !stockLow(rec, stock) && stockLow(next, stock) }
}
