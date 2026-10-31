import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "tmp/mockups-local/project"
PROTOTYPE = ROOT / "tmp/artifacts/4cea567e-139c-4ac3-9ef1-56b35d3680b8/versions/1793311468-286d.html"

STATES = [
    ("i3nest", "I3Nest"),
    ("i3nesthold", "I3NestHold"),
    ("i3nestdrag", "I3NestDrag"),
    ("i3nestdrop", "I3NestDrop"),
    ("i3card", "I3Card"),
    ("i3prod", "I3Prod"),
    ("i3stock", "I3Stock"),
    ("i3step", "I3Step"),
    ("i3low", "I3Low"),
    ("i3newview", "I3NewView"),
    ("i3table", "I3Table"),
    ("i3viewset", "I3ViewSet"),
    ("i3filter", "I3Filter"),
    ("i3filtervals", "I3FilterVals"),
    ("i3filtered", "I3Filtered"),
    ("i3readd", "I3Readd"),
    ("i3ai", "I3Ai"),
    ("i3aion", "I3Aion"),
    ("i3dacha", "I3Dacha"),
    ("i3icon", "I3Icon"),
]

FINAL_TITLES = {
    "i3prod": "Хлеб: отдел, «1 из 2 шт» оранжевым (пора брать), «годен до завтра»; без подложек, тап по числу открывает − и +",
    "i3stock": "Вид «Запасы»: «Осталось» как «есть/норма», «шт» не пишется, другая единица пишется («2/4 уп»); 1 и меньше — оранжевым",
    "i3step": "Тап по «3/5» у Колы: в строке «− 3/5 шт +», каждый тап на один; через 3 с без касаний снова число",
    "i3newview": "«+» после вкладок: новый вид, сначала раскладка с картинкой (как «+ Add view» в Notion); встаёт после текущей вкладки",
    "i3viewset": "Тап по открытой вкладке: «Настроить вид» как в приложении; «Справа в строке» решает, что видно в строке (Количество, Осталось)",
    "i3filter": "Кнопка справа от вкладок: «Фильтр и сортировка» одной шторкой: сортировка, «Куплено», свойства с вариантами",
}

WRAPPER = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<div style="width: 390px; height: 844px">
<dc-import name="Flow" start="{state}" theme="{{{{theme}}}}" hint-size="390px,844px"></dc-import>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"theme": {{"editor": "enum", "options": ["light", "dark", "system"], "default": "light"}}, "$preview": {{"width": 390, "height": 844}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{ theme: this.props.theme ?? 'light' }};
  }}
}}
</script>
</body>
</html>
"""

source = PROTOTYPE.read_text()
options = {
    value: html.unescape(re.sub(r"<[^>]+>", "", label))
    for value, label in re.findall(r'<option value="([^"]+)"[^>]*>(.*?)</option>', source, re.S)
}
canvas_path = PROJECT / "canvas.json"
canvas = json.loads(canvas_path.read_text())
if not any(page["id"] == "i3big" for page in canvas["pages"]):
    canvas["pages"].insert(2, {"id": "i3big", "name": "Итерация 3: большие темы"})

for index, (state, stem) in enumerate(STATES):
    if state not in options:
        raise RuntimeError(f"State {state} is absent from prototype v14")
    filename = stem + ".dc.html"
    title = FINAL_TITLES.get(state, options[state])
    (PROJECT / filename).write_text(WRAPPER.format(title=title, state=state))
    row, col = divmod(index, 6)
    canvas["boards"][filename] = {
        "x": col * 470,
        "y": row * 1300,
        "w": 390,
        "h": 844,
        "title": title,
        "is_interactive": True,
        "page": "i3big",
    }
    if filename not in canvas["order"]:
        canvas["order"].append(filename)

canvas_path.write_text(json.dumps(canvas, ensure_ascii=False, indent=2) + "\n")
print(f"Added {len(STATES)} reconstructed big-topic artboards to {canvas_path}")
