import type { ShoppingItem } from '../types/shopping'
import { generateId } from '~/shared/utils'

export function createShoppingItem(
  threadId: string,
  text: string,
  opts?: { quantity?: number, sortOrder?: number }
): ShoppingItem {
  return {
    id: generateId('si'),
    threadId,
    text,
    checked: false,
    quantity: opts?.quantity ?? 1,
    sortOrder: opts?.sortOrder ?? Date.now(),
    createdAt: new Date().toISOString()
  }
}
