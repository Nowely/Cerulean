export type ShoppingItemId = string
export type ShoppingItemType = 'checkable' | 'trackable'

export interface ShoppingItemData {
  type: ShoppingItemType
  checked: boolean
  collected: number
  sortOrder: number
}

/**
 * @deprecated Use Block<ShoppingItemData> instead
 */
export interface ShoppingItem {
  id: ShoppingItemId
  threadId: string
  text: string
  type: ShoppingItemType
  checked: boolean
  collected: number
  sortOrder: number
  createdAt: string
}
