import type { Block, BlockId, BlockType } from '../types/block'
import type { ThreadKind } from '../types/thread'
import * as blockDb from '../lib/block-db'

const blocks = ref(new Map<BlockId, Block>())
const initialized = ref(false)

export function useBlockStore() {
  async function init() {
    if (initialized.value) return
    const allBlocks = await blockDb.loadAllBlocks()
    blocks.value = new Map(allBlocks.map(b => [b.id, b]))
    initialized.value = true
  }

  function get(id: BlockId): Block | undefined {
    return blocks.value.get(id)
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

  function getParents(id: BlockId): Block[] {
    const block = blocks.value.get(id)
    if (!block) return []
    return block.parents
      .map(parentId => blocks.value.get(parentId))
      .filter((b): b is Block => b !== undefined)
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

  function getThreads(): Block[] {
    return getByType('thread')
  }

  function getThreadsByKind(kind: ThreadKind): Block[] {
    return getThreads().filter(b => (b.data as { kind: ThreadKind }).kind === kind)
  }

  function getThreadChildren(threadId: BlockId, type?: BlockType): Block[] {
    const children = getChildren(threadId)
    if (!type) return children
    return children.filter(b => b.meta.type === type)
  }

  function getThreadTasks(threadId: BlockId): Block[] {
    return getThreadChildren(threadId, 'task')
  }

  function getThreadNotes(threadId: BlockId): Block[] {
    return getThreadChildren(threadId, 'note')
  }

  function getThreadContacts(threadId: BlockId): Block[] {
    return getThreadChildren(threadId, 'contact')
  }

  function getThreadShoppingItems(threadId: BlockId): Block[] {
    return getThreadChildren(threadId, 'shopping-item')
  }

  function getThreadMessages(threadId: BlockId): Block[] {
    return getThreadChildren(threadId, 'message')
  }

  function getThreadViews(threadId: BlockId): Block[] {
    return getThreadChildren(threadId, 'view')
  }

  function getRootThreads(): Block[] {
    return getThreads().filter(b => b.parents.length === 0)
  }

  return {
    blocks: readonly(blocks),
    initialized: readonly(initialized),
    init,
    get,
    getByType,
    getChildren,
    getParents,
    add,
    update,
    remove,
    search,
    count,
    getThreads,
    getThreadsByKind,
    getThreadChildren,
    getThreadTasks,
    getThreadNotes,
    getThreadContacts,
    getThreadShoppingItems,
    getThreadMessages,
    getThreadViews,
    getRootThreads
  }
}
