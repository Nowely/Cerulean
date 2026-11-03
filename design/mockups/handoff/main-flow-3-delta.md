# Main flow delta 3: Josh's 17 notes of 29 Oct (phone)

Items 1–11 are the small notes; items 12–22 are the big topics (the hold and subitems in lists, the record card, views over one table and the phone table, filter and sort, the shopping list with stock, AI functions and icons). One PR for all of it.

**Status: the decisions and scope of this delta are approved; app implementation is in progress on the branch for PR #20. Final acceptance and merge are not confirmed; see the PR for the published revision.** This is the working delta, based on the recovered draft in `../recovery/handoff/main-flow-3-delta.md`. The working Canvas and prototype are the local reconstruction in `design/mockups/`, not published Canvas 87 or prototype 15, and are not a byte-exact recovery of `99ac6ff`. Everything not named here stays as merged in PRs #16–#19. Item 11 was merged separately in PR #19; item 8 covers the remaining shared notice swipe.

**Approved clarification (2 Nov 2026):** a tracked amount is low when it is at most 1 **and** below its norm, including fractional values. One shared editor on the record card and in a table cell changes the remaining amount, norm and that record's unit; the list keeps quick − / + controls. Product expiry and buying by date are outside this iteration. Ordinary task due dates remain unchanged.

**Revised decision (2 Nov 2026):** writing a product creates a new record, including when the same product already exists in «Куплено» or «Запасы». No automatic reuse or comparison dialog; existing records and their stock are unchanged. This replaces the earlier clarification and item 19's historical prototype. Existing shopping pages still enable stock explicitly, without overwriting their settings.

**Status:** the local prototype demonstrates the quantity rule, shared editor, opt-in flow for an existing shopping page and the revised repeat-entry rule; see `stock-design.md`. Those additions do not imply that the historical prototype included them. Other agent-selected defaults are identified in `client-brief-main-flow-3.md`, not silently promoted to explicit user choices.

- **Why:** Josh tried the app on his phone and sent 17 notes on 29 Oct at 19:51Z («Давай предпримем новую итерацию»). At 20:19Z he chose to take all of them in one round and one PR. The rule of 28 Oct still holds: touch a minimum, and change anything else only on his command.
- **Where:**
  - Local reconstructed Canvas: `design/mockups/index.html` (serve as described in `design/mockups/README.md`).
    - «Итерация 3: Главная»: И1 Главная ten days in (`i3home`), И2 a section's «⋯» (`i3secmenu`), И3 the hold (`i3hold`), И4 the drag (`i3drag`), И5 dropped (`i3dropped`), И6 the notice swiped (`i3swipe`).
    - «Итерация 3: списки и новая версия»: ИС1 Покупки with one thing (`i3shop1`), ИС2 Покупки by department (`i3page`), ИС3 Входящие, newest last (`i3inbox`), ИС4 the update banner (`i3update`), ИК1 the banner on a computer (`deski3update`).
    - «Итерация 3: большие темы»: ИЗ1 subitems in Ремонт (`i3nest`), ИЗ2 a held row and its menu (`i3nesthold`), ИЗ3 dragged onto a record (`i3nestdrag`), ИЗ4 nested (`i3nestdrop`), ИЗ5 a record with subitems (`i3card`), ИЗ6 Хлеб (`i3prod`); ИТ1 «Запасы» (`i3stock`), ИТ2 − and + open (`i3step`), ИТ3 one left (`i3low`), ИТ4 «Новый вид» (`i3newview`), ИТ5 the table (`i3table`), ИТ6 «Настроить вид» (`i3viewset`), ИТ7 «Фильтр и сортировка» (`i3filter`), ИТ8 a property's values (`i3filtervals`), ИТ9 filtered, with its chip (`i3filtered`), ИТ10 written again (`i3readd`); ИФ1 «ИИ» without a key (`i3ai`), ИФ2 with one (`i3aion`), ИФ3 a new page «Дача» (`i3dacha`), ИФ4 «Значок и цвет» (`i3icon`).
  - Local reconstructed prototype: `design/mockups/prototype.html` with hashes as above (`#i3home`, `#i3hold`, `#i3stock`…). On a phone: hold a card on Главная, then move it; swipe a notice; in Ремонт hold a row and drag it onto another; in Покупки → «Запасы» tap a number.
  - Recovered sources: `design/mockups/project/Flow.dc.html` and the shared components in `design/mockups/project/`; their shared stylesheet is synchronized with `design/mockups/tools/sync_css.py`. The original `flow/flow.css`, `tools/flowplay.mjs`, `spec/spec.md`, `screens.json` and mockups bundle were not recovered. The local structural check is `python3 design/mockups/tools/validate.py`; it does not replace behavioural acceptance.
- **Phone first.** The computer gets the same captions, icons, order and banner (one logic). The hold and drag are the phone's; on the computer the card's «⋯» stays as it is.

## What this overrules

| Earlier rule (the app today) | Now | Source |
|---|---|---|
| Each icon on Главная sits on a 36 px plate (v18) | The icon is bare, 22 px in a 24 px place | Josh 5; his card, 29 Oct 21:20Z: «Без плашек + серая» (item 4) |
| Главная, a page and a record share the paper `--bg` | Главная on the side surface `--side`; pages and records on paper | Josh 7; the same card (item 5) |
| Lists show the newest record first | A record written from the field or «+ Новая запись» goes last in its list or group | Josh 6 |
| Покупки shows a department caption from the first thing | Captions only once the list holds two departments or more | Josh 3 |
| A long press on a card opens the page's full «⋯» sheet | A hold lifts the card with a compact menu beside it; moving it drags it | Josh 10 |
| «⋯» only on a person's own sections; «+» only on «Мои страницы» | Every caption has «⋯» and «+» | Josh 4 |
| A long press on a row lifts it and opens the row's «⋯» sheet on release | The hold opens the row's compact menu at once; moving drags | Josh 10 (item 12) |
| Subitems show only as «0/1» on the right of their record | Subitems stand under their record in the list, three levels, «1/3 ⌄» folds them, a drop onto a row nests | Josh 17 (item 13) |
| A record lists its properties as labelled rows, «Добавлено» on top | Values under the title in one line, no labels, no plates; «Добавлено» at the bottom | Josh 11, his «Мне ок» 21:22Z (item 14) |
| v21 O6: «Новый вид» only inside «Настроить вид», no «+» beside the tabs | «+» after the tabs opens the layout tiles | Josh 12, option A approved 21:22Z (item 15) |
| A tap on the open tab opens a menu of three | It opens «Настроить вид»; the menu stays on a long press | Josh 12, the same (item 15) |
| The sliders button opens «Настроить вид» | It opens «Фильтр и сортировка» | Josh 13, the same (items 15, 17) |
| v22: a table on a phone is drawn as cards | A real table: the name column stays, the others scroll sideways | Josh 12, the same (item 16) |
| «Фильтр»: fixed chip sets (Срок, Сделано, Метка) | One sheet: sort, «Сделано», every choice property with ticks; a filter on a property is a chip under the tabs | Josh 13, the same (item 17) |
| Stock: an always-visible «− value +» and a second line «мало · норма N»; low = value < norm | «value/norm» in the row, − and + on a tap for 3 s; low = value ≤ 1 and value < norm, in orange | Josh 16 at 21:30Z; «Тап по 3/5: − и +» 21:36Z; clarification 2 Nov (item 18) |
| «Купить» never shows a thing with «Осталось»; «Запасы» only in the demo | A low thing joins «Купить» by itself, ticking it refills it; the Покупки template has «Осталось» and «Запасы» | Josh 16 at 21:30Z (item 18) |
| Settings group «Раскладка» | Group «ИИ», one switch per function | Josh 15, option A (item 21) |

## Главная

1. **«Ещё N» stays as it was left** (Josh 1).
   - The app already keeps a folded section after a reload. What it forgets is «Ещё N» under «Мои страницы»: opened, it closes again on the way back to Главная. Keep it the same way as a section's fold, in the settings, so it survives going to a page and back and a reload.

   **Check:**
   - With seven pages in «Мои страницы», tap «Ещё 2». Open a page and come back: all seven still show, with «Свернуть». Reload: the same.
   - Tap «Свернуть», reload: five rows and «Ещё 2».
   - Fold «Дом», reload: still folded (unchanged).

2. **Section captions as in Codex** (И1, И2; Josh 4).
   - Every caption, «Мои страницы» and «Избранное» included, is: the name and a 14 px chevron (a tap folds; the chevron turns −90°, and a folded caption adds «· N»), then on the right «⋯» and «+», each 36×32 px with a 44 px hit area, `muted`.
   - «+» makes a new page in that section and opens it, title in focus (as «+» of «Мои страницы» does today). In «Избранное» the new page is starred and lives in «Мои страницы».
   - «⋯» opens a compact menu at the dots (part «Меню», variant «Секция»), not a sheet: 232 px wide, its top 2 px under the caption, right-aligned, `--elev`, 1 px `--line` (`--line2` in dark), radius 14, `--float`; 44 px rows with an 18 px icon. A tap outside closes it.
     - A section of the person's own: «Переименовать», «Изменить порядок», «Новая секция», then apart «Удалить секцию» in `--warn-ink`. This is today's menu less «Новая страница», which is now the «+».
     - «Мои страницы» and «Избранное»: «Новая секция» only.
   - «Новая секция» puts the section right under this one (under «Мои страницы»: first of the person's own) with its name selected in a field. Enter keeps it, Esc keeps «Новая секция».
   - «Удалить секцию» acts at once, without a confirm (a medium action): its pages move to «Мои страницы», and the notice says «Секция Дом удалена, 2 страницы в Моих страницах · Отменить». «Отменить» brings the section back with its pages, in place.

   **Check:**
   - Главная with sections Дом and Личное (И1): every caption has the chevron, «⋯» and «+». Tap «Дом»: its pages hide and the caption reads «Дом · 2 ›»; tap again, they are back.
   - «⋯» of Дом: four items as in И2, at the dots, not a sheet. A tap outside closes it.
   - «Удалить секцию»: Дом is gone, Покупки and Дела по дому are in «Мои страницы», and the notice reads as above. «Отменить»: Дом is back with both, in place.
   - «⋯» of «Мои страницы» → «Новая секция»: a section appears first among the person's own, its name a selected field. Type «Работа», Enter: the caption reads «Работа».
   - «+» of Дом: a new page opens with the caret in its title. Name it «Дача», go back: «Дача» is in Дом.

3. **Hold a card: a menu, then a drag** (И3–И5; Josh 10, 8).
   - **The hold.** A finger still for 0.4 s on a card lifts it: the card moves to `--elev` with `--float` and a 1 px `--line` ring, scales to 1.02 in 150 ms, and a short haptic plays (`navigator.vibrate(10)` where there is one). Everything else goes under a veil: the page's surface at 55 % with a 6 px blur. The card's compact menu opens 8 px under it, left-aligned at the card, 256 px wide (part «Меню», variant «Карточка»). When the card is in the lower half of the screen, the menu opens over it.
   - **Release without a move:** the menu stays. A tap on the veil closes it. A tap on the lifted card opens the page. A second hold right after works the same (the bug of note 8: haptic and no menu must not happen).
   - **Move after the lift** (more than 6 px): the menu goes, the card follows the finger at scale 1.04 with a deeper shadow, and the others make room in 180 ms. Section captions take part, so a card can go into another section, a folded one too (dropped on its caption, it goes first in it).
   - **Drop:** the card takes its place. In its own section that is a light action: it just happens. Into another section the notice says «Перемещено в Дом · Отменить», and «Отменить» puts it back where it was.
   - Before the lift a move of more than 8 px is a scroll, and nothing lifts. While a card is lifted the list does not scroll under the finger.
   - Входящие and Сегодня stay on top: a hold opens their menu, and they do not move.
   - **The card's menu:** «Переименовать», «Значок и цвет», «Добавить в избранное» (or «Убрать из избранного»), «Переместить в секцию», «Скопировать как текст», then apart «Удалить» in `--warn-ink`. Входящие and Сегодня: «Добавить в избранное» and «Скопировать как текст». What is about the page's content («Что сюда класть», «Заметка к странице», «Свойства», «Шаблоны») stays in the page's own «⋯». «Удалить» acts at once with «Страница в корзине · Отменить».
   - The order the person sets is kept. A new page still goes first in «Мои страницы» (`main-flow-2-delta.md`, acceptance of PR #17).
   - No text selection or system callout on a held card.

   **Check (a phone, or touch emulation):**
   - Hold Ремонт 0.5 s and let go: the card is lifted over a veil and the menu as in И3 is under it, with the six items above. The page did not open.
   - Tap the veil: the menu is gone. Hold Ремонт again at once: the menu opens again.
   - Tap Ремонт briefly: the page opens.
   - Hold Ремонт and move it down between Покупки and Дела по дому: the cards there part (И4). Let go: Дом reads Покупки, Ремонт, Дела по дому, and the notice «Перемещено в Дом · Отменить» shows (И5). «Отменить»: Ремонт is back in «Мои страницы», in its place.
   - Hold Подарки and move it above Быстрый старт: the order changes and no notice shows.
   - Hold Входящие and move: the menu opens, Входящие does not move.
   - Swipe the list up and down fast: it scrolls, nothing lifts.

4. **The icons without plates** (И1; Josh 5; his card 29 Oct 21:20Z «Без плашек + серая»).
   - The glyph alone, 22 px in a 24 px place, `muted`, no plate. «Компактный» is unchanged (18 px). On the computer a fresh card's glyph turns `--accent` with no plate, and goes back after the same 4 s.

   **Check:** Главная «Со сводкой»: no plate behind any icon, as in И1, light and dark.

5. **The surfaces** (И1, ИС2; Josh 7; the same card).
   - Главная on `--side` (#F1F1EF light, #0B1216 dark), its dock too. Pages, records and Настройки stay on `--bg` (paper). Phone and computer then say the same: the list on the side surface, what is open on paper.

   **Check:** Главная's background is rgb(241, 241, 239) in light and rgb(11, 18, 22) in dark; open Покупки: rgb(252, 252, 251) and rgb(22, 31, 38).

## Lists

6. **New records last** (ИС3, ИС2; Josh 6).
   - In every list, a record written from the field or from «+ Новая запись» goes last: in Входящие, Задачи, Идеи and the person's own lists, and last in its department in Покупки. Lists show records oldest first, in the order they were written.
   - Сегодня keeps its order by time. «Сделано» is unchanged.
   - Главная's summary lines stay as they are (newest first, dated first): the default told to Josh on 29 Oct, 21:22Z.
   - The fresh tint (delta 1, item 9) marks the new record where it lands; the list scrolls so it is in view.

   **Check:**
   - Входящие with two records; write «Позвонить в сервис» in the field there: it is last, tinted (ИС3).
   - Tap «+ Новая запись», type «Купить лампочку», Enter: it is last.
   - Покупки with Сыр and Яйца; send «Молоко»: Молочное reads Сыр, Яйца, Молоко.

7. **Покупки group from two departments** (ИС1, ИС2; Josh 3).
   - One department in the open list: no caption, the records are a plain list. From two departments on, each department's caption is its own chip (`--b-*` fill, `--c-*-ink` text, 24 px tall, radius 6, 14/500) with the fold chevron, as now.
   - A department is still read and kept for each record from the first one, so a caption appears the moment a second department comes in.

   **Check:**
   - Empty Покупки, send «Хлеб»: one plain row, no «Хлеб и выпечка» caption (ИС1).
   - Send «Молоко»: two captions appear, «Хлеб и выпечка» and «Молочное».
   - Tick «Молоко» so one department is left open: the caption goes again.

8. **A notice goes sideways** (И6; Josh 2).
   - A notice follows the finger sideways: it moves by the finger, its opacity falls with the distance, and it goes once it is past a third of its width or flicked (over 0.5 px/ms). A shorter drag springs back in 150 ms. Vertical moves are the page's (`touch-action: pan-y` on the notice).
   - What it reported stays done: a swipe is not «Отменить». «Отменить» still works by a tap; a drag that starts on it does not swipe.
   - The same holds for the update banner (`update-banner.md`), which a swipe hides until the next launch.

   **Check:** move a page to another section; swipe the notice right by 200 px: it goes, and the page stays moved. Drag it 40 px and let go: it comes back.

## Back

9. **Back closes the top layer first** (Josh 9).
   - The system Back (the edge swipe, Android's back) closes what is on top, one thing per Back, before it leaves the page: the card's menu, a section's menu, a page's «⋯» sheet and every other sheet, the places list, a dialog, then the open field (it closes and keeps its words, like Esc on the computer). Only then does Back leave the page or the record.
   - The order is the computer's Esc order (`computer-delta.md`, item 20).
   - One way to do it: opening a layer pushes a history entry with no URL change; Back pops it and closes the layer; closing the layer any other way goes back over its entry so history stays clean.

   **Check (Playwright `page.goBack()`, then a real phone):**
   - Open Покупки, open its «⋯»: Back closes the sheet and Покупки is still open. Back again: Главная.
   - On Главная hold a card: Back closes the menu, Главная stays.
   - Open the field and type «сыр»: Back closes the field; tap it again: «сыр» is there.
   - Open a record from Покупки, open the places list of its field or a property sheet: Back closes that; Back again: Покупки.
   - Close the «⋯» sheet with a tap outside, then Back: Главная (no dead Back step).

## Motion

10. **Small animations** (Josh 14).
    - Screens: Главная → page → record and back slide by View Transitions (`experimental.viewTransition` in Nuxt), about 200 ms, ease-out: forward comes in from the right, Back goes the other way.
    - Rows: a new record fades in and rises 4 px in 150 ms where it lands; a row leaving for «Сделано» keeps its current fade; a moved row slides to its place in 180 ms (`TransitionGroup` move).
    - The notice comes up 8 px with a fade in 150 ms and goes with a 150 ms fade.
    - Folding a section turns its chevron in 150 ms; its rows fade in 120 ms.
    - The hold and the drag as in item 3.
    - With «reduce motion» on, nothing moves: changes are instant (View Transitions already skip; the CSS uses `prefers-reduced-motion`).
    - Durations follow the «Вес действий» table: light actions 100–150 ms, a change of screen about 200 ms.

    **Check:** open Покупки from Главная: the page slides in from the right in about 200 ms; Back slides it out. Send a record on a page: it rises into place. In dev tools emulate «prefers-reduced-motion: reduce»: both are instant.

## The update banner

11. Built by the thread «Подтягивать новую версию приложения» from `update-banner.md` (ИС4, ИК1) and merged in PR #19. Only the shared swipe (item 8) is here.

## Lists: the hold and subitems

12. **Hold a row: its menu, then a drag** (ИЗ2, ИЗ3; Josh 10, the same gesture as a card on Главная, item 3).
    - Today a long press lifts the row and letting go opens the row's «⋯» sheet. Now the row behaves as a card on Главная: a finger still for 0.4 s lifts it (`--elev`, `--float`, 1 px `--line` ring, scale 1.02, the haptic), the rest of the page goes under the veil, and the row's compact menu opens 6 px under it at 44 px from the left, 280 px wide (part «Меню»); in the lower half of the screen it opens over the row.
    - The menu is the row's «⋯» as it is today (Открыть, Переместить на другую страницу, Сделать шаблоном (not on a subitem), Добавить в избранное, Скопировать текст, then apart Удалить), with the nesting items of item 13 first.
    - Release without a move: the menu stays; a tap on the veil closes it; a tap on the lifted row opens the record. Moving more than 6 px after the lift drags the row (the menu goes); before the lift a move of more than 8 px scrolls.
    - The swipe left (Переместить, Удалить) and the computer's hover, ⋮⋮ handle and right click stay as they are.

    **Check:**
    - Ремонт: hold «Купить краску» 0.5 s and let go: the row is lifted over a veil with the menu under it; nothing opened.
    - Tap the veil: the menu is gone. Hold again at once: it opens again.
    - Swipe «Купить краску» left: «Переместить» and «Удалить», as today.

13. **Subitems in the list** (ИЗ1–ИЗ4; Josh 17).
    - A record's subitems (records with `parentId`, as the record page already has them) stand under it in the list, one step in per level: 36 px for the first, 68 px for the second (the circle moves, the text follows). Three levels at most: a record, its subitem, the subitem's subitem; deeper ones stay on the record page.
    - A record with subitems ends with «done/all» and a 14 px chevron in `muted` («1/3 ⌄»), 44 px tall. A tap folds them: the chevron turns −90° and the subitems hide; the fold is kept per record, like a section's fold (item 1). A ticked subitem stays in place, struck through, while its parent is open.
    - Today's «0/1» on the right becomes this button. Where the list shows a record without its subitems (Сегодня, a collecting view, the table's grouping), «1/3» stays as text.
    - The hold menu of a row adds, first: «Вложить в «X»», where X is the record right above at the same level and that record can take it (the result stays within three levels); on a subitem, «Вынести из подпунктов» (it goes right after its parent, one level up). A record moves with its own subitems.
    - The drag (item 12) can nest: while the finger is over the middle half of a row that can take it, that row lights up (`--accent-soft` with a 2 px `--accent` inset ring); let go, and the dragged record becomes its last subitem. Over the top or bottom quarter, a 2 px `--accent` line with a ring at its start shows where it goes, starting at the depth it will take (48 px plus 32 px per level). A drop at another level changes the parent.
    - Notices: nesting says «Вложено в «X» · Отменить», taking out «Вынесено из «X» · Отменить»; a reorder within the same parent says nothing (light). «Отменить» puts the record back with its subitems, parent and order as they were.
    - Ticking a parent does not tick its subitems (as on the record page today).

    **Check:**
    - Ремонт as in ИЗ1: «Выбрать плитку в ванную» shows «1/3 ⌄» with its three subitems under it, one step in, «Замерить стены» struck through. Tap «1/3»: they hide and the chevron turns. Reload: still folded.
    - Hold «Купить краску»: the menu starts with «Вложить в «Покрасить стены»» (ИЗ2). Tap it: «Купить краску» stands under «Покрасить стены» one step in, «Покрасить стены» reads «0/3», and the notice «Вложено в «Покрасить стены» · Отменить» shows. «Отменить»: it is back where it was.
    - Drag «Купить краску» over the middle of «Покрасить стены»: that row lights up (ИЗ3); let go: nested, as above (ИЗ4).
    - Drag a subitem out to the left of its parent's level and let go between two records: it is a record of its own, and the notice says «Вынесено из «…»».
    - Hold «Замерить стены»: the menu has «Вынести из подпунктов» and no «Сделать шаблоном».

## The record

14. **The record card: values under the title** (ИЗ5, ИЗ6; Josh 11, the card «Мне ок», 21:22Z).
    - Under the title, its values in one line that wraps, aligned with the title's text, no label column: a choice as its coloured chip (Отдел, Комната), a date and other values as a 16 px icon and the words («сб, 2 ноя»; the due date in `--accent-ink`), a number with a norm as in item 18. No plates or backgrounds behind them (Josh 29 Oct 22:14Z): only the option chips keep their colours. Gap 4 px between lines, 16 px between values. Last, a bare «+» (24 px, `faint`) adds a property (today's «+ Свойство»).
    - A tap on a value changes it, as a tap on its row does today (the same sheets).
    - Then the note (the body, as today), then «Подпункты 1/3 ⌄» as a caption that folds them (only when there are subitems) and «+ Подпункт», then «Добавлено …» at the bottom, 13 px `faint`.
    - Empty values are not shown; «+» offers them.
    - Today's one row per property with a label and «Добавлено» on top go. The computer's record (the right pane) takes the same order.

    **Check:**
    - Open «Хлеб» (ИЗ6): «Хлеб и выпечка» as a chip, then «1 из 2 шт» in orange with a box icon and «+»; no grey plates behind the values. «Добавлено сегодня, …» is the last line. The historical prototype's «годен до завтра» is not an expiry requirement for this iteration.
    - Open «Выбрать плитку в ванную» (ИЗ5): «Ванная», «сб, 2 ноя» in accent, the note «Белая матовая, 30×60. Затирка в тон», «Подпункты 1/3 ⌄» with three subitems. Tap «Ванная»: the choice sheet; pick «Кухня»: the chip reads «Кухня».
    - Tap «Подпункты 1/3»: the subitems fold.
    - Desktop at 1440×900: open a record from a page; the same value → note → subitems → «Добавлено» order is used. Open a choice property, select another option, and verify the value changes and the overlay closes. The reconstructed prototype can be exercised via `#deski3update` → «Хлеб» → «Отдел»; the older `#deskrec` remains historical.

## Views over one table

15. **Views: «+» after the tabs, a tap on the open tab opens «Настроить вид»** (ИТ4, ИТ6; Josh 12).
    - After the last tab a «+» (32 px, `faint`, a 44 px hit area): it opens «Новый вид», four tiles with their pictures (Список, Таблица, Доска, Календарь; part «Шторка выбора», variant «Новый вид»). A tile makes the view the way «Новый вид» does today (right after the current tab, named after its layout, with the current view's «Сделано») and selects it; the sheet closes. «Новый вид» in «Настроить вид» and in the tab menu opens the same tiles.
    - A tap on the open tab opens «Настроить вид» itself (it was a menu of three: «Настроить вид», «Новый вид», «Удалить вид»; both of the others are inside the sheet). A long press or a right click on a tab keeps that menu.
    - «Настроить вид» stays as it is (v24): Название вида, Откуда записи, Как показывать, Группы, Фильтр, Сортировка, «Справа в строке», Новое свойство, Новый вид, Удалить вид (ИТ6).
    - The bar's right side: «Найти на странице» (unchanged), then the sliders button, which now opens «Фильтр и сортировка» (item 17), no longer «Настроить вид».
    - Tabs that do not fit scroll with the fade over their last 32 px, as today; «+» scrolls with them.

    **Check:**
    - Покупки: tap «+» after «Куплено»: «Новый вид» with four tiles (ИТ4). Tap «Таблица»: a tab «Таблица» right after «Купить», selected, showing the table (item 16 below).
    - Tap «Купить» while it is open: «Настроить вид» opens at once, with «Купить» in its name field (ИТ6).
    - In it tap «Удалить вид» on «Таблица»: the tab goes with «Вид «Таблица» удалён · Отменить»; «Отменить» brings it back.
    - Long-press «Запасы»: the tab menu, as today.

16. **The table on a phone is a table** (ИТ5; Josh 12; overrules v22's cards on a phone).
    - The phone shows the table as on the computer: a header row (13/500 `muted`, 36 px), then one 44 px row per record. The first column (176 px) holds the circle and the name and stays in place (`position: sticky; left: 0` on the page's background); the other columns scroll sideways under it with the record's properties in the page's order, «Заметка» and «Добавлено» last; a 44 px «+» at the end of the header adds a property («Новое свойство»). Cells are 15 px, 1 px `--line` between rows and columns; widths as in `flow.css` (`.w-*`).
    - A tap on the name opens the record, the circle ticks it, a tap on a cell changes that value (a choice opens its sheet, text is edited in place).
    - A subitem's name cell is indented 20 px per level; only the view's own records are rows (subitems show when their parent is in the view).
    - Values look as in the list: an option is its chip, a due date in `--accent-ink`, «Осталось» as in item 18.

    **Check:**
    - Покупки → «Таблица» (ИТ5): columns Название, Отдел, Количество, Осталось, Заметка, Добавлено. Scroll the table sideways by 300 px: the names stay where they were, the other columns move.
    - Tap the «Отдел» cell of «Кофе», pick «Прочее»: the cell reads «Прочее».
    - Tap the name «Хлеб»: its record opens. Tap a circle: the row is ticked.

## Filter and sort

17. **«Фильтр и сортировка», one sheet as in Notion** (ИТ7–ИТ9; Josh 13).
    - The sliders button on the right of the tabs opens «Фильтр и сортировка» (part «Шторка выбора», variants «Фильтр», «Значения»). From «Настроить вид» → «Фильтр» the same sheet opens, with «‹» back to «Настроить вид».
    - On top, «Сортировка»: one row with today's choice (Вручную, По сроку, По названию).
    - Then «Фильтр»: «Сделано» (on Покупки «Куплено») with today's choices (Не сделано, Сделано, Все), then every property whose values can be ticked: each choice property (Отдел, Комната) and «Срок» with today's chips (Просрочено, Сегодня, На неделе, Без срока). Each row shows what is picked, or «Любой». «Метка» stays where it is today (Входящие).
    - A property opens its values with a checkbox each, an option in its colour, and on the right how many of the view's records have it (none: `faint`). Ticks apply at once; «Очистить» on the left of the footer, «Готово» on the right; «‹» back.
    - A filter on a property (not «Сделано», which is what the view is for) is the person's own: the sheet's title line says «1 фильтр» and «Сбросить» (clears them all); the sliders button turns `--accent-ink`; and under the tabs each such filter is a chip «Отдел: Молочное ×» (`--accent-soft`, `--accent-ink`, 32 px, radius 8). A tap on the chip opens its values; «×» removes it at once (light).
    - Filters are kept per view, as today's are.
    - Today's chip sheet «Фильтр» (Срок · Сделано · Метка) goes: its choices are rows of this sheet.

    **Check:**
    - Покупки «Купить»: tap the sliders: «Фильтр и сортировка» with «Сортировка: Вручную», then «Куплено: Не куплено», «Отдел: Любой», «Срок: Любой» (ИТ7).
    - Tap «Отдел»: departments with checkboxes in their colours and counts (ИТ8). Tick «Молочное», tap «Готово»: the list shows Сыр, Яйца, Молоко; the chip «Отдел: Молочное ×» is under the tabs and the sliders are blue (ИТ9).
    - Tap «×» on the chip: the list is whole again, the chip is gone.
    - Switch to «Запасы» and back: «Купить» still has its filter only if it was left on (kept per view).

## The shopping list

18. **«Осталось» on the row: the number and its norm, − and + on a tap** (ИТ1–ИТ3, ИЗ6; Josh 16 as he put it at 21:30Z; his card at 21:36Z «Тап по 3/5: − и +»; the unit, 22:15Z).
    - A number property with a norm (Покупки's «Осталось» with «Норма», as in the demo) shows on the row as «value/norm», 15 px tabular, `muted`, no plate, at the row's right (where «Справа в строке» has it on). The unit «шт» goes without saying; any other unit is written after it («2/4 уп»).
    - A tracked amount is low when it is at most 1 **and** below its norm: the number turns `--warn-ink` (orange). This includes fractions: `0,5/2` is low, while `1/1` and `0,5/0,5` are full. It replaces today's second line «мало · норма N» and today's rule «value < norm». An empty value is not zero and does not by itself enable tracking. Product expiry does not trigger a purchase in this iteration.
    - A tap on the number opens «− value/norm unit +» in its place (44×36 px buttons, the value with its unit, «3/5 шт»); each tap is ±1. It folds back to the number after 3 s without a touch. While it is open the list does not reorder under the finger. It replaces today's always-visible stepper. New values are finite nonnegative numbers without an artificial maximum; minus at zero does nothing. Do not silently truncate existing fractional, negative or greater-than-99 values.
    - The record card shows it in full, «1 из 2 шт», with a 16 px box icon; a tap opens the shared amount, norm and unit editor (item 14). The list's − and + remain available without opening the card.
    - One editor on the record card and in the table cell changes that record's remaining amount, norm and unit. The page defines the property; the record owns its values and can use a different unit from another record on the same page. Changing a unit does not automatically convert the numbers.
    - When a thing becomes low it goes into «Купить» by itself (its tick clears), and the notice says «Кола теперь в «Купить»» (no «Отменить»: «+» takes it out again).
    - Ticking it in «Купить» means it was bought: the value goes back to its norm (it stays in «Запасы», full).
    - «Купить» shows what is not bought, and a thing with «Осталось» only while it is low (today: never). «Справа в строке» of «Купить» has «Количество» and «Осталось» on; of «Запасы», «Осталось».
    - «Запасы» keeps the order the records were written in (no sort by what runs out).
    - The Покупки template gets «Осталось» (число, шт) with «Норма» and the view «Запасы» (filter: «Осталось» is not empty), as the demo has them, so a new Покупки page can keep stock.
    - An existing shopping page offers an explicit way to enable stock tracking. It must not overwrite the page's existing settings, views or properties; the interaction and handling of existing data need a design and compatibility check before implementation.

    **Check:**
    - Покупки «Запасы» (ИТ1): Йогурт 2/5, Кола 3/5, Туалетная бумага 2/4 уп, Хлеб 1/2 in orange; no plates.
    - Tap «3/5» of Кола: «− 3/5 шт +» (ИТ2). Tap «−» twice: «1/5 шт» in orange and the notice «Кола теперь в «Купить»» (ИТ3); the rows did not move. Wait 3 s: «1/5» again, in orange.
    - «Купить»: Кола is there with «1/5». Tick it: it leaves; «Запасы» shows «5/5».
    - In «Настроить вид» of «Купить» switch «Осталось» off: «Хлеб» loses its «1/2».
    - New page from the template «Список покупок»: «Настроить вид» → «Справа в строке» lists «Осталось».
    - For an item with unit «уп», decrement and increment in the open stepper, then fold it: the unit remains «уп». Mark a low-stock item bought and reopen its stepper: the refilled value still has «уп». For «шт», the folded row omits the unit while the open stepper and record card include it.
    - Check low-stock states `1/1` (not low), `0/1` (low), `1/5` (low), `0,5/2` (low) and `0,5/0,5` (not low). Mark a low `0/1` item bought: it becomes `1/1` and leaves «Купить».
    - Change an item's remaining amount, norm and unit from the record card; open the same item in the table and verify the same values. Change them in the table and verify the card and list reflect the result, without changing other records.
    - On an existing shopping page with customized views and properties, explicitly enable stock tracking: its existing settings, views and properties remain intact, and stock can be tracked on a record. Verify the specific interaction once designed.

19. **Writing a product creates a new record** (Josh's revised decision, 2 Nov).
    - Writing «молоко» or «молоко 2 л» creates a new record even when a product with the same name is bought or in «Запасы». The existing record and its remaining amount, unit, note and other properties are not changed; there is no automatic reuse or comparison dialog.
    - The same rule applies from the field on Главная, the field on a page and «+ Новая запись». The existing explicit, manual merge in Журнал is unchanged.

    **Check:** with a bought «Молоко» and a full `5/5` product in «Запасы», write the same names again from the field and «+ Новая запись»: each send creates a new record, the original records keep their IDs and properties, and no comparison dialog appears. Write «молоко 2 л»: the new record keeps the entered quantity.

20. **A department corrected by hand is remembered** (Josh 16).
    - When the person changes a record's «Отдел», the choice is remembered for that word (its first word, by stem), and the next record with it takes that department, with or without a key. Today the rules or the model choose again each time.

    **Check:** set «Кофе» to «Прочее»; write «кофе в зёрнах»: it lands in «Прочее».

## AI functions and icons

21. **«ИИ» in Настройки: one switch per function** (ИФ1, ИФ2; Josh 15).
    - The group «Раскладка» is renamed «ИИ». Under «Подключение» (unchanged), one row per function, each with a 20 px icon, a hint that says what it does now, and a switch:
      - «Раскладывать по страницам» (needs a key): «Куда положить запись, решает модель».
      - «Делить строку на записи» (needs a key): «„Хлеб и позвонить маме“ станет двумя».
      - «Отдел для покупок»: without a key «Пока по простым правилам», with one «Отдел выбирает модель».
      - «Значок для новых страниц» (item 22): without a key «Пока по простым правилам», with one «Значок по названию выбирает модель».
      - then «Сначала простые правила» and «Что класть на страницы», as today.
    - Without a key, a function that needs one is greyed (`faint` label and icon), its switch off and inert, and its hint reads «Нужен ключ модели». Adding a key turns them on.
    - A function switched off is not used: the field keeps a record where it was sent, one line stays one record, and so on.

    **Check:**
    - No key (ИФ1): the two that need a key are grey with «Нужен ключ модели»; «Отдел для покупок» and «Значок для новых страниц» are on with «Пока по простым правилам».
    - With a key (ИФ2): all four on, each hint as listed. Switch «Делить строку на записи» off and send «хлеб и позвонить маме» on Главная: one record.

22. **A new page gets an icon from its name; «Значок и цвет»** (ИФ3, ИФ4; Josh 15).
    - While a new page's title is typed, its icon follows the name: simple rules on the device (дача, сад → tree; подарки → gift; отпуск, поездка → plane; книги → book; ремонт → roller; дом, уборка → home; покупки, продукты → basket; дела, задачи → check; идеи → bulb; здоровье, спорт → heart; машина → car; кот, собака → paw), the model with a key (when «Значок для новых страниц» is on). No match: the plain page icon.
    - A tap on a page's icon (on the page, and «Значок и цвет» in the card's menu) opens «Значок и цвет» (part «Шторка выбора», variant «Значок и цвет»): three that fit the name on top, then all icons (6 per row, 48 px), then colours as dots (grey by default, then the option colours). Picking an icon by hand stops it following the name.
    - Icons are grey unless a colour is picked (item 5, Josh's card 21:20Z).

    **Check:** make a page and type «Дача»: the icon becomes a tree as the word is typed (ИФ3). Tap it: «Значок и цвет» with the tree first among three (ИФ4); pick the sun and green: the page's icon is a green sun, and typing more of the name no longer changes it.

## Acceptance

Implementation of items 1–10 and 12–22 is in progress in the existing PR #20 and its branch; item 11 is already merged in PR #19. The report has one row per «Check» above, with pass, fail or partial and evidence. Acceptance walks the app at 390 px and 1440 px, in light and dark; touch checks use Chromium emulation. Mark haptics, edge-swipe Back and real-device hold/drag as not verified until checked on a real phone. Do not claim Canvas 87 or prototype 15 was published.
