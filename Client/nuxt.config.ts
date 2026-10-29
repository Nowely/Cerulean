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

  // Nuxt's own hourly look at builds/latest.json would reload on the next route change, and the service worker would
  // serve that reload the old build again: plugins/app-update.client.ts handles new versions instead
  experimental: {
    checkOutdatedBuildInterval: false
  },

  compatibilityDate: '2025-01-15',

  // The SPA shell is written to index.html at build time, so the service worker can precache it and the
  // installed app starts without a network (the server renders it on the fly otherwise, and nothing is cached)
  nitro: {
    prerender: {
      routes: ['/']
    }
  },

  hooks: {
    // No <link rel="prefetch"> for every lazy chunk: on a phone they compete with the first screen for
    // the network, and the service worker caches the whole app right after it anyway
    'build:manifest': (manifest) => {
      for (const chunk of Object.values(manifest)) chunk.prefetch = false
    }
  },

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

  // Installable, and the whole app is cached by a service worker: it opens without a network. A new build waits in the
  // worker until plugins/app-update.client.ts switches to it at a safe moment, never in the middle of typing
  pwa: {
    registerType: 'prompt',
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
      installPrompt: false,
      registerPlugin: false
    }
  }
})
