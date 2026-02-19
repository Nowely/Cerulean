import type { ShoppingItem, ShoppingItemId } from '../types/shopping'
import { SEED_SHOPPING_ITEMS } from '~/shared/api/seed'

const items = ref<ShoppingItem[]>([])

export function useShoppingStore() {
  function threadItems(threadId: string): ShoppingItem[] {
    return items.value
      .filter(i => i.threadId === threadId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  function checkedCount(threadId: string): number {
    return items.value.filter(i => i.threadId === threadId && i.checked).length
  }

  function totalCount(threadId: string): number {
    return items.value.filter(i => i.threadId === threadId).length
  }

  function categories(threadId: string): string[] {
    const cats = new Set<string>()
    for (const item of items.value) {
      if (item.threadId === threadId && item.category) cats.add(item.category)
    }
    return [...cats].sort()
  }

  function add(item: ShoppingItem) {
    items.value.push(item)
  }

  function toggle(id: ShoppingItemId) {
    const item = items.value.find(i => i.id === id)
    if (item) item.checked = !item.checked
  }

  function updateText(id: ShoppingItemId, text: string) {
    const item = items.value.find(i => i.id === id)
    if (item) item.text = text
  }

  function remove(id: ShoppingItemId) {
    items.value = items.value.filter(i => i.id !== id)
  }

  function clearChecked(threadId: string) {
    items.value = items.value.filter(i => i.threadId !== threadId || !i.checked)
  }

  function init() {
    items.value = SEED_SHOPPING_ITEMS.map(i => ({ ...i }))
  }

  return {
    items,
    threadItems,
    checkedCount,
    totalCount,
    categories,
    add,
    toggle,
    updateText,
    remove,
    clearChecked,
    init
  }
}
