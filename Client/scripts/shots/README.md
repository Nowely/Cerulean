One module per slice of an iteration (`v23-editor.mjs`, `v23-flow.mjs`, …). Each default-exports a function that takes
the helpers of `../shots.mjs` (`MOBILE`, `DESKTOP`, `open`, `openPage`, `openRecord`, `settle`, `data`, …) and returns
scenarios in the same shape as the list there: `{ name, device, run, clip? }`. `shots.mjs` loads every module here.
