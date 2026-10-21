# Working on Cerulean

Read this first. The product is the client in `Client/`, a Notion-like browser app that runs offline. `Server/` is the earlier C# backend, which the client does not use now. See `Client/README.md` for the stack and the commands.

## Where the design lives

- **Mockups:** the canvas at https://claude.ai/artifact/HJnpYt6yHSTfmdGMcQM41F. Its sources are in the project folder `/mnt/project-files/design/mockups/`. Never run git on that mount: clone `history/mockups.bundle` into scratch.
- **Spec:** `spec/spec.md` in the mockups. It wins over a picture. Lines are marked with the version that set them (**v21**).
- **Handoff:** each mockup iteration sends the client a brief (`handoff/client-brief-*.md`) and a delta (`handoff/v21-delta.md`, …). Every item in them ends with a **Check:** line saying what to tap and what must happen.
- **Decisions journal:** [`docs/decisions.md`](docs/decisions.md). Read the entries for an area before changing how it behaves. Add or edit entries in the same PR.
- **State report:** `docs/ui-current-state.html` shows the app next to the mockup for every state, in light and dark, with the check table.

## The loop

Each mockup iteration goes through the same steps:

1. The mockups thread publishes a new canvas version and a delta in which every item has a check line.
2. The client thread builds the delta on one branch and one PR. For every item it ticks the check in the PR body, and it records decisions in `docs/decisions.md`.
3. It regenerates the report: run `pnpm dev`, then `pnpm shots` (`SHOTS_CHROMIUM=/opt/pw-browsers/chromium` in a cloud container). The table lists the item, its check and the result (pass, fail or partly) with a screenshot or a sentence.
4. Acceptance: the mockups thread walks the check lines on a local build of the PR branch at 390 px and 1440 px. It writes what did not land into the PR, and the fixes go into the same PR until it passes.
5. Josh merges the PR himself («Ready for review», then «Squash and merge»). Agents never mark a PR ready or merge it.

## Constraints

- Mobile first. Light is primary, dark is equal. Desktop and phone share one logic and differ only in containers.
- Less noise: colour only for meaning, fill rather than borders, one prominent thing per screen.
- Colours only in `Client/app/assets/css/tokens.css`. Components use no colours, `:deep` or `!important`.
- Auto-imports are off: import from `vue` and `#imports`.
- Keep it simple: no IndexedDB migrations or data protection, no sync, and CI runs lint, types and tests only (no screenshot checks).
- Before a push, run `pnpm lint`, `pnpm typecheck` and `pnpm test` in `Client/`.
- Code, commits and PRs are in English. UI copy is Russian. Talk to Josh in Russian.
- The live site (cerulean-nine.vercel.app) is not reachable from cloud containers, so test a local build.
- Do not build from a guess. What a delta lists under «Not built» stays unbuilt until Josh says otherwise.
