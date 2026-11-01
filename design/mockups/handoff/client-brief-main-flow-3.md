# Client brief: main flow, iteration 3

**Status: proposed; wait for Josh's approval before changing `Client/`.** Implement in the existing PR #20 and branch `iteration-3-recovery`. The detailed scope, overrides and full acceptance checks are in [`main-flow-3-delta.md`](main-flow-3-delta.md). The unchanged historical draft is in `../recovery/handoff/main-flow-3-delta.md`.

## Goal and boundaries

Deliver Josh's 17 phone observations as the 22 delta items: one round, minimum adjacent changes, one PR. Item 11, the update banner, was merged in PR #19; item 8 adds the shared notice swipe. The desktop shares the specified captions, icons, ordering, surfaces and record-card logic; phone-only hold/drag does not replace the desktop's existing pointer and keyboard affordances.

The local Canvas and prototype are a reconstruction, not the published Canvas 87 or prototype 15 and not a byte-exact recovery of `99ac6ff`. Run them from `design/mockups/` as documented in `../README.md`. For a desktop iteration-3 record, start at `#deski3update` and open «Хлеб»; `#deskrec` is the older historical state.

Do not implement purchase history, prices, shops, photos, arbitrary deeper nesting in lists, a new sync provider, or unrelated redesigns. Do not change unrelated screens merely because an older rule differs. Keep the existing offline-first/S3 data model and reuse the shared field, add-row and places list. A more precise data design, including storage compatibility, must be checked against the existing code before implementation; do not assume a migration is authorized.

## Scope and acceptance index

The checks here are entry points, not replacements for the full checks in the delta. Every delta check needs a pass/fail/partial result and evidence in the report.

| Delta | Deliverable | Check |
|---|---|---|
| 1 | Remember «Ещё N» on Главная. | Expand it, visit a page and reload: it stays expanded; collapse and reload: it stays collapsed. |
| 2 | Section captions, compact menus and «+». | Fold «Дом», create a page in it, delete the section and undo: pages and order return. |
| 3 | Hold a home card for a menu, move to drag. | Hold twice, then drag between sections and undo; an ordinary scroll must not lift it. |
| 4 | Bare icons on summary cards. | On phone and computer, light and dark, home icons have no plates; compact icons retain their size. |
| 5 | Separate home and content surfaces. | Compare Главная and Покупки in light and dark on phone and computer. |
| 6 | New records last in lists and groups. | Add records from the field and «+ Новая запись» in Входящие and Покупки; verify placement and fresh tint. |
| 7 | Shopping departments appear from two departments. | Add «Хлеб», then «Молоко»: no caption first, two captions after the second. |
| 8 | Swipe a notice sideways without undoing the action. | Swipe a move notice away: the move remains; a short drag springs back. |
| 9 | System Back closes the top layer first. | Back closes a sheet and preserves the page; close by tapping outside, then Back without an extra dead step. |
| 10 | Small, interruptible transitions. | Navigate, add and move a row; emulate reduced motion and verify changes are immediate. |
| 11 | Update banner. | Already merged in PR #19; regression-check the banner and its existing swipe, do not implement it again. |
| 12 | Hold a list row for menu, then drag. | Hold «Купить краску», dismiss and hold again; swipe actions still work. |
| 13 | Three list levels, fold and nesting. | Fold and reload a parent; nest via menu and drag, undo; moving a parent carries its children. |
| 14 | Record-card property values, note and subitems. | Phone and desktop: values below title, no neutral plates, note and subitems next, «Добавлено» last; change a property. |
| 15 | View tabs, «+» and settings. | Add «Таблица», open settings by tapping the active tab, delete and undo. |
| 16 | Real scrollable table on phone. | Scroll properties sideways while names stay fixed; edit an option and open a record. |
| 17 | Filter and sort sheet, visible filter chips. | Filter by «Молочное», remove the chip and verify per-view state. |
| 18 | Stock amount, norm, units and quick controls. | Change `2/4 уп` with − and +, fold and refill: `уп` remains; default `шт` is hidden only in the folded row. |
| 19 | Bring a purchased item back without duplication. | Write «молоко» again: one item returns with its properties; undo returns it to «Куплено». |
| 20 | Remember a manually corrected department. | Set «Кофе» to «Прочее»; add «кофе в зёрнах»: it uses «Прочее». |
| 21 | Settings «ИИ» with function switches. | Without a key, key-dependent switches are unavailable; with a key, switch splitting off and verify one line stays one record. |
| 22 | Suggest an icon for a new page. | Type «Дача», choose an icon and colour manually, then type more: the manual choice stays. |

## Implementation sequence

1. Compare the delta against current stores, domain types, view logic and UI. Record concrete conflicts or unavailable APIs before choosing an implementation.
2. Implement shared state and domain behaviour first: ordering, fold state, stock/units, nesting and view/filter settings. Preserve S3 write paths and current stored data.
3. Implement shared components and phone/desktop containers, then gestures, Back and reduced-motion behaviour. Keep existing keyboard alternatives.
4. Implement AI switches and icon selection through existing provider settings, without exposing keys in tests or screenshots.
5. Update `docs/decisions.md` in this PR when behaviour is actually implemented. Add checks in `Client/scripts/checks/`; retire superseded checks in the same PR and explain why. Regenerate `docs/ui-current-state.html` with a row and evidence for each delta check.

## Acceptance

Run `pnpm lint`, `pnpm typecheck` and `pnpm test` in `Client/`; run targeted browser checks from a real first run as specified in `AGENTS.md`. Review at 390 px and 1440 px in light and dark, with reduced-motion coverage. Touch emulation is useful but cannot verify real-device haptics, edge-swipe Back or feel of hold/drag; keep these partial until checked on a real phone. Ask Josh before any merge.

## Decisions to confirm before coding

The recovered draft contains both explicit choices and agent-selected defaults. These points cannot be inferred safely from the reconstructed prototype alone:

1. **Expiry:** project memory proposes adding expired goods to «Купить», while item 18 only specifies the 1-or-0 rule. If expiry also triggers a purchase, define where the expiration date is stored and what buying an expired product does to it. Recommendation: handle quantity first; defer automatic expiry behaviour until its lifecycle is agreed.
2. **Units:** the mockups show `шт` and `уп` on different products on one page, but the app currently stores the unit on the page's property definition (`Client/app/domain/types.ts`), not per product. Recommendation: allow a product-specific unit with the property unit as its default; settle where to edit it before choosing the storage representation.
3. **Writing an item again:** item 18 says stock appears in «Купить» only while low, but item 19 brings a purchased item back with its stock unchanged. Recommendation: explicit re-entry brings an existing item back even if its stock is full, without duplicating it; clarify whether this applies only to «Куплено» or also to an item currently in «Запасы».
4. **AI switches and remembered departments:** should a manually remembered department still apply when «Отдел для покупок» is off? Should a user's off choice survive disconnecting and reconnecting a model key? Recommendation: preserve explicit off choices; a disabled function does not apply its learned assignment. Routing and splitting switches must work independently.
5. **Existing shopping pages:** the draft specifies the new template but does not say how to update existing pages whose views and filters may have been customized. Recommendation: do not silently overwrite their views or properties; determine a non-destructive way to enable the new stock cycle separately from the new-template defaults.
6. **Ordering:** item 6 says new records last, while explicit sorting and manual reordering remain available. Recommendation: append new records in manual order; respect a view's explicit sorting and do not silently reorder existing records.
7. **Desktop nesting:** the draft preserves the desktop drag handle but does not explicitly say whether it can nest a row. Recommendation: maintain keyboard/menu alternatives and the current handle; agree separately whether dropping onto a row nests on desktop in this round.
8. **Recorded defaults:** home summaries remain newest first; swiping the update banner hides it until the next launch; hold opens a menu first and movement starts dragging; `шт` is implicit in a folded row and explicit in the card/open stepper. These were communicated as defaults, not all separately confirmed.

The fixed low-stock threshold of **1 or 0** is already explicit in item 18; the norm is the refill target, not a configurable warning threshold in this proposal. Also, item 15 keeps «Настроить вид» while item 18 shows «Осталось» in «Купить»: do not silently hide «Откуда записи» merely because a property is visible in a row; verify this with the existing view model during implementation.
