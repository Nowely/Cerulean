# Cerulean recovered mockups

A static, runnable **reconstruction** of the unpublished iteration-3 mockups. Canvas and the prototype use the same 18 `.dc.html` components.

This is not a byte-exact recovery of commit `99ac6ff`: the original authoring repository and its bundle were not supplied. The published artifacts remain unchanged in `tmp/artifacts/`.

## Run

From this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open:

- Canvas: http://127.0.0.1:8765/
- Prototype: http://127.0.0.1:8765/prototype.html
- A prototype state directly: http://127.0.0.1:8765/prototype.html#i3stock

Use HTTP rather than `file://`: both viewers fetch component sources.

## Current state

- 18 shared components; 140 `.dc.html` files including artboard wrappers.
- 138 boards in 9 Canvas pages, 30 notes.
- 89 prototype states.
- 20 reconstructed boards on «Итерация 3: большие темы».
- Four rejected B-variant boards and their note are retired.
- 45 recorded post-v14 operations are applied to the five affected components.
- The updated shared CSS is synchronized across all 18 components.
- `recovery/handoff/main-flow-3-delta.md` is recovered at exactly 41,141 bytes, matching the exported metadata.

`manifest.json` describes the current files and hashes. `recovery/baseline-manifest.json` preserves the earlier v14 baseline manifest.

## Edit Canvas and the prototype together

The canonical files are in `project/`:

- `Flow.dc.html` contains the main interactive flow.
- The other 17 files are shared components.
- Canvas-only `*.dc.html` files are thin artboard wrappers around those components.
- `project/canvas.json` registers pages and boards.

Do not edit generated copies expecting different Canvas and prototype behaviour: they load the same sources.

The shared stylesheet starts with `/* The main flow's one stylesheet:`. After changing it in `Flow.dc.html`, synchronize it to the other components:

```sh
python3 tools/sync_css.py          # dry run
python3 tools/sync_css.py --apply
```

Validate the workspace:

```sh
python3 tools/validate.py
python3 tools/manifest.py          # refresh hashes only; does not rewrite sources
```

No build step is required for local viewing. `recovery/baseline-build.py` is kept only as evidence of the one-time v14 extraction. **It is not a rebuild command for the recovered state**: running it would discard later edits.

## Recovery evidence

`recovery/` contains:

- the exact delta, iteration plan, references and project memory;
- the post-v14 operation inventory and apply reports;
- one-time recovery tools for audit, with their original scratch paths;
- validation notes and screenshots.

## Checks performed

- All 89 prototype states rendered without page errors.
- All 20 reconstructed big-topic Canvas boards rendered without page errors.
- Stock values, units and `− / +` interaction were exercised, including the low-stock notice and folding.
- Card properties have no backgrounds or plus border.
- Canvas stock was checked in light and dark themes; the older desktop `deskrec` state was checked for runtime compatibility.

See `recovery/VALIDATION.md` for details.

## Limitations

- The original `make.py`, `flowplay.mjs`, full `screens.json`, `spec/spec.md` and authoring history were not recovered. Do not claim this tree is the original `99ac6ff` source.
- Big-topic Canvas wrappers and their coordinates are reconstructed; the original complete parts pages are unavailable. `TableView.dc.html` and `ListSheet.dc.html` exist, but their К15/К16 variant boards are not registered.
- The Canvas viewer is a focused viewer, not the original full editor.
- The final desktop record-card changes in the delta are not covered by the old `deskrec` state and still need design review.
- Pre-existing v14 behaviour is preserved: after decrementing or refilling a non-default unit, the stepper can show `шт` instead of `уп`. This is a candidate for the next review, not a replay correction made silently here.
- Google Fonts still requires network access for the intended Onest rendering; offline fallback fonts depend on the browser.
