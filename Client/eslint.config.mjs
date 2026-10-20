// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Pages, records and sections are id-keyed dictionaries in the store; deleting by id is the point
    '@typescript-eslint/no-dynamic-delete': 'off'
  }
})
