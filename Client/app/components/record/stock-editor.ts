import { editStock, validStockNumber } from '../../domain/stock'
import type { Rec, StockConfig } from '../../domain/types'

export interface StockDraft {
  amount: string
  norm: string
  unit: string
}

export function stockDraft(rec: Rec, stock: StockConfig): StockDraft {
  const text = (value: string | number | null | undefined) => value == null ? '' : String(value).replace('.', ',')
  return {
    amount: text(rec.values[stock.amountProp]),
    norm: text(rec.values[stock.normProp]),
    unit: rec.stockUnits?.[stock.amountProp] ?? ''
  }
}

function numberInput(text: string): number | null | undefined {
  const value = text.trim()
  if (!value) return null
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(value)) return undefined
  const number = Number(value.replace(',', '.'))
  return validStockNumber(number) ? number : undefined
}

/** Null means invalid input; an empty patch means nothing was edited. */
export function stockEditorPatch(rec: Rec, stock: StockConfig, initial: StockDraft, draft: StockDraft): Partial<Rec> | null {
  const edit: { amount?: number | null, norm?: number | null, unit?: string } = {}
  if (draft.amount !== initial.amount) {
    const amount = numberInput(draft.amount)
    if (amount === undefined) return null
    edit.amount = amount
  }
  if (draft.norm !== initial.norm) {
    const norm = numberInput(draft.norm)
    if (norm === undefined) return null
    edit.norm = norm
  }
  if (draft.unit !== initial.unit) edit.unit = draft.unit
  if (!Object.keys(edit).length) return {}
  const next = editStock(rec, stock, edit)
  if (!next) return null
  const patch: Partial<Rec> = {}
  if (edit.amount !== undefined || edit.norm !== undefined) patch.values = next.values
  if (edit.unit !== undefined) patch.stockUnits = next.stockUnits
  if (next.done !== rec.done) patch.done = next.done
  return patch
}
