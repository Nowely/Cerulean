"""Update only the marked iteration-3 table in the existing report."""
import html
import json
import sys
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[2]
data = json.loads((root / 'docs/report/main-flow-3.json').read_text(encoding='utf-8'))
report = root / 'docs/ui-current-state.html'
start = '    <!-- main-flow-3:start -->'
end = '    <!-- main-flow-3:end -->'
labels = {'pass': ('Да', 'better'), 'partly': ('Частично / не проверено', 'wait'), 'fail': ('Нет', 'fail')}
groups = data['checks']
rows = [row for group in groups for row in group['rows']]
if len(rows) != 67 or len({row['id'] for row in rows}) != 67:
    raise ValueError('Expected 67 uniquely identified checks')
counts = Counter(row['result'] for row in rows)
if counts.keys() - labels.keys():
    raise ValueError('Unknown check result')
escape = html.escape
lines = [
    start,
    '    <h2>Итерация 3 — текущая рабочая копия</h2>',
    '    <p>Результаты указаны только для выполненных проверок; наличие сценария само по себе не означает его выполнения. Реальный телефон и визуальная приёмка не проверены. Локальная реконструкция не является опубликованным Canvas 87 или prototype 15.</p>',
    '    <p>3 ноября 2026: в Client прошли pnpm lint, pnpm typecheck и 437 unit-тестов. Результаты относятся к локальной рабочей копии на момент запуска; проверка опубликованного head PR и итоговая приёмка не подтверждены.</p>',
    f'    <p>Проверок: {len(rows)}; не прошло: {counts["fail"]}; частично или не проверено: {counts["partly"]}; прошло полностью: {counts["pass"]}.</p>',
    '    <div class="checks"><table id="main-flow-3-checks"><thead><tr><th scope="col">№</th><th scope="col">Пункт и проверка</th><th scope="col">Итог</th><th scope="col">Доказательства и пробелы</th></tr></thead><tbody>',
]
for group in groups:
    lines.append(f'      <tr class="sub"><th colspan="4" scope="colgroup">{escape(group["group"])}</th></tr>')
    for row in group['rows']:
        label, css = labels[row['result']]
        lines.append(f'      <tr data-mf3-id="{escape(row["id"], quote=True)}"><td class="num">{escape(row["id"])}</td><td><b>{escape(row["item"])}</b><br>{escape(row["check"])}</td><td><span class="tag {css}">{label}</span></td><td>{escape(row["note"])}</td></tr>')
lines += [
    '    </tbody></table></div>',
    '    <h2>Кадры итерации 3</h2>',
    '    <p>Синтетические данные, локальная рабочая копия и реконструированный прототип; снимки не означают приёмку. Данные на парных кадрах отличаются. Для компьютера макеты этих состояний здесь не сняты. Все внешние запросы при съёмке блокировались; в консоли были сообщения о sandboxed about:blank, а в одном снимке — ещё одна неустановленная ошибка.</p>',
    '    <div class="cards">',
]
visuals = [
    ('Home', 'Главная'), ('Shopping', 'Покупки'), ('Stock', 'Запасы'),
    ('Record', 'Карточка записи'), ('Table', 'Таблица'),
    ('Filter', 'Фильтр и сортировка'), ('Settings', 'Настройки ИИ'),
]
frame_dir = root / 'docs/ui-mf3-20261103'
for device, cls, width, height in [('Mobile', 'phone', 780, 1688), ('Desktop', 'desk', 1440, 900)]:
    for name, title in visuals:
        app = f'Flow3{device}{name}.webp'
        mock = f'MockFlow3{device}{name}.webp'
        if not (frame_dir / app).is_file() or (device == 'Mobile' and not (frame_dir / mock).is_file()):
            raise FileNotFoundError(f'Missing iteration-3 frame for {device} {name}')
        def picture(file, caption):
            return (f'<figure><figcaption>{caption}</figcaption><span class="sp" style="aspect-ratio: {width} / {height}">'
                    f'<img src="ui-mf3-20261103/{file}" alt="{caption}: {escape(title)}" loading="lazy" width="{width}" height="{height * 2}"></span></figure>')
        mockup = picture(mock, 'Локальная реконструкция') if device == 'Mobile' else '<figure><figcaption>Локальная реконструкция</figcaption><div class="miss">Кадр не снят</div></figure>'
        lines.append(f'      <article id="mf3-{device.lower()}-{name.lower()}" class="card {cls}" data-tag="wait" data-dev="{cls}">'
                     f'<header><h3>{escape(title)} · {"телефон" if device == "Mobile" else "компьютер"}</h3><span class="tag wait">Не приёмка</span></header>'
                     f'<div class="pair">{mockup}{picture(app, "Приложение")}</div></article>')
lines += ['    </div>', end]
old = report.read_text(encoding='utf-8')
if old.count(start) != 1 or old.count(end) != 1 or old.index(start) > old.index(end):
    raise ValueError('Expected one ordered pair of iteration-3 markers')
before, remainder = old.split(start)
_, after = remainder.split(end)
new = before + '\n'.join(lines) + after
if sys.argv[1:] == ['--check']:
    if old != new:
        raise SystemExit('Iteration-3 table is out of date')
    print('Iteration-3 table matches JSON')
elif not sys.argv[1:]:
    if old != new:
        report.write_text(new, encoding='utf-8')
    print(f'Iteration-3 table: {len(rows)} checks')
else:
    raise SystemExit('Usage: python3 docs/report/main-flow-3-table.py [--check]')
