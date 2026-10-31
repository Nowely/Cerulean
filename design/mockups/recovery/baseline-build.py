#!/usr/bin/env python3
"""Rebuild the local v14 workspace without changing the published artifacts."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[3]
CANVAS_VERSION = REPO / "tmp/artifacts/840e19a1-5c1c-49b2-9206-819203d6a26a/versions/1793306320-13b4"
CANVAS_PROJECT = CANVAS_VERSION / "project"
PROTOTYPE = REPO / "tmp/artifacts/4cea567e-139c-4ac3-9ef1-56b35d3680b8/versions/1793311468-286d.html"
RUNTIME = CANVAS_VERSION / "artifact-type/dc-runtime.js"
PROJECT = WORKSPACE / "project"
PLAYER = WORKSPACE / "player"
RETIRED_BOARDS = [
    "I3Plates.dc.html",
    "I3HomeB.dc.html",
    "I3PageB.dc.html",
    "I3RecB.dc.html",
]
RETIRED_NOTES = ["t_i3_flowi3v"]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_file(path: Path) -> dict[str, str | int]:
    data = path.read_bytes()
    return {"path": str(path), "sha256": sha(data), "bytes": len(data)}


def main() -> None:
    PROJECT.mkdir(parents=True, exist_ok=True)
    PLAYER.mkdir(parents=True, exist_ok=True)

    prototype_bytes = PROTOTYPE.read_bytes()
    prototype_html = prototype_bytes.decode("utf-8")
    files_match = re.search(r"window\.__files = (\{.*?\});\s*</script>", prototype_html, re.S)
    if not files_match:
        raise RuntimeError("prototype v14 window.__files payload not found")
    components = json.loads(files_match.group(1))
    if len(components) != 18:
        raise RuntimeError(f"expected 18 v14 components, got {len(components)}")

    for source in sorted(CANVAS_PROJECT.glob("*.dc.html")):
        if source.name not in RETIRED_BOARDS:
            (PROJECT / source.name).write_bytes(source.read_bytes())
    for name, source in components.items():
        (PROJECT / f"{name}.dc.html").write_text(source, encoding="utf-8")
    (PROJECT / "support.js").write_bytes(RUNTIME.read_bytes())

    canvas_source = CANVAS_PROJECT / "canvas.json"
    canvas = json.loads(canvas_source.read_text(encoding="utf-8"))
    for name in RETIRED_BOARDS:
        canvas["boards"].pop(name, None)
    canvas["order"] = [name for name in canvas["order"] if name not in RETIRED_BOARDS]
    for name in RETIRED_NOTES:
        canvas.get("notes", {}).pop(name, None)
    working_canvas = json.dumps(canvas, ensure_ascii=False, indent=1) + "\n"
    (PROJECT / "canvas.json").write_text(working_canvas, encoding="utf-8")

    styles = re.findall(r"<style>(.*?)</style>", prototype_html, re.S)
    scripts = re.findall(r"<script>(.*?)</script>", prototype_html, re.S)
    if len(styles) != 2 or len(scripts) != 3:
        raise RuntimeError("prototype v14 wrapper shape changed")
    (PLAYER / "prototype.css").write_text("\n\n".join(styles) + "\n", encoding="utf-8")
    (PLAYER / "prototype-renderer.js").write_text(scripts[1], encoding="utf-8")
    (PLAYER / "prototype-controls.js").write_text(scripts[2], encoding="utf-8")
    (PLAYER / "components.json").write_text(
        json.dumps({"components": list(components)}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    wrapper = prototype_html[prototype_html.index('<div class="bar">'):prototype_html.index("<script>window.__files")].strip()
    document = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Прототип основного пути</title>
<link rel="stylesheet" href="player/prototype.css">
</head>
<body>
{wrapper}
<script src="player/prototype-renderer.js"></script>
<script src="player/prototype-loader.js"></script>
</body>
</html>
"""
    (WORKSPACE / "prototype.html").write_text(document, encoding="utf-8")

    canvas_files = [source_file(path) for path in sorted(CANVAS_PROJECT.glob("*.dc.html"))]
    component_entries = []
    for name, source in components.items():
        data = source.encode("utf-8")
        component_entries.append({
            "name": name,
            "sourcePath": str(PROTOTYPE),
            "sourceKey": f"window.__files[{json.dumps(name)}]",
            "sha256": sha(data),
            "bytes": len(data),
            "output": f"project/{name}.dc.html",
        })
    manifest = {
        "schema": 1,
        "sources": {
            "canvas86": {
                "artifactId": "840e19a1-5c1c-49b2-9206-819203d6a26a",
                "versionId": "1793306320-13b4",
                "projectPath": str(CANVAS_PROJECT),
                "canvasJson": source_file(canvas_source),
                "artboards": canvas_files,
            },
            "prototypeV14": {
                "artifactId": "4cea567e-139c-4ac3-9ef1-56b35d3680b8",
                "versionId": "1793311468-286d",
                **source_file(PROTOTYPE),
            },
            "supportRuntime": source_file(RUNTIME),
        },
        "components": component_entries,
        "workingCanvas": {
            "output": "project/canvas.json",
            "sha256": sha(working_canvas.encode("utf-8")),
            "retiredBoards": RETIRED_BOARDS,
            "retiredNotes": RETIRED_NOTES,
            "bigTopicBoardsAdded": False,
        },
        "outputs": {
            "componentCount": len(components),
            "dcHtmlFileCount": len(list(PROJECT.glob("*.dc.html"))),
            "support": "project/support.js",
            "supportSha256": sha((PROJECT / "support.js").read_bytes()),
        },
    }
    (WORKSPACE / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Built {len(components)} shared components and {manifest['outputs']['dcHtmlFileCount']} .dc.html files")
    print(f"Retired {len(RETIRED_BOARDS)} B-variant boards; added no big-topic boards")


if __name__ == "__main__":
    main()
