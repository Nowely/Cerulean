# Cerulean client

Notion-like notes, lists and pages that run entirely in the browser: data lives in IndexedDB,
the app works offline as a PWA, and «Авто» sorts entries with local rules and, with the user's
own key, a model call: OpenAI, Anthropic, OpenRouter (key or «Войти через OpenRouter») or any
OpenAI-compatible API. The prompt lives in `app/domain/prompt.ts`, the calls in `app/domain/model.ts`.

## Stack

- Nuxt 4 as a SPA (`ssr: false`), Vue 3.5, auto-imports off: every file imports what it uses
- Nuxt UI 4 and Tailwind CSS 4, themed from `app/assets/css/tokens.css` → `main.css` → `app.config.ts`
- Pinia, IndexedDB (`idb`), OpenAI SDK (loaded only when Авто calls a model), `@vite-pwa/nuxt`
- Vitest with fake-indexeddb

## Commands

```bash
pnpm install
pnpm dev                 # http://localhost:3000, demo data at /?demo
pnpm test                # domain and store tests
EVAL_KEY=sk-… pnpm eval  # Авто on 51 lines against a real model, see eval/README.md
pnpm typecheck
pnpm lint
pnpm generate            # static build in .output/public, deployable to any static host
pnpm shots [filter]      # screenshots of the running app into shots/
```

CI (`.github/workflows/client.yml`) runs lint, typecheck and tests on every pull request that touches `Client/`.

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

## First load

The first download is only what the first screen shows: about 205 KB of JS (gzip) for Главная, against
304 KB before the split. Everything else loads after the first paint:

- screens are route chunks; the sidebar, previews, search and pickers are async components in `AppShell`
- menus, sheets, popovers and dialogs (Reka, Floating UI, vaul) come in with `useLater` once the browser is
  idle; until then their buttons render on their own, and a tap opens the menu as soon as its code is in
- board, table and calendar views, view settings and the new-page setup load when a page needs them
- no `<link rel="prefetch">` for lazy chunks (`build:manifest` hook): the service worker caches the rest

