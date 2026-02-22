import type { Block, BlockId, BlockType, ThreadBlock, TaskBlock, MessageBlock, NoteBlock, ContactBlock, ShoppingItemBlock } from '../types/block'
import type { ThreadKind } from '../types/thread'
import type { TaskTemplate } from '../types/task'
import { getSeedBlocks, SEED_TEMPLATES } from '../api/block-seed'
import * as blockDb from '../lib/block-db'

const blocks = ref(new Map<BlockId, Block>())
const initialized = ref(false)
const activeThreadId = ref<BlockId | null>(null)
const activeTaskId = ref<BlockId | null>(null)

export function useBlockStore() {
  const activeThread = computed(() => {
    const id = activeThreadId.value
    if (!id) return null
    const block = blocks.value.get(id)
    if (block?.meta.type === 'thread') return block as ThreadBlock
    return null
  })

  const activeTask = computed(() => {
    if (!activeTaskId.value) return null
    return blocks.value.get(activeTaskId.value) as TaskBlock | undefined ?? null
  })

  async function init() {
    if (initialized.value) return
    const storedBlocks = await blockDb.loadAllBlocks()
    if (storedBlocks.length > 0) {
      blocks.value = new Map(storedBlocks.map(b => [b.id, b]))
    } else {
      const seedBlocks = getSeedBlocks()
      for (const block of seedBlocks) {
        blocks.value.set(block.id, block)
        await blockDb.saveBlock(block)
      }
    }
    initialized.value = true
  }

  function get(id: BlockId): Block | undefined {
    return blocks.value.get(id)
  }

  function getThread(id: BlockId): ThreadBlock | undefined {
    const block = blocks.value.get(id)
    if (block?.meta.type === 'thread') return block as ThreadBlock
    return undefined
  }

  function getTask(id: BlockId): TaskBlock | undefined {
    const block = blocks.value.get(id)
    if (block?.meta.type === 'task') return block as TaskBlock
    return undefined
  }

  function getMessage(id: BlockId): MessageBlock | undefined {
    const block = blocks.value.get(id)
    if (block?.meta.type === 'message') return block as MessageBlock
    return undefined
  }

  function getByType(type: BlockType): Block[] {
    const result: Block[] = []
    for (const block of blocks.value.values()) {
      if (block.meta.type === type) {
        result.push(block)
      }
    }
    return result
  }

  function getChildren(id: BlockId): Block[] {
    const block = blocks.value.get(id)
    if (!block) return []
    return block.children
      .map(childId => blocks.value.get(childId))
      .filter((b): b is Block => b !== undefined)
  }

  function getChildrenByType(id: BlockId, type: BlockType): Block[] {
    return getChildren(id).filter(b => b.meta.type === type)
  }

  function getParents(id: BlockId): Block[] {
    const block = blocks.value.get(id)
    if (!block) return []
    return block.parents
      .map(parentId => blocks.value.get(parentId))
      .filter((b): b is Block => b !== undefined)
  }

  function getParentThreadId(id: BlockId): BlockId | undefined {
    const block = blocks.value.get(id)
    if (!block) return undefined
    return block.parents.find(pid => blocks.value.get(pid)?.meta.type === 'thread')
  }

  async function add(block: Block) {
    blocks.value.set(block.id, block)
    await blockDb.saveBlock(block)

    for (const parentId of block.parents) {
      const parent = blocks.value.get(parentId)
      if (parent && !parent.children.includes(block.id)) {
        parent.children.push(block.id)
        await blockDb.saveBlock(parent)
      }
    }
  }

  async function update<T = unknown>(
    id: BlockId,
    updates: Partial<Omit<Block<T>, 'id' | 'created'>>
  ) {
    const block = blocks.value.get(id)
    if (!block) return

    Object.assign(block, updates, {
      updated: new Date().toISOString()
    })

    await blockDb.saveBlock(block)
  }

  async function remove(id: BlockId): Promise<void> {
    const block = blocks.value.get(id)
    if (!block) return

    for (const childId of [...block.children]) {
      await remove(childId)
    }

    for (const parentId of block.parents) {
      const parent = blocks.value.get(parentId)
      if (parent) {
        parent.children = parent.children.filter(cid => cid !== id)
        await blockDb.saveBlock(parent)
      }
    }

    blocks.value.delete(id)
    await blockDb.deleteBlock(id)
  }

  function search(query: string, type?: BlockType): Block[] {
    const q = query.toLowerCase()
    const result: Block[] = []

    for (const block of blocks.value.values()) {
      if (type && block.meta.type !== type) continue
      if (block.name.toLowerCase().includes(q)) {
        result.push(block)
      }
    }

    return result
  }

  function count(type?: BlockType): number {
    if (!type) return blocks.value.size

    let c = 0
    for (const block of blocks.value.values()) {
      if (block.meta.type === type) c++
    }
    return c
  }

  function getThreads(): ThreadBlock[] {
    return getByType('thread') as ThreadBlock[]
  }

  function getThreadsByKind(kind: ThreadKind): ThreadBlock[] {
    return getThreads().filter(b => b.data.kind === kind)
  }

  function getThreadTasks(threadId: BlockId): TaskBlock[] {
    return getChildrenByType(threadId, 'task') as TaskBlock[]
  }

  function getThreadNotes(threadId: BlockId): NoteBlock[] {
    return getChildrenByType(threadId, 'note') as NoteBlock[]
  }

  function getThreadContacts(threadId: BlockId): ContactBlock[] {
    return getChildrenByType(threadId, 'contact') as ContactBlock[]
  }

  function getThreadShoppingItems(threadId: BlockId): ShoppingItemBlock[] {
    return getChildrenByType(threadId, 'shopping-item') as ShoppingItemBlock[]
  }

  function getThreadMessages(threadId: BlockId): MessageBlock[] {
    return getChildrenByType(threadId, 'message') as MessageBlock[]
  }

  function getThreadViews(threadId: BlockId): Block[] {
    return getChildrenByType(threadId, 'view')
  }

  function getRootThreads(): ThreadBlock[] {
    return getThreads().filter(b => b.parents.length === 0)
  }

  function getSortedThreads(): ThreadBlock[] {
    return [...getThreads()].sort((a, b) => {
      if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1
      return new Date(b.data.lastActivity).getTime() - new Date(a.data.lastActivity).getTime()
    })
  }

  function getLastMessageForThread(threadId: BlockId): MessageBlock | undefined {
    const messages = getThreadMessages(threadId)
    if (messages.length === 0) return undefined
    return messages.reduce((latest, msg) => {
      if (!latest) return msg
      return new Date(msg.updated) > new Date(latest.updated) ? msg : latest
    })
  }

  function setActiveThread(id: BlockId | null) {
    activeThreadId.value = id
    if (id) {
      const thread = blocks.value.get(id)
      if (thread && thread.meta.type === 'thread') {
        (thread as ThreadBlock).data.unreadCount = 0
      }
    }
  }

  function setActiveTask(id: BlockId | null) {
    activeTaskId.value = id
  }

  const templates = ref<TaskTemplate[]>(SEED_TEMPLATES)

  function getTemplateById(id: string): TaskTemplate | undefined {
    return templates.value.find(t => t.id === id)
  }

  return {
    blocks: readonly(blocks),
    initialized: readonly(initialized),
    activeThreadId: readonly(activeThreadId),
    activeTaskId: readonly(activeTaskId),
    activeThread,
    activeTask,
    init,
    get,
    getThread,
    getTask,
    getMessage,
    getByType,
    getChildren,
    getChildrenByType,
    getParents,
    getParentThreadId,
    add,
    update,
    remove,
    search,
    count,
    getThreads,
    getThreadsByKind,
    getThreadTasks,
    getThreadNotes,
    getThreadContacts,
    getThreadShoppingItems,
    getThreadMessages,
    getThreadViews,
    getRootThreads,
    getSortedThreads,
    getLastMessageForThread,
    setActiveThread,
    setActiveTask,
    templates,
    getTemplateById
  }
}
