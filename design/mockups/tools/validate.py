#!/usr/bin/env python3
"""Validate the recovered workspace without changing it."""
import json
import re
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
PROJECT = WORKSPACE / "project"
MARKER = "/* The main flow's one stylesheet:"


def css(path):
    text = path.read_text()
    if text.count(MARKER) != 1:
        raise RuntimeError(f"{path.name}: expected one shared stylesheet")
    start = text.index(MARKER)
    return text[start:text.index("</style>", start)]


components = json.loads((WORKSPACE / "player/components.json").read_text())["components"]
if len(components) != 18:
    raise RuntimeError(f"Expected 18 components, found {len(components)}")
styles = {name: css(PROJECT / f"{name}.dc.html") for name in components}
if len(set(styles.values())) != 1:
    raise RuntimeError("Shared component styles differ; run tools/sync_css.py --apply")

canvas = json.loads((PROJECT / "canvas.json").read_text())
order = canvas["order"]
if len(order) != len(set(order)):
    raise RuntimeError("Duplicate board names in canvas order")
missing = [name for name in order if not (PROJECT / name).is_file()]
if missing:
    raise RuntimeError(f"Missing board files: {missing}")
if set(order) != set(canvas["boards"]):
    raise RuntimeError("Canvas order and board registry differ")
big = [name for name in order if canvas["boards"][name].get("page") == "i3big"]
if len(big) != 24:
    raise RuntimeError(f"Expected 24 big-topic boards, found {len(big)}")

prototype = (WORKSPACE / "prototype.html").read_text()
states = re.findall(r'<option value="([^"]+)"', prototype)
if len(states) != 93:
    raise RuntimeError(f"Expected 93 prototype states, found {len(states)}")
print(json.dumps({
    "status": "ok",
    "components": len(components),
    "sharedCss": True,
    "boards": len(order),
    "bigTopicBoards": len(big),
    "prototypeStates": len(states),
    "notes": len(canvas.get("notes", {})),
}, ensure_ascii=False))
