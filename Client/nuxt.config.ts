// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/hints',
    '@nuxt/test-utils',
    '@nuxtjs/i18n'
  ],
  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    theme: {
      defaultVariants: {
        size: 'md',
        color: 'primary'
      }
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
