import type { Block, BlockId, CreateBlockInput } from '../types/block'

function generateId(): BlockId {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createBlock<T = unknown>(input: CreateBlockInput<T>): Block<T> {
  const now = new Date().toISOString()

  return {
    id: generateId(),
    name: input.name,
    created: now,
    updated: now,
    props: input.props ?? {},
    data: input.data,
    meta: {
      type: input.type,
      ...input.metaExtras
    },
    parents: input.parents ?? [],
    children: input.children ?? []
  }
}

export function createChildBlock<T = unknown>(
  parentId: BlockId,
  input: Omit<CreateBlockInput<T>, 'parents'>
): Block<T> {
  return createBlock({
    ...input,
    parents: [parentId]
  })
}
