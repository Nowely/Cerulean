// Tiptap is not in the first download: it loads with the first body that can be edited
import { markRaw, type Component } from 'vue'

let loading: Promise<Component> | null = null

export function loadEditor(): Promise<Component> {
  loading ??= import('./BodyEditor.vue').then(m => markRaw(m.default as Component), (e) => {
    loading = null
    throw e
  })
  return loading
}
