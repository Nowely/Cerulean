# Client brief: main flow, iteration 3

**Status: the decisions and scope of the current delta and the implementation plan are approved; app implementation is in progress on the branch for PR #20. Final acceptance and merge are not confirmed; see the PR for the published revision.** Implementation uses branch `iteration-3-recovery` for the existing PR #20. The detailed scope, overrides and full acceptance checks are in [`main-flow-3-delta.md`](main-flow-3-delta.md). The unchanged historical draft is in `../recovery/handoff/main-flow-3-delta.md`.

## Goal and boundaries

Deliver Josh's 17 phone observations as the 22 delta items: one round, minimum adjacent changes, one PR. Item 11, the update banner, was merged in PR #19; item 8 adds the shared notice swipe. The desktop shares the specified captions, icons, ordering, surfaces and record-card logic; phone-only hold/drag does not replace the desktop's existing pointer and keyboard affordances.

The local Canvas and prototype are a reconstruction, not the published Canvas 87 or prototype 15 and not a byte-exact recovery of `99ac6ff`. Run them from `design/mockups/` as documented in `../README.md`. For a desktop iteration-3 record, start at `#deski3update` and open «Хлеб»; `#deskrec` is the older historical state.

Do not implement purchase history, prices, shops, photos, product expiry or date-triggered purchases, arbitrary deeper nesting in lists, a new sync provider, or unrelated redesigns. Do not change unrelated screens merely because an older rule differs; existing task due dates are unchanged. Keep the existing offline-first/S3 data model and reuse the shared field, add-row and places list. A more precise data design, including storage compatibility, must be checked against the existing code before implementation; do not assume a migration is authorized.

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
| 18 | Stock amount, norm, units and quick controls; explicit enablement on existing shopping pages. | Change `2/4 уп` with − and +, fold and refill: `уп` remains. Check `1/1` is full and `0/1`, `1/5`, `0,5/2` are low; edit the same amount, norm and unit in card and table. Enable tracking on an existing customized page without overwriting its settings. |
| 19 | A repeated product input creates a new record. | Write an existing bought or stocked product again: a new record appears, the original and its stock remain unchanged, and no comparison dialog appears. |
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

## Clarified decisions and remaining questions

**Confirmed on 2 Nov 2026:** product expiry is not part of this iteration. A tracked amount is low when it is at most 1 and below its norm, including fractions (`1/1` is full; `0/1`, `1/5` and `0,5/2` are low). The record card and the table cell use one editor for that record's remaining amount, norm and unit; the list keeps quick − / +. The page defines the property and the record owns its values. Changing a unit does not imply a conversion.

**Revised by Josh:** writing a product creates a new record even when the name is already in «Куплено» or «Запасы». The existing record is not changed, and no automatic reuse or comparison dialog is added. This supersedes the earlier repeat-entry decision. Stock tracking on an existing shopping page remains explicit and must not overwrite its settings.

The local prototype demonstrates the revised repeat-entry rule as well as the shared editor and opt-in flow; see `stock-design.md`. The prototype does not simulate arbitrary existing schemas or real persistence. The historical recovery material remains unchanged.

The following are implementation recommendations, not additional confirmed user decisions: append in manual order while respecting explicit sorting; preserve a user's AI off choice after reconnecting a key; keep routing and splitting independent; and allow desktop nesting through the existing drag handle while preserving menu and keyboard alternatives. Home summaries newest-first, hiding a swiped update banner until the next launch, hold-menu-then-drag and hiding `шт` in a folded row were previously communicated defaults, not all individually confirmed.

New tracked amounts are finite nonnegative numbers without an artificial maximum; minus at zero does nothing. Do not silently truncate existing fractional, negative or greater-than-99 values. An empty value is not zero. When a property with «Осталось» is visible, do not infer that «Откуда записи» must be hidden solely from that fact; verify the intended view settings against the existing model.
