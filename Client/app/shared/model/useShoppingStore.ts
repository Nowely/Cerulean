import type { ShoppingItem, ShoppingItemId } from '../types/shopping'
import { SEED_SHOPPING_ITEMS } from '~/shared/api/seed'

const items = ref<ShoppingItem[]>([])

export function useShoppingStore() {
  function threadItems(threadId: string): ShoppingItem[] {
    return items.value
      .filter(i => i.threadId === threadId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  function checkableItems(threadId: string): ShoppingItem[] {
    return threadItems(threadId).filter(i => i.type === 'checkable')
  }

  function trackableItems(threadId: string): ShoppingItem[] {
    return threadItems(threadId).filter(i => i.type === 'trackable')
  }

  function checkedCount(threadId: string): number {
    return items.value.filter(i => i.threadId === threadId && i.type === 'checkable' && i.checked).length
  }

  function checkableTotalCount(threadId: string): number {
    return items.value.filter(i => i.threadId === threadId && i.type === 'checkable').length
  }

  function totalCount(threadId: string): number {
    return items.value.filter(i => i.threadId === threadId).length
  }

  function add(item: ShoppingItem) {
    items.value.push(item)
  }

  function toggle(id: ShoppingItemId) {
    const item = items.value.find(i => i.id === id)
    if (item) item.checked = !item.checked
  }

  function increment(id: ShoppingItemId) {
    const item = items.value.find(i => i.id === id)
    if (item && item.type === 'trackable') {
      item.collected++
    }
  }

  function decrement(id: ShoppingItemId) {
    const item = items.value.find(i => i.id === id)
    if (item && item.type === 'trackable' && item.collected > 0) {
      item.collected--
    }
  }

  function convertType(id: ShoppingItemId) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.type = item.type === 'checkable' ? 'trackable' : 'checkable'
      if (item.type === 'trackable') {
        item.checked = false
      } else {
        item.collected = 0
      }
    }
  }

  function updateText(id: ShoppingItemId, text: string) {
    const item = items.value.find(i => i.id === id)
    if (item) item.text = text
  }

  function remove(id: ShoppingItemId) {
    items.value = items.value.filter(i => i.id !== id)
  }

  function init() {
    items.value = SEED_SHOPPING_ITEMS.map(i => ({ ...i }))
  }

  return {
    items,
    threadItems,
    checkableItems,
    trackableItems,
    checkedCount,
    checkableTotalCount,
    totalCount,
    add,
    toggle,
    increment,
    decrement,
    convertType,
    updateText,
    remove,
    init
  }
}
