export type ShoppingItemId = string
export type ShoppingItemType = 'checkable' | 'trackable'

export interface ShoppingItemData {
  type: ShoppingItemType
  checked: boolean
  collected: number
  sortOrder: number
}
