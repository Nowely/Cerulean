# Cerulean client

Notion-like notes, lists and pages that run entirely in the browser: data lives in IndexedDB,
the app works offline as a PWA, and «Авто» sorts entries with local rules and, with the user's
own OpenAI key, a model call.

## Stack

- Nuxt 4 as a SPA (`ssr: false`), Vue 3.5, auto-imports off: every file imports what it uses
- Nuxt UI 4 and Tailwind CSS 4, themed from `app/assets/css/tokens.css` → `main.css` → `app.config.ts`
- Pinia, IndexedDB (`idb`), OpenAI SDK (loaded only when a key is set), `@vite-pwa/nuxt`
- Vitest with fake-indexeddb

## Commands

```bash
pnpm install
pnpm dev                 # http://localhost:3000, demo data at /?demo
pnpm test                # domain and store tests
pnpm typecheck
pnpm lint
pnpm generate            # static build in .output/public, deployable to any static host
pnpm shots [filter]      # screenshots of the running app into shots/
```

`pnpm shots` opens every screen the mockups show, in light and dark, on a phone and a desktop
viewport, with the demo data and the clock at 19 Oct 2026, 9:14. `SHOTS_URL`, `SHOTS_OUT` and
`SHOTS_CHROMIUM` point it at another address, folder or browser binary.

The current state of the UI, compared screen by screen with the mockups, is in
[`docs/ui-current-state.html`](../docs/ui-current-state.html).

## Layout

- `app/domain`: logic without Vue (text parsing, Авто rules, dates, summaries, search, export, seed data)
- `app/stores`: `data` (pages, records, sections, settings), `journal` (Чат and Авто), `ui`
- `app/components`: `shell`, `home`, `chat`, `composer`, `page` (+ list, board, table, calendar layouts), `record`, `overlay`, `settings`, `common`
- `app/pages`: `/`, `/chat`, `/p/:id`, `/r/:id`, `/settings`, `/settings/descriptions`, `/settings/trash`
