import type { RouterConfig } from '@nuxt/schema'
import { createMemoryHistory, createWebHistory } from 'vue-router'
import { withBackLayers } from './utils/backHistory'

export default {
  history: base => withBackLayers(import.meta.client ? createWebHistory(base) : createMemoryHistory(base))
} satisfies RouterConfig
