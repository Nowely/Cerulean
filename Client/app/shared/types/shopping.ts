export type ShoppingItemId = string

export interface ShoppingItem {
  id: ShoppingItemId
  threadId: string
  text: string
  checked: boolean
  quantity?: number
  sortOrder: number
  createdAt: string
}
