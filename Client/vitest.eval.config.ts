import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config'

// `pnpm eval`: Авто against a real model, apart from the tests (it needs a key and costs a few cents)
export default mergeConfig(base, defineConfig({
  test: { include: ['eval/**/*.eval.ts'] }
}))
