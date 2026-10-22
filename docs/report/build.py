# Builds docs/ui-current-state.html and docs/ui-state/{app,mock}/*.webp (light over dark in one file): the app next to the mockup for every
# state, light and dark, and the check table (each handoff item and bug with its check and result).
# Usage: python3 docs/report/build.py <app shots dir> <mockup shots dir> docs docs/report/data.json
import json, html, os, shutil, sys
from PIL import Image

app_dir, mock_dir, docs, data_path = sys.argv[1:5]
data = json.load(open(data_path))
out = os.path.join(docs, 'ui-state')
shutil.rmtree(out, ignore_errors=True)
for sub in ('app', 'mock'):
    os.makedirs(os.path.join(out, sub))

def sprite(srcs, dst, desktop):
    """Light over dark in one file (an artifact holds at most 511 files); the page shows the half of the chosen theme"""
    w = 1440 if desktop else 780
    ims = []
    for src in srcs:
        im = Image.open(src).convert('RGB')
        if im.width != w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        ims.append(im)
    h = ims[0].height
    sheet = Image.new('RGB', (w, h * 2))
    for i, im in enumerate(ims):
        sheet.paste(im if im.height == h else im.resize((w, h), Image.LANCZOS), (0, h * i))
    sheet.save(dst, 'WEBP', quality=78, method=6)
    return w, h

TAGS = {
    'same': ('Как в макете', 'same'),
    'better': ('Лучше макета', 'better'),
    'diff': ('Иначе', 'diff'),
    'wait': ('Ждёт переноса', 'wait'),
}

frames = 0
cards = []
for group in data['groups']:
    items = []
    for s in group['states']:
        desktop = s.get('desktop', False)
        imgs = {}
        for kind, folder, name in (('mock', mock_dir, s['mock']), ('app', app_dir, s['app'])):
            srcs = [os.path.join(folder, f'{name}-{theme}.png') for theme in ('light', 'dark')]
            if not all(os.path.exists(x) for x in srcs):
                continue
            dst = f'ui-state/{kind}/{name}.webp'
            imgs[kind] = (dst, sprite(srcs, os.path.join(docs, dst), desktop))
            frames += 2
        label, cls = TAGS[s['tag']]
        def pic(kind):
            got = imgs.get(kind)
            if not got:
                return '<div class="miss">нет кадра</div>'
            p, (w, h) = got
            return f'<span class="sp" style="aspect-ratio: {w} / {h}"><img src="{p}" alt="" loading="lazy" width="{w}" height="{h * 2}"></span>'
        shots = ''.join(
            f'<figure><figcaption>{cap}</figcaption>{pic(kind)}</figure>'
            for kind, cap in (('mock', 'Макет'), ('app', 'Приложение'))
        )
        items.append(f'''
      <article id="s-{s['app']}" class="card {'desk' if desktop else 'phone'}" data-tag="{cls}" data-dev="{'desk' if desktop else 'phone'}">
        <header><h3>{html.escape(s['title'])}</h3><span class="tag {cls}">{label}</span></header>
        <div class="pair">{shots}</div>
        <p>{s['note']}</p>
      </article>''')
    cards.append(f'''
    <section class="group" id="{group['id']}">
      <h2>{html.escape(group['title'])}</h2>
      {('<p class="lead">' + group['lead'] + '</p>') if group.get('lead') else ''}
      <div class="cards">{''.join(items)}</div>
    </section>''')

counts = {}
for g in data['groups']:
    for s in g['states']:
        counts[s['tag']] = counts.get(s['tag'], 0) + 1
states = sum(counts.values())

RESULT = {'pass': ('Да', 'better'), 'partly': ('Частично', 'wait'), 'fail': ('Нет', 'fail')}
apps = {s['app'] for g in data['groups'] for s in g['states']}
rows, results = [], {}
for g in data.get('checks', []):
    rows.append(f'<tr class="sub"><th colspan="4" scope="colgroup">{html.escape(g["group"])}</th></tr>')
    for r in g['rows']:
        label, cls = RESULT[r['result']]
        results[r['result']] = results.get(r['result'], 0) + 1
        shot = f' <a href="#s-{r["shot"]}">кадр</a>' if r.get('shot') in apps else ''
        rows.append(f'<tr><td class="num">{html.escape(r["id"])}</td><td><b>{html.escape(r["item"])}</b><br>{html.escape(r["check"])}</td>'
                    f'<td><span class="tag {cls}">{label}</span></td><td>{r["note"]}{shot}</td></tr>')
checks = (f'<div class="checks"><table><thead><tr><th scope="col">№</th><th scope="col">Пункт и проверка</th><th scope="col">Итог</th>'
          f'<th scope="col">Как проверено</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>') if rows else ''
total = sum(results.values())

tpl = open(os.path.join(os.path.dirname(__file__), 'page.html')).read()
page = (tpl
        .replace('@@CARDS@@', ''.join(cards))
        .replace('@@CHECKS@@', checks)
        .replace('@@PASSED@@', f"{results.get('pass', 0)} из {total}")
        .replace('@@STATES@@', str(states))
        .replace('@@FRAMES@@', str(frames))
        .replace('@@SAME@@', str(counts.get('same', 0) + counts.get('better', 0)))
        .replace('@@DIFF@@', str(counts.get('diff', 0)))
        .replace('@@WAIT@@', str(counts.get('wait', 0))))
for k, v in data['fill'].items():
    page = page.replace('@@' + k + '@@', v)
open(os.path.join(docs, 'ui-current-state.html'), 'w').write(page)
print('states', states, 'frames', frames, counts)
