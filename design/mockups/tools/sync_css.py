#!/usr/bin/env python3
"""Synchronize the shared stylesheet from Flow.dc.html to every component."""
import argparse
import json
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
PROJECT = WORKSPACE / "project"
MARKER = "/* The main flow's one stylesheet:"


def region(text):
    if text.count(MARKER) != 1:
        raise RuntimeError(f"Expected one shared stylesheet marker, found {text.count(MARKER)}")
    start = text.index(MARKER)
    end = text.index("</style>", start)
    return start, end


parser = argparse.ArgumentParser()
parser.add_argument("--apply", action="store_true", help="Write changes; default is a dry run")
args = parser.parse_args()
flow = (PROJECT / "Flow.dc.html").read_text()
flow_css = flow[slice(*region(flow))]
changed = []
for name in json.loads((WORKSPACE / "player/components.json").read_text())["components"]:
    path = PROJECT / f"{name}.dc.html"
    text = path.read_text()
    start, end = region(text)
    if text[start:end] != flow_css:
        changed.append(name)
        if args.apply:
            path.write_text(text[:start] + flow_css + text[end:])
print(json.dumps({"mode": "apply" if args.apply else "dry-run", "changed": changed}, ensure_ascii=False))
