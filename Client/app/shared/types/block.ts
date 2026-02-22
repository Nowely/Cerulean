import type { ThreadData, MessageData } from './thread'
import type { TaskData } from './task'
import type { NoteData } from './note'
import type { ContactData } from './contact'
import type { ShoppingItemData } from './shopping'

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

export type ThreadBlock = Block<ThreadData>
export type TaskBlock = Block<TaskData>
export type MessageBlock = Block<MessageData>
export type NoteBlock = Block<NoteData>
export type ContactBlock = Block<ContactData>
export type ShoppingItemBlock = Block<ShoppingItemData>

export function isThreadBlock(block: Block): block is ThreadBlock {
  return block.meta.type === 'thread'
}

export function isTaskBlock(block: Block): block is TaskBlock {
  return block.meta.type === 'task'
}

export function isMessageBlock(block: Block): block is MessageBlock {
  return block.meta.type === 'message'
}

export function isNoteBlock(block: Block): block is NoteBlock {
  return block.meta.type === 'note'
}

export function isContactBlock(block: Block): block is ContactBlock {
  return block.meta.type === 'contact'
}

export function isShoppingItemBlock(block: Block): block is ShoppingItemBlock {
  return block.meta.type === 'shopping-item'
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
