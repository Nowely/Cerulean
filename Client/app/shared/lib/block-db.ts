import type { Block, BlockId } from '../types/block'

const DB_NAME = 'cerulean-blocks'
const STORE_NAME = 'blocks'
const DB_VERSION = 1

let db: IDBDatabase | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDatabase().then((database) => {
    const transaction = database.transaction(STORE_NAME, mode)
    return transaction.objectStore(STORE_NAME)
  })
}

export async function saveBlock(block: Block): Promise<void> {
  const store = await getStore('readwrite')
  return new Promise((resolve, reject) => {
    const request = store.put(block)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function loadBlock(id: BlockId): Promise<Block | undefined> {
  const store = await getStore('readonly')
  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadAllBlocks(): Promise<Block[]> {
  const store = await getStore('readonly')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteBlock(id: BlockId): Promise<void> {
  const store = await getStore('readwrite')
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearBlocks(): Promise<void> {
  const store = await getStore('readwrite')
  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
