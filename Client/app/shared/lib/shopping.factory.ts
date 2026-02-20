import type { ShoppingItem, ShoppingItemType } from '../types/shopping'
import { generateId } from '~/shared/utils'

export function createShoppingItem(
  threadId: string,
  text: string,
  opts?: { type?: ShoppingItemType, sortOrder?: number }
): ShoppingItem {
  return {
    id: generateId('si'),
    threadId,
    text,
    type: opts?.type ?? 'checkable',
    checked: false,
    collected: 0,
    sortOrder: opts?.sortOrder ?? Date.now(),
    createdAt: new Date().toISOString()
  }
}
