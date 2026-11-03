# Post-v14 edit inventory

The exact historical edit payloads and tool results are in `manifest.json`. All timestamps below are 2026-10-29 UTC. They come from `tmp/claude_code_cloud/channel_session_transcripts.json`, session `cse_01WQnFbG68u9c7NArjKw4oEn`; the manifest includes zero-based transcript indices and tool-use IDs.

**Do not execute the recorded shell commands.** They include the original absolute scratch paths, builds, tests and `pkill`. The manifest is evidence for a coordinator, not an executable replay helper. No edit was applied to recovered sources.

## Baseline and safety

- Start with the original **source** at `c69647d`, plus all earlier operations listed below in order. Published v14 embeds generated documents, not the source tree. The exact source baseline and final `99ac6ff` file hashes have not been independently verified.
- Python snippets and heredoc bodies are captured verbatim, including assertions, global replacements and ordering of writes. Original shell snippets are retained to disambiguate heredoc roles and sed semantics. Adapt paths manually; do not run whole commands.
- `22:17:17` first writes a temporary `sheets.js`; its full body is the first heredoc in that event and the second heredoc reads it. Both original absolute paths require adaptation.
- `22:21:54` is **uncertain**: the command returned exit 144 after invoking `pkill`. Python was before `pkill`, but the shell did not gate `pkill` on successful Python execution. Verify the inserted card test against independent evidence before applying it.
- Non-unique or unguarded substitutions, sed regular expressions, and the CSS append need manual checks. Whole-shell success does not always establish that every earlier command succeeded. The `22:29:10` test failed after the file edit; `22:29:53` later reported `i3-phone ok`.

## Chronological edit operations

| Time UTC | Target | Operation |
| --- | --- | --- |
| 22:15:28 | `flow/flow.css` | python replacements |
| 22:16:18 | `flow/Flow.html` | python replacements |
| 22:16:18 | `flow/parts/RecordRow.html` | python replacement |
| 22:16:18 | `flow/parts/TableView.html` | python replacement |
| 22:16:40 | `flow/Flow.html` | python replacements |
| 22:17:17 | `flow/Flow.html` | python slice replacement and string replacement |
| 22:17:29 | `flow/Flow.html` | python replacements |
| 22:17:37 | `flow/Flow.html` | python replacements |
| 22:17:59 | `flow/parts/ListSheet.html` | python replacements and slice replacement |
| 22:18:16 | `screens.json` | python replacements |
| 22:18:16 | `flow/flow.css` | append heredoc |
| 22:18:22 | `flow/parts/PagePane.html` | python replacement |
| 22:18:28 | `flow/parts/PagePane.html` | sed substitution |
| 22:18:28 | `flow/flow.css` | sed substitution |
| 22:21:45 | `tools/flowplay.mjs` | python replacements |
| 22:21:54 | `tools/flowplay.mjs` | python insertion, outcome uncertain |
| 22:22:13 | `flow/flow.css` | sed substitution |
| 22:23:18 | `flow/Flow.html` | python replacements |
| 22:23:18 | `tools/flowplay.mjs` | python replacement |
| 22:29:10 | `tools/flowplay.mjs` | python replacement |
| 22:29:53 | `tools/flowplay.mjs` | sed substitution |

The 22:24:29 `git diff --stat` lists the eight target files. It is not a final commit file list; `git add -A` at 22:31:06 could have included other files. This inventory is limited to the requested paths and observed commands in the named session.
