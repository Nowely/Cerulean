export type ShoppingItemId = string
export type ShoppingItemType = 'checkable' | 'trackable'

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
