// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint', '@vite-pwa/nuxt'],

  // Offline editor backed by IndexedDB: nothing to render on a server
  ssr: false,

  // Every file imports what it uses (Vue from `vue`, Nuxt composables from `#imports`)
  components: {
    dirs: []
  },
  imports: {
    autoImport: false
  },

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'Cerulean',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content' },
        { name: 'description', content: 'Записи, списки и страницы в одном месте. Работает офлайн, данные хранятся в этом браузере.' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    storageKey: 'cerulean-theme'
  },

  // Onest is bundled through @fontsource (see main.css), so @nuxt/fonts never reaches out to a CDN
  ui: {
    fonts: false
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // Icons are bundled into the client: no icon API calls, so they render offline.
  // The scan includes .ts files because page glyphs are listed in app/domain/types.ts.
  icon: {
    provider: 'none',
    serverBundle: false,
    clientBundle: {
      scan: {
        globInclude: ['app/**/*.{vue,ts}']
      },
      includeCustomCollections: true
    },
    customCollections: [
      { prefix: 'cer', dir: './app/assets/icons' }
    ]
  },

  // Installable, and the whole app is cached by a service worker: it opens without a network
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Cerulean',
      short_name: 'Cerulean',
      description: 'Записи, списки и страницы в одном месте. Работает офлайн.',
      lang: 'ru',
      start_url: '/',
      display: 'standalone',
      background_color: '#F6F8FA',
      theme_color: '#F6F8FA',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
    },
    client: {
      installPrompt: false
    }
  }
})
