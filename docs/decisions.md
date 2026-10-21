# Design decisions the client follows

One entry per decision: the date, the decision in one sentence, where it comes from, and where it lives in
`Client/`. Read the entries for an area before changing how it behaves. When a PR changes or adds a decision,
it adds or edits the entry here in the same PR.

Sources:

- **spec**: `spec/spec.md` in the mockups project. The lines are marked with the version that set them, such as **v21**.
- **delta**: a handoff file such as `handoff/v21-delta.md`. Its item numbers and the review ids (F…, V…, C…, O…) are used below.
- **QA**: `design/app-qa/report.md`, which lists bugs as B… and fresh-eyes findings as U….
- **Josh**: Josh's message in the project, with its date and time.

## Product and stack

- **2026-10-19 · The app is a browser-only SPA, offline first, with no backend.** Data lives in IndexedDB on the device. Source: Josh, 19 Oct. Code: `nuxt.config.ts` (`ssr: false`), `app/db/`.
- **2026-10-19 · Авто is a model call from the browser with the user's own key, or simple rules without one.** Source: Josh, 19 Oct. Code: `app/domain/model.ts`, `app/domain/rules.ts`.
- **2026-10-20 · Keep it simple.** No IndexedDB migrations or data protection, no sync, and CI runs only lint, types and tests (no screenshot checks). Source: Josh, 20 Oct 08:30. Code: `.github/workflows/client.yml`.
- **2026-10-20 · Desktop and phone share one logic.** They differ only in containers: sheet against popover, swipe against hover. Source: Josh, 20 Oct 19:09. Code: `ActionMenu.vue` and `AdaptiveOverlay.vue` (one component, two containers).
- **2026-10-21 · The installed app starts offline.** The SPA shell is prerendered to `index.html` and precached. Source: QA B2. Code: `nuxt.config.ts` (`nitro.prerender`, `pwa.workbox`).

## Look

- **2026-10-20 · The approved theme pair.** Light is «Строгий, плоский» (accent #1F5F8B, background #FCFCFB); dark is blue-graphite (background #161F26, accent #78B2DF). There are no gradients. Colours live only in `tokens.css`, and components use no colours, `:deep` or `!important`. Source: Josh, 20 Oct 11:35; spec «Visual language». Code: `app/assets/css/tokens.css`, then `main.css`, then `app.config.ts`.
- **2026-10-20 · Quiet first.** Colour is used only for meaning (accent, warn, ok), surfaces are separated by fill rather than borders, and each screen has one prominent thing. Source: spec v17. Code: throughout. Check new components against it.
- **2026-10-21 · Overdue reads the same everywhere.** It is the word «было …» in warn, and a warn dot in Календарь. Source: QA B17; delta v21 item 17. Code: `RecordRow.vue`, `CalendarLayout.vue`, `DueButton.vue`.

## Navigation

- **2026-10-20 · Главная has no tabs.** Its header holds Найти, Чат and «⋯», and there are no FABs. Source: spec v20; port delta (canvas 55). Code: `HomeHeader.vue`, `pages/index.vue`.
- **2026-10-20 · Pages without a section live in «Недавнее».** It lists the newest first by creation, shows five rows and «Ещё N», and replaces «Без секции». Source: Josh, 20 Oct 15:55; Fable review X6. Code: `stores/data.ts` (`recentlyMade`).
- **2026-10-20 · Compact rows on Главная show no statuses.** The right edge of a row is the page «⋯». Source: Josh, 20 Oct 15:58. Code: `HomeRow.vue`.
- **2026-10-21 · The desktop sidebar has no tree while Главная is open.** It keeps Главная, Найти, Чат, Входящие and Настройки; every other screen shows the whole tree. Source: delta v21 item 20 (V1). Code: `AppSidebar.vue`.
- **2026-10-21 · Desktop pages use Главная's title row.** The way back is a 13px line above the title («‹ Главная», «‹ Цели /»), and «⋯» sits in the title row. Source: delta v21 item 21 (C5). Code: `DeskBack.vue`, `PageView.vue` and `RecordView.vue` (`#menu` slot).
- **2026-10-21 · Links that are not navigation open the preview** (a right panel on desktop, a sheet on a phone). These are Сегодня rows, «Связано», docked receipt rows, found-card hits and «Открыть» in a Доска card's «⋯». Поиск hits stay navigation. Source: delta v21 items 10 and 25 (F4, idea 4). Code: `usePeek.ts`, `PreviewPane.vue`.
- **2026-10-21 · The section «⋯» holds Новая страница, Переименовать, Изменить порядок, Новая секция and Удалить секцию.** «Изменить порядок» moves a section one step up or down in a small sheet. This is an interim screen: the mockups have none, and v22 brings drag. Source: spec v20 (desktop); QA B14. Code: `SectionMenu.vue`, `SectionOrder.vue`.
- **2026-10-21 · Section captions on Главная are sticky.** Source: spec; QA B27. Code: `HomeCaption.vue`.

## Writing loop

- **2026-10-20 · One composer everywhere.** It is docked at the bottom, with the destination chip on the left. Source: port delta. Code: `AppComposer.vue`.
- **2026-10-21 · Day one writes without pages.** When a template fits, Авто makes that page in «Недавнее» and the first row says «новая страница из шаблона». «Отменить» removes the record and the page. When nothing fits, the Уточнение offers the starters not made yet. Source: delta v21 item 1 (F1, idea 1). Code: `stores/journal.ts`, `rules.ts` (`templateFor`), `PlaceChips.vue`.
- **2026-10-21 · The aim from «Отменить» is one-shot.** The text comes back aimed at the same page («→ Продукты, только эта запись»), and Авто returns after that send or when the text is cleared. Source: delta v21 item 2 (F2); QA B8. Code: `AppComposer.vue` (`once`).
- **2026-10-21 · One way to say «записано».** A send that lands on another page docks the receipt, Уточнение or found card above the composer, on every screen. Records never announce themselves with a toast, and a toast and a docked card never show together. Source: delta v21 item 3 (F6); spec «Toast». Code: `ComposerDock.vue`, `useNotify.ts` (`ui.toastAt`).
- **2026-10-21 · The receipt.** Its header reads «N записей → Page» with «Не туда» as a quiet button. The footer holds only «Отменить» (plus «в Чате ›» when docked on Главная). Undo names what it takes back («Отменить «Яблоки»», «Отменить последние 2»). The receipt stays docked until another replaces it. Source: delta v21 items 4 and 5 (F5, C6, C8); QA B9. Code: `ReceiptCard.vue`.
- **2026-10-21 · A recognised date is an accent button that opens the «Срок» sheet.** The sheet offers Сегодня, Завтра, В субботу, Без срока and time chips. There is no editing by words and no «Другое время…». Source: delta v21 items 7 and 26 (idea 2, reduced; Josh, 20 Oct 19:09). Code: `DueButton.vue`.
- **2026-10-21 · Mic.** It listens with a wave and «Слушаю…»; «Остановить» leaves the words as a draft. Offline the mic is faint, and a tap says «Диктовка без сети не работает». Source: delta v21 item 8 (V7). Code: `AppComposer.vue`.
- **2026-10-21 · Входящие chips say what they do** («→ Задачи», «Ещё…»), and a pick toasts with «Отменить». Guesses are recomputed from the current pages. A line a starter fits, with no matching page, offers the starter rather than an unrelated recent page. Source: delta v21 item 9 (O1, F3); QA B13; QA U5. Code: `RecordRow.vue`, `stores/journal.ts` (`guessesFor`), `rules.ts` (`classify`).

## Pages, records, views

- **2026-10-21 · Titles are edited in place.** They wrap and are never cut. Enter or leaving the field saves, Esc reverts, and «Переименовать» in «⋯» focuses the title. Source: delta v21 items 11 and 27 (V3); QA B5. Code: `TitleField.vue`.
- **2026-10-21 · Views.** There is no «+» after the tabs: «Новый вид» lives in «Настроить вид», and Сегодня has no view bar. A «Выбор» property cannot be saved without options. Source: delta v21 item 14 (O6, O3, C3); QA B12. Code: `PageView.vue`, `ViewSettings.vue`.
- **2026-10-21 · Доска.** On a phone it shows one column at a time, with a wrapping strip of columns. Every card has «В «next» →»; on desktop it shows on hover. Its «⋯» starts with «Открыть», then the columns. A move toasts with «Отменить», and the open column stays where it is. Source: mockups Board/MobileBoard; QA B13, B26, G7. Code: `BoardLayout.vue`.
- **2026-10-21 · A long list shows 100 rows and «Показать ещё».** Menu sheets mount only when first opened. With 600 records, opening a page went from 9.7 s to 0.7 s. Source: QA B4. Code: `ListLayout.vue`, `ActionMenu.vue`.
- **2026-10-21 · A row swipe uses `touch-action: pan-y`,** so the browser keeps vertical scroll and leaves the sideways drag to the row. Source: QA B1. Code: `RecordRow.vue`, `useSwipe.ts`.

## Settings and edges

- **2026-10-21 · Подключение has labelled fields.** «Сохранить» is visible from the start and disabled until the form is complete. OpenRouter leads with sign-in, and its manual key folds away. Source: delta v21 item 19 (F8, O7); QA B24, B25. Code: `ConnectionEditor.vue`.
- **2026-10-21 · Корзина goes back where it came from.** «Удалить навсегда» uses a warn bin glyph. Source: delta v21 item 18 (O4); QA B18, B19. Code: `pages/settings/trash.vue`.
- **2026-10-21 · An unknown address shows a calm Russian page with «На главную».** A preview of something that never existed closes with a toast. Source: QA B28. Code: `app/error.vue`, `AppShell.vue`.
- **2026-10-21 · A toast's action closes the toast.** Source: QA B23. Code: `useNotify.ts`.

## Not built on purpose

- Ideas 3 (desktop Главная as a desk) and 5 (date swipe) from v21. Source: Josh, 20 Oct 19:09.
- «Другое время…» in the Срок sheet: it has no screen yet.
- Sections 2 and 3 of `design/app-qa/summary-ru.md`. They wait for Josh's decision.
