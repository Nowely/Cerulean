# Working on Cerulean

Read this first. The product is the client in `Client/`, a Notion-like browser app that runs offline. `Server/` is the earlier C# backend, which the client does not use now. See `Client/README.md` for the stack and the commands.

## Where the design lives

- **Mockups:** the canvas at https://claude.ai/artifact/HJnpYt6yHSTfmdGMcQM41F. Its sources are in the project folder `/mnt/project-files/design/mockups/`. Never run git on that mount: clone `history/mockups.bundle` into scratch.
- **Spec:** `spec/spec.md` in the mockups. It wins over a picture. Lines are marked with the version that set them (**v21**).
- **Handoff:** each mockup iteration sends the client a brief (`handoff/client-brief-*.md`) and a delta (`handoff/v21-delta.md`, …). Every item in them ends with a **Check:** line saying what to tap and what must happen.
- **Decisions journal:** [`docs/decisions.md`](docs/decisions.md). Read the entries for an area before changing how it behaves. Add or edit entries in the same PR.
- **State report:** `docs/ui-current-state.html` shows the app next to the mockup for every state, in light and dark, with the check table.
- **Flow rounds:** since 22 Oct a round can polish one user flow instead of the whole app (the main flow: first open → first record → its note, `handoff/main-flow-delta.md`). It changes only the screens on that flow; other screens keep their behaviour even where the old rule now differs (Журнал keeps `AppComposer` and its receipt). Since 28 Oct every iteration touches a minimum: build only what its delta lists (`handoff/main-flow-2-delta.md` is the second round), and anything next to it waits for Josh's separate command.

## The loop

Each mockup iteration goes through the same steps:

1. The mockups thread publishes a new canvas version and a delta in which every item has a check line.
2. The client thread builds the delta on one branch and one PR. For every item it ticks the check in the PR body, and it records decisions in `docs/decisions.md`. If the previous iteration's PR is still open, the new delta joins that PR (Josh, 21 Oct: v22 and v23 in PR #15).
3. It scripts the checks it can in `Client/scripts/checks/` (one file per round, ids `<round>-<item>-<what>`; run `pnpm dev`, then `node scripts/checks.mjs <filter>`). A later round that overrules a check retires it in the same PR and says so in the PR body. Checks of a flow start from a real first run (`open(p, path, false)`: no `?demo`).
4. It regenerates the report: run `pnpm dev`, then `pnpm shots` (`SHOTS_CHROMIUM=/opt/pw-browsers/chromium` in a cloud container). The table lists the item, its check and the result (pass, fail or partly) with a screenshot or a sentence.
5. Acceptance: the mockups thread walks the check lines on a local build of the PR branch at 390 px and 1440 px. It writes what did not land into the PR, and the fixes go into the same PR until it passes.
6. Josh merges the PR himself («Ready for review», then «Squash and merge»). Agents never mark a PR ready or merge it.

## Constraints

- Mobile first. Light is primary, dark is equal. Desktop and phone share one logic and differ only in containers.
- Less noise: colour only for meaning, fill rather than borders, one prominent thing per screen.
- Colours only in `Client/app/assets/css/tokens.css`. Components use no colours, `:deep` or `!important`.
- Auto-imports are off: import from `vue` and `#imports`.
- Keep it simple: no IndexedDB migrations or data protection, no sync, and CI runs lint, types and tests only (no screenshot checks).
- Before a push, run `pnpm lint`, `pnpm typecheck` and `pnpm test` in `Client/`.
- Code, commits and PRs are in English. UI copy is Russian. Talk to Josh in Russian.
- The live site (cerulean-nine.vercel.app) is not reachable from cloud containers, so test a local build.
- One add row (`AddRow.vue`) serves every «+ …» row that turns into a line, and one field (`FlowField.vue`) serves Главная and pages; reuse them rather than adding another.
- One places list (`PlacesPopover.vue`, its pages from `usePlaces`) serves the field's chip and Входящие's move button, and ends with «Новая страница» (`useCreatePage().list`).
- Without a model nothing is sorted or split: `readLine` sorts only with `LineContext.sort`, which the field and «+ Новая запись» set from `journal.hasModel()`.
- Every phone header is `box-content` with `pt-[env(safe-area-inset-top)]`, so the inset adds to its height. `mf-26-safe-areas` checks it with Chromium's safe-area override.
- Do not build from a guess. What a delta lists under «Not built» stays unbuilt until Josh says otherwise.
