# Post-v14 edits on generated documents

`tmp/recovery-tools/apply_post_v14.py` is a dry-run-first adapter for the
canonical generated documents. It reads `manifest.json`; it does not execute
the recorded shell or Python. It extracts literals using Python's AST and
applies a fixed set of supported replacements, slice replacements, a CSS
append, and three explicit equivalents of the recorded `sed` edits. Every
replacement and slice boundary must occur exactly once. This is stricter than
some original commands.

| Historical source | Generated document | Treatment |
| --- | --- | --- |
| `flow/Flow.html` | `tmp/mockups-local/project/Flow.dc.html` | Exact literal and uniquely bounded slice edits. |
| `flow/parts/RecordRow.html` | `tmp/mockups-local/project/RecordRow.dc.html` | Exact literal edit. |
| `flow/parts/TableView.html` | `tmp/mockups-local/project/TableView.dc.html` | Exact literal edit; unlike the original, zero matches is an error. |
| `flow/parts/ListSheet.html` | `tmp/mockups-local/project/ListSheet.dc.html` | Exact literals and uniquely bounded slice edit. |
| `flow/parts/PagePane.html` | `tmp/mockups-local/project/PagePane.dc.html` | Exact literals, including the `sed` equivalent. |
| `flow/flow.css` | CSS embedded in `Flow.dc.html` only | Requires one `/* The main flow's one stylesheet:` marker inside a `<style>` element. Replacements must match inside that region. The appended CSS is inserted immediately before its closing `</style>`, matching the original append even when the generated stylesheet has no trailing newline; the appended block must be absent. |
| `screens.json` | — | Skipped; coordinator handles metadata. |
| `tools/flowplay.mjs` | — | Skipped; coordinator handles tests. In particular, the uncertain 22:21:54 edit is excluded. |

All five documents must be present as regular, non-symlink UTF-8 files. The
tool validates **all** included edits in memory, in transcript order, before
writing any document. A missing or duplicated anchor, an unrecognized manifest
shape, an absent document or an invalid CSS region stops the run. The JSON
report includes each validated operation, the first mismatch if any, and
before/after byte counts and SHA-256 hashes. It is printed to stdout; `--report`
also writes it to an explicitly chosen path outside the project directory.

From the repository root, once the canonical files exist:

```sh
python3 -B tmp/recovery-tools/apply_post_v14.py --dry-run
python3 -B tmp/recovery-tools/apply_post_v14.py --apply
```

Dry-run is the default and makes no writes unless `--report` is explicitly
supplied. `--apply` rechecks every input after validation and replaces changed
files only if all operations passed. It attempts to restore earlier files if a
write fails; filesystem crashes, process termination, concurrent writes during
commit, and failed rollback cannot be made atomic across five files. Back up the
documents separately before applying.

The generated document's CSS may also have been copied into the other four
documents. This adapter deliberately **does not** update those copies, per the
mapping above. A successful run therefore does not establish visual parity
across standalone parts. CSS insertion relies on the generated `<style>`
boundary, not an independently verified original source-file boundary.
The changes do not recover the original source tree or prove equality with
commit `99ac6ff`; absent or transformed anchors require investigation rather
than relaxed matching.
