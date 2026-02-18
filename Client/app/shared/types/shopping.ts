export type ShoppingItemId = string

export interface ShoppingItem {
  id: ShoppingItemId
  threadId: string
  text: string
  checked: boolean
  quantity?: number
  category?: string
  sortOrder: number
  createdAt: string
}
