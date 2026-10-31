#!/usr/bin/env python3
"""Write a manifest of the current recovered files; never rewrites the sources."""
import hashlib
import json
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
PROJECT = WORKSPACE / "project"


def entry(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


components = json.loads((WORKSPACE / "player/components.json").read_text())["components"]
canvas = json.loads((PROJECT / "canvas.json").read_text())
files = sorted(PROJECT.glob("*.dc.html"))
manifest = {
    "schema": 2,
    "status": "runnable-reconstruction",
    "byteExactCommit99ac6ff": False,
    "sources": {
        "canvas86": {
            "artifactId": "840e19a1-5c1c-49b2-9206-819203d6a26a",
            "versionId": "1793306320-13b4",
        },
        "prototypeV14": {
            "artifactId": "4cea567e-139c-4ac3-9ef1-56b35d3680b8",
            "versionId": "1793311468-286d",
        },
        "postV14Edits": "recovery/post-v14/manifest.json",
        "validation": "recovery/VALIDATION.md",
    },
    "transformations": {
        "postV14OperationsApplied": 45,
        "componentsWithSynchronizedCss": 18,
        "retiredBoards": ["I3Plates.dc.html", "I3HomeB.dc.html", "I3PageB.dc.html", "I3RecB.dc.html"],
        "retiredNotes": ["t_i3_flowi3v"],
        "bigTopicBoardsAdded": True,
        "bigTopicBoardsReconstructed": 20,
    },
    "outputs": {
        "dcHtmlFiles": len(files),
        "components": len(components),
        "boards": len(canvas["boards"]),
        "order": len(canvas["order"]),
        "notes": len(canvas.get("notes", {})),
        "pages": len(canvas["pages"]),
        "prototypeStates": 89,
    },
    "files": {f"project/{path.name}": entry(path) for path in files},
    "runtime": entry(PROJECT / "support.js"),
}
(WORKSPACE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(manifest["outputs"], ensure_ascii=False))
