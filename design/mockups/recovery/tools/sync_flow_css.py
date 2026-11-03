import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "tmp/mockups-local/project"
COMPONENTS = ROOT / "tmp/mockups-local/player/components.json"
MARKER = "/* The main flow's one stylesheet:"


def region(text):
    if text.count(MARKER) != 1:
        raise RuntimeError(f"Expected one stylesheet marker, found {text.count(MARKER)}")
    start = text.index(MARKER)
    end = text.index("</style>", start)
    if text.find("<style>", start, end) >= 0:
        raise RuntimeError("Nested style element in shared stylesheet")
    return start, end


parser = argparse.ArgumentParser(description="Synchronize the identical shared CSS region from Flow.dc.html")
parser.add_argument("--apply", action="store_true", help="Write changes; default is a dry run")
args = parser.parse_args()
flow = (PROJECT / "Flow.dc.html").read_text()
flow_css = flow[slice(*region(flow))]
report = []
for name in json.loads(COMPONENTS.read_text())["components"]:
    path = PROJECT / f"{name}.dc.html"
    text = path.read_text()
    start, end = region(text)
    before = text[start:end]
    changed = before != flow_css
    report.append({
        "document": path.name,
        "changed": changed,
        "before_sha256": hashlib.sha256(before.encode()).hexdigest(),
        "after_sha256": hashlib.sha256(flow_css.encode()).hexdigest(),
    })
    if changed and args.apply:
        path.write_text(text[:start] + flow_css + text[end:])
print(json.dumps({"mode": "apply" if args.apply else "dry-run", "documents": report}, ensure_ascii=False, indent=2))
