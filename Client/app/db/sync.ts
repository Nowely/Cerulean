// Tabs of the app in one browser share one IndexedDB, but each holds everything in memory. A tab that wrote
// something says what (kinds and ids) once the write is in; the others read those items back and apply them.
// BroadcastChannel where there is one, otherwise a localStorage ping and its `storage` event.
import type { Kind } from './idb'

export type Change = Partial<Record<Kind | 'meta', string[]>> & {
  /** Everything was replaced (import, «Удалить всё»): read it all again */
  all?: boolean
}

export class TabSync {
  private channel: BroadcastChannel | null = null
  private key: string
  private onStorage: ((e: StorageEvent) => void) | null = null

  constructor(name: string, listen: (change: Change) => void) {
    this.key = `${name}:changed`
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(this.key)
      this.channel.onmessage = e => listen(e.data as Change)
      // Node (tests) keeps the process alive for an open channel; a browser has no unref
      ;(this.channel as { unref?: () => void }).unref?.()
    } else if (typeof window !== 'undefined') {
      this.onStorage = (e) => {
        if (e.key !== this.key || !e.newValue) return
        try {
          listen((JSON.parse(e.newValue) as { change: Change }).change)
        } catch {
          // a ping from another version of the app
        }
      }
      window.addEventListener('storage', this.onStorage)
    }
  }

  post(change: Change) {
    if (this.channel) {
      this.channel.postMessage(change)
      return
    }
    try {
      // A new value every time: the `storage` event fires only when the value changes
      localStorage.setItem(this.key, JSON.stringify({ change, at: Date.now(), n: Math.random() }))
    } catch {
      // no localStorage either: other tabs catch up on their next load
    }
  }

  close() {
    this.channel?.close()
    if (this.onStorage) window.removeEventListener('storage', this.onStorage)
  }
}
