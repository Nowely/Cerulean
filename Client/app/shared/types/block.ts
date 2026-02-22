export type BlockId = string

export type BlockType
  = | 'thread'
    | 'task'
    | 'note'
    | 'contact'
    | 'shopping-item'
    | 'message'
    | 'view'
    | 'folder'
    | 'text'
    | 'list'
    | 'list-item'
    | 'page'

export interface BlockMeta {
  type: BlockType
  [key: string]: unknown
}

export interface Block<T = unknown> {
  id: BlockId
  name: string
  created: string
  updated: string
  props: Record<string, unknown>
  data: T
  meta: BlockMeta
  parents: BlockId[]
  children: BlockId[]
}

export interface CreateBlockInput<T = unknown> {
  name: string
  type: BlockType
  data: T
  props?: Record<string, unknown>
  parents?: BlockId[]
  children?: BlockId[]
  metaExtras?: Record<string, unknown>
}
