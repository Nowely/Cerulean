import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TRANSCRIPT = ROOT / "tmp/claude_code_cloud/channel_session_transcripts.json"
WORK = ROOT / "tmp/recovery-work/delta"
OUT = ROOT / "tmp/recovered/handoff/main-flow-3-delta.md"
SESSION = "cse_01WQnFbG68u9c7NArjKw4oEn"

records = json.loads(TRANSCRIPT.read_text())["claude_code_cloud"]
by_id = {}
for record in records:
    for block in record.get("content", []):
        if block.get("tool_use_id"):
            by_id[block["tool_use_id"]] = block


def command_at(timestamp):
    for record in records:
        if record.get("session_id") != SESSION or record.get("created_at") != timestamp:
            continue
        for block in record.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == "Bash":
                return json.loads(block["input"])["command"], block["tool_use_id"]
    raise KeyError(timestamp)


def heredoc(command):
    marker = "python3 - <<'EOF'\n"
    return command.split(marker, 1)[1].split("\nEOF", 1)[0]


def run_replay(timestamp):
    command, _ = command_at(timestamp)
    subprocess.run([sys.executable, "-c", heredoc(command)], cwd=WORK, check=True)


base_command, base_id = command_at("2026-10-29T22:05:23.866511Z")
base = "\n".join(by_id[base_id]["content"])
base = base.removesuffix("\nShell cwd was reset to /home/user/Cerulean") + "\n"
part2_command, _ = command_at("2026-10-29T22:25:07.420736Z")
part2 = part2_command.split("<<'EOF'\n", 1)[1].split("\nEOF\necho written", 1)[0] + "\n"

(WORK / "mk/handoff").mkdir(parents=True, exist_ok=True)
(WORK / "mk/handoff/main-flow-3-delta.md").write_text(base)
(WORK / "part2.md").write_text(part2)

run_replay("2026-10-29T22:25:33.466698Z")
run_replay("2026-10-29T22:26:24.105526Z")
run_replay("2026-10-29T22:26:34.670513Z")

result = (WORK / "mk/handoff/main-flow-3-delta.md").read_bytes()
if len(result) != 41141:
    raise RuntimeError(f"Recovered delta has {len(result)} bytes, expected 41141")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(result)
print(f"Recovered {OUT.relative_to(ROOT)}: {len(result)} bytes")
