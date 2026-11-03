# Design workflow

For future features, take an idea from a user story through a shared prototype, a checked handoff and acceptance of the app. This workflow records the existing loop in [AGENTS.md](../AGENTS.md) and adds explicit prototype approval, independent design review and handling of real-device gaps. It does not retrospectively change iteration 3 or PR #20.

The coordinator, designer, client implementer, independent reviewer and Josh are roles, not required sessions or new infrastructure. People or agents may fill them; the independent reviewer must not review their own work. Josh makes product decisions. The coordinator keeps the artifacts, questions and acceptance results connected.

## 1. Request and boundaries

- **Owner:** coordinator and designer. **Input:** Josh's request, the current local app build and relevant entries in [decisions.md](decisions.md).
- **Output:** in the round's plan, record the user story, problem and goal; what the current build actually does and which version was observed; affected flow, platforms, data and constraints; scope, exclusions and unknowns. Keep adjacent behaviour unchanged unless Josh asks otherwise.
- **Gate:** ask Josh when ambiguity changes the product behaviour or scope; do not fill a material gap by guessing.

## 2. References

- **Owner:** designer. **Input:** the problem and boundaries.
- **Output:** for a new or uncertain interaction, find relevant real examples and compare them with the current app. Record a verifiable source, date or version, what it shows and the conclusion for Cerulean alongside the round's plan. Distinguish official sources, third-party sources and direct observations. Do not copy blindly. A simple, understood fix does not need references for their own sake.
- **Gate:** evidence must support the claim; mark an unavailable or unverified source as such before using it to make a decision.

## 3. Options and decisions

- **Owner:** designer; Josh decides. **Input:** the story, constraints and relevant evidence.
- **Output:** where a meaningful choice exists, show distinguishable options, trade-offs, a recommendation and the old rules each would overrule. Make the important states or interactions testable; a straightforward fix can have one proposed solution. Record questions and Josh's answers in the round's plan or delta.
- **Gate:** Josh chooses consequential product behaviour and scope. A recommendation or a drawn variant is not an approval.

## 4. Decision status and history

- **Owner:** coordinator and designer. **Input:** evidence, options and Josh's answers.
- **Output:** label decisions **confirmed**, **proposed**, **assumption** or **open**; record the source and date of a confirmation and identify superseded rules. Keep reconstructed evidence distinct from observed or original material. Record implemented decisions and their code locations in `docs/decisions.md` in the same client PR.
- **Gate:** resolve blocking open questions with Josh before handoff; an assumption is not a confirmed decision.

## 5. Canvas, prototype and written rules

- **Owner:** designer. **Input:** the selected direction and its boundaries.
- **Output:** update the shared components, Canvas and interactive prototype together, including the states and transitions needed to assess the change. Update the applicable written rules and identify their version and overrides. If the original spec is unavailable, say so and write the new rules in the delta; do not refer to the missing `spec/spec.md` as an accessible local file or silently create a replacement spec. An available spec takes precedence over a picture; resolve a conflict with a newly confirmed decision explicitly.
- **Gate:** the states, interactions and written rules must agree before design review. Follow [the local mockups README](../design/mockups/README.md) for shared sources, CSS synchronization and validation. Its workspace is a reconstruction, not a byte-exact historical original or proof that an artifact was published.

## 6. Independent design review

- **Owner:** independent reviewer; designer triages. **Input:** the complete proposed states, interactions, written rules and scope.
- **Output:** review the prototype and Canvas for the story, consistency, accessibility, edge cases and regressions; record findings and their disposition in the round's plan or handoff. The designer makes agreed fixes and the reviewer checks them again.
- **Gate:** resolve or explicitly carry forward findings before asking Josh to approve the final prototype. New product choices return to Josh.

## 7. Approval and handoff

- **Owner:** designer and coordinator; Josh approves. **Input:** the reviewed final prototype, decisions and resolved findings.
- **Output:** Josh explicitly approves the final prototype before handoff. Prepare a delta and client brief in `design/mockups/handoff/`, linking the approved Canvas/prototype states and written rules. Name scope, **Not built**, overrides, open questions and compatibility constraints. Every delta item has a **Check:** with the initial state, action and expected result.
- **Gate:** hand off only the approved scope with no blocking product question. Insignificant technical corrections within that scope do not need repeated product approval; a material behaviour or scope change does.

## 8. Implementation

- **Owner:** client implementer. **Input:** approved delta and brief, relevant app code and `docs/decisions.md`.
- **Output:** build only the delta, with the smallest necessary code and touched-data changes; reuse shared components and preserve the existing data and sync rules. Update `docs/decisions.md` in the same PR. Use one branch and PR; if the previous iteration's PR is still open, the new delta joins it as specified in [AGENTS.md](../AGENTS.md#the-loop), rather than automatically opening another.
- **Gate:** resolve compatibility conflicts before choosing behaviour; request Josh's decision for changes outside the approved scope.

## 9. App checks and regressions

- **Owner:** client implementer. **Input:** the delta checks, real client implementation and affected existing behaviour.
- **Output:** add a browser scenario for each automatable Check in `Client/scripts/checks/`, with the round and item in its ID; start flow checks from a real first run, without `?demo`. Add domain/store tests where needed and check relevant regressions and existing data. Retire superseded checks in the same PR and explain why. Run `pnpm lint`, `pnpm typecheck` and `pnpm test` in `Client/` before push. Regenerate `docs/ui-current-state.html`: each check has pass, fail or partial and screenshot or written evidence. Tick the checks and record results in the PR.
- **Gate:** a prototype check does not prove app behaviour, persistence or sync. Report failures and untested parts; do not call them passes.

## 10. Acceptance and merge

- **Owner:** independent reviewer for acceptance; implementer for fixes; Josh for device exceptions and merge. **Input:** a local build of the PR branch, approved states, delta and app report.
- **Output:** walk every Check at 390 px and 1440 px in light and dark, against the prototype and written rules. Record the tested revision, environment, result and evidence. Put findings and fixes in the same PR and recheck them on the changed revision. Check relevant gestures, system Back, haptics and other device-specific behaviour on a real device; record device, OS and browser.
- **Gate:** emulation is not a real-device check. Mark unverified device behaviour **partial**, with the remaining risk; merge with that exception only if Josh explicitly agrees. Acceptance belongs to the reviewed revision; assess and recheck anything affected by later changes. Josh normally marks the PR ready and squash-merges it. An agent must not mark it ready or merge without his explicit instruction for that PR.

## Sources

- Existing handoff, checks, acceptance, scope and merge rules: [AGENTS.md](../AGENTS.md#the-loop); implemented decision journal: [decisions.md](decisions.md).
- Recovered project history and design principles: [project memory](../design/mockups/recovery/status/MEMORY.md); an example of observations, alternatives and questions: [iteration 3 plan](../design/mockups/recovery/plan/iteration-3.md).
- Example reference collection and source labels: [iteration 3 references](../design/mockups/recovery/references/iteration-3/index.html). Recovery boundaries and shared local sources: [mockups README](../design/mockups/README.md).
