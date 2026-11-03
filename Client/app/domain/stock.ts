import type { Id, Page, Rec, StockConfig, ViewDef } from './types'
import { normalize } from './text'

export const validStockNumber = (value: number): boolean => Number.isFinite(value) && value >= 0

export function stockLow(rec: Rec, stock: Pick<StockConfig, 'amountProp' | 'normProp'>): boolean {
  const amount = rec.values[stock.amountProp]
  const norm = rec.values[stock.normProp]
  return typeof amount === 'number' && Number.isFinite(amount) && typeof norm === 'number' && Number.isFinite(norm)
    && amount <= 1 && amount < norm
}

export function stockUnit(rec: Rec, page: Page, amountProp: Id): string {
  return rec.stockUnits?.[amountProp]?.trim() || page.props.find(p => p.id === amountProp)?.unit?.trim() || 'шт'
}

export function matchesStock(rec: Rec, stock: NonNullable<ViewDef['stock']>): boolean {
  const amount = rec.values[stock.amountProp]
  const tracked = amount !== null && amount !== undefined && amount !== ''
  if (stock.mode === 'stock') return tracked
  return !rec.done && (!tracked || stockLow(rec, stock) || rec.stockBuy?.[stock.amountProp] === true)
}

/** Changes only submitted fields; invalid new numbers reject the whole edit. */
export function editStock(rec: Rec, stock: StockConfig, edit: { amount?: number | null, norm?: number | null, unit?: string }): Rec | null {
  if (edit.amount != null && !validStockNumber(edit.amount)) return null
  if (edit.norm != null && !validStockNumber(edit.norm)) return null
  const values = { ...rec.values }
  if (edit.amount !== undefined) values[stock.amountProp] = edit.amount
  if (edit.norm !== undefined) values[stock.normProp] = edit.norm
  let next: Rec = { ...rec, values }
  if (edit.unit !== undefined) {
    const units = { ...rec.stockUnits }
    const unit = edit.unit.trim()
    if (unit) units[stock.amountProp] = unit
    else delete units[stock.amountProp]
    next = { ...next, stockUnits: units }
  }
  if (!stockLow(rec, stock) && stockLow(next, stock)) next = { ...next, done: false }
  return next
}

export function stepStock(rec: Rec, stock: StockConfig, step: -1 | 1): Rec | null {
  const amount = rec.values[stock.amountProp]
  if (typeof amount !== 'number' || !Number.isFinite(amount) || (step === -1 && amount <= 0)) return null
  const next = step === -1 ? Math.max(0, amount - 1) : amount + 1
  if (!validStockNumber(next) || next === amount) return null
  return editStock(rec, stock, { amount: next })
}

/** Returns null rather than writing a missing or invalid norm. */
export function purchaseStock(rec: Rec, stock: StockConfig, now: number): Rec | null {
  const norm = rec.values[stock.normProp]
  if (typeof norm !== 'number' || !validStockNumber(norm)) return null
  const stockBuy = { ...rec.stockBuy }
  delete stockBuy[stock.amountProp]
  return { ...rec, done: true, doneAt: now, tickedAt: now, values: { ...rec.values, [stock.amountProp]: norm }, stockBuy }
}

export function uniqueStockName(base: string, names: string[]): string {
  const taken = new Set(names.map(normalize))
  let n = 1
  while (taken.has(normalize(n === 1 ? base : `${base} ${n}`))) n++
  return n === 1 ? base : `${base} ${n}`
}

export type StockMode = 'buy' | 'stock'
const viewKey = (mode: StockMode) => mode === 'buy' ? 'buyViewId' : 'stockViewId'

/** Only an explicit ID with matching semantics is a stock view; names never bind data. */
export function stockView(page: Page, config: StockConfig, mode: StockMode): ViewDef | undefined {
  const id = config[viewKey(mode)]
  return id
    ? page.views.find(v => v.id === id && v.stock?.mode === mode
      && v.stock.amountProp === config.amountProp && v.stock.normProp === config.normProp)
    : undefined
}

/** Old copies may contain IDs of deleted views. Do not bind them to any other view. */
export function clearMissingStockViews(page: Page): Page {
  let changed = false
  const stocks = page.stocks?.map((s) => {
    const next = { ...s }
    for (const key of ['buyViewId', 'stockViewId'] as const) {
      if (s[key] && !page.views.some(v => v.id === s[key])) {
        delete next[key]
        changed = true
      }
    }
    return next
  })
  return changed ? { ...page, stocks } : page
}

export function restoreStockView(page: Page, config: StockConfig, mode: StockMode, id: Id): Page | null {
  const matches = (page.stocks ?? []).filter(s => s.amountProp === config.amountProp && s.normProp === config.normProp)
  const amount = page.props.filter(p => p.id === config.amountProp)
  const norm = page.props.filter(p => p.id === config.normProp)
  const overlap = (page.stocks ?? []).filter(s => s.amountProp === config.amountProp || s.normProp === config.amountProp
    || s.amountProp === config.normProp || s.normProp === config.normProp)
  if (matches.length !== 1 || overlap.length !== 1 || config.amountProp === config.normProp || amount.length !== 1 || norm.length !== 1
    || amount[0]?.type !== 'number' || amount[0].normProp !== config.normProp || norm[0]?.type !== 'number'
    || stockView(page, matches[0]!, mode) || page.views.some(v => v.id === id)) return null
  const view: ViewDef = {
    id, name: uniqueStockName(mode === 'buy' ? 'Купить' : 'Запасы', page.views.map(v => v.name)), layout: 'list',
    filter: mode === 'buy' ? [{ field: 'done', op: 'is', value: false }] : [{ field: config.amountProp, op: 'notEmpty' }],
    groupBy: null, sort: 'manual', shown: [config.amountProp],
    stock: { mode, amountProp: config.amountProp, normProp: config.normProp }
  }
  return { ...page, views: [...page.views, view], stocks: page.stocks!.map(s => s === matches[0] ? { ...s, [viewKey(mode)]: id } : s) }
}

export interface RemovedView {
  view: ViewDef
  index: number
  refs: { amountProp: Id, normProp: Id, key: 'buyViewId' | 'stockViewId' }[]
}

export function removePageView(page: Page, id: Id): { page: Page, removed: RemovedView } | null {
  const index = page.views.findIndex(v => v.id === id)
  if (index < 0 || page.views.length < 2) return null
  const refs: RemovedView['refs'] = []
  const stocks = page.stocks?.map((s) => {
    const next = { ...s }
    for (const key of ['buyViewId', 'stockViewId'] as const) if (s[key] === id) {
      refs.push({ amountProp: s.amountProp, normProp: s.normProp, key })
      delete next[key]
    }
    return next
  })
  return { page: { ...page, views: page.views.filter(v => v.id !== id), ...(refs.length ? { stocks } : {}) },
    removed: { view: page.views[index]!, index, refs } }
}

/** Undo only the deletion, without rolling back unrelated changes or replacing a newly restored view. */
export function undoPageView(page: Page, removed: RemovedView): Page | null {
  if (page.views.some(v => v.id === removed.view.id)) return null
  for (const ref of removed.refs) {
    const matches = (page.stocks ?? []).filter(s => s.amountProp === ref.amountProp && s.normProp === ref.normProp)
    if (matches.length !== 1 || matches[0]![ref.key] !== undefined) return null
  }
  const views = [...page.views]
  views.splice(Math.min(removed.index, views.length), 0, removed.view)
  const stocks = page.stocks?.map((s) => {
    const refs = removed.refs.filter(r => r.amountProp === s.amountProp && r.normProp === s.normProp)
    return refs.length ? { ...s, ...Object.fromEntries(refs.map(r => [r.key, removed.view.id])) } : s
  })
  return { ...page, views, ...(removed.refs.length ? { stocks } : {}) }
}

/** Explicit opt-in: creates new IDs and views, never adopts or edits existing properties or views. */
export function enableStock(page: Page, ids: { amount: Id, norm: Id, buy: Id, stock: Id }, baseView?: ViewDef): Page {
  const propIds = new Set(page.props.map(p => p.id))
  const viewIds = new Set(page.views.map(v => v.id))
  if (ids.amount === ids.norm || propIds.has(ids.amount) || propIds.has(ids.norm) || ids.buy === ids.stock || viewIds.has(ids.buy) || viewIds.has(ids.stock)) {
    throw new Error('Stock IDs must be unique within the page')
  }
  const amountName = uniqueStockName('Осталось', page.props.map(p => p.name))
  const normName = uniqueStockName('Норма', [...page.props.map(p => p.name), amountName])
  const buyName = uniqueStockName('Купить с запасами', page.views.map(v => v.name))
  const stockName = uniqueStockName('Запасы', [...page.views.map(v => v.name), buyName])
  const config: StockConfig = { amountProp: ids.amount, normProp: ids.norm, buyViewId: ids.buy, stockViewId: ids.stock }
  const buy: ViewDef = {
    id: ids.buy, name: buyName, layout: 'list', filter: [{ field: 'done', op: 'is', value: false }],
    groupBy: baseView?.groupBy ?? null, sort: 'manual', shown: [...(baseView?.shown ?? []), ids.amount],
    stock: { mode: 'buy', amountProp: ids.amount, normProp: ids.norm }
  }
  const stock: ViewDef = {
    id: ids.stock, name: stockName, layout: 'list', filter: [{ field: ids.amount, op: 'notEmpty' }],
    groupBy: null, sort: 'manual', shown: [ids.amount], stock: { mode: 'stock', amountProp: ids.amount, normProp: ids.norm }
  }
  return {
    ...page,
    props: [...page.props, { id: ids.amount, name: amountName, type: 'number', unit: 'шт', normProp: ids.norm },
      { id: ids.norm, name: normName, type: 'number', unit: 'шт' }],
    views: [...page.views, buy, stock], stocks: [...(page.stocks ?? []), config]
  }
}
