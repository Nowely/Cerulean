# Recovery validation

## Automated source checks

- `main-flow-3-delta.md`: recovered at exactly 41,141 bytes, matching the exported project-file metadata.
- Post-v14 adapter: 45/45 operations validated before writing; all five canonical documents changed.
- Shared CSS: the v14 stylesheet was byte-identical in all 18 components before the edits. The updated region was synchronized from Flow to the other 17 components.
- `canvas.json`: 145 existing board files, 145 order entries, no missing board files; 20 reconstructed boards on `i3big` and seven К15/К16 variants, with 32 notes.

## Browser checks

Server: `http://127.0.0.1:8765`.

- Prototype: all 89 states rendered; no page errors or load errors.
- Canvas: all 20 reconstructed `i3big` boards rendered; no page errors.
- `i3prod`: meta values have transparent backgrounds and no plus border; card shows `1 из 2 шт`.
- `i3stock`: values are `2/5`, `3/5`, `2/4 уп`, `1/2`.
- `i3step`: the open stepper shows `3/5 шт`.
- Interaction: `3/5` opens, two decrements produce `1/5 шт`, low state and «Кола теперь в «Купить»» appear, then the row folds to `1/5` in orange.
- `i3viewset`: «Настроить вид» and «Справа в строке» render.
- `i3filter`: «Фильтр и сортировка» renders.
- Canvas `I3Stock.dc.html` renders the same values and toolbar in light and dark themes.
- All seven К15/К16 variants rendered in both themes (14 checks by Astra).
- Desktop `deskrec` renders without console errors.

## Final review fixes

- Stock mutations now preserve `unit`: browser checks produced `1/4 уп`, `3/4 уп` and `4/4 уп`, including refill; default rows still fold to `3/5` and open as `3/5 шт`.
- Desktop property selection is enabled only for the record's `opt` sheet: `deski3update` → «Хлеб» → «Отдел» opens the options, and choosing «Прочее» updates the chip and closes the sheet. Other desktop sheets retain their previous behaviour.
- К15/К16 boards use the exact variants from transcript event 10225; К16.2 uses the final «Настроить вид» title from event 10750. Their placement is explicitly reconstructed.
- The old `deskrec` state remains historical; the final desktop card is exercised through `deski3update`.

Screenshots are in this directory.

## Evidence boundaries

- This is a runnable reconstruction from generated v14 documents and recorded edits, not a byte-exact recovery of commit `99ac6ff`.
- The original authoring repository, `make.py`, `flowplay.mjs`, full `screens.json` and `spec/spec.md` were not supplied.
- The uncertain 22:21:54 test-only edit was excluded.
- Big-topic Canvas wrappers and their spatial layout are reconstructed from the 20 v14 states and final screen-title edits; their original coordinates and complete parts pages are not claimed to be exact.
- The Canvas viewer is a focused viewer, not the original full editor.
