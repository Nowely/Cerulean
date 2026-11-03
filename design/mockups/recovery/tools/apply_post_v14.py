#!/usr/bin/env python3
"""Validate or replay recorded edits on the five generated prototype documents.

Historical code is parsed for literals, never executed. A report is always sent
to stdout. --report additionally writes that report to the specified path.
"""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import shlex
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'tmp/recovery-analysis/post-v14/manifest.json'
PROJECT = ROOT / 'tmp/mockups-local/project'
DOCS = {
    'flow/Flow.html': 'Flow.dc.html',
    'flow/parts/RecordRow.html': 'RecordRow.dc.html',
    'flow/parts/TableView.html': 'TableView.dc.html',
    'flow/parts/ListSheet.html': 'ListSheet.dc.html',
    'flow/parts/PagePane.html': 'PagePane.dc.html',
    'flow/flow.css': 'Flow.dc.html',
}
EXPECTED_EVENTS = (10671, 10688, 10699, 10707, 10727, 10738, 10743,
                   10750, 10753, 10757, 10837, 10843, 10854, 10886,
                   11034, 11039)
CSS_START = "/* The main flow's one stylesheet:"


class ReplayError(Exception):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def literal(node, env=None):
    """Accept only literal data, previously captured names, and string addition."""
    env = env or {}
    if isinstance(node, ast.Name) and node.id in env:
        return env[node.id]
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = literal(node.left, env), literal(node.right, env)
        if isinstance(left, str) and isinstance(right, str):
            return left + right
        raise ReplayError('non-string addition in manifest')
    try:
        return ast.literal_eval(node)
    except (ValueError, TypeError) as exc:
        raise ReplayError(f'unsupported manifest expression: {ast.dump(node)}') from exc


def name_target(node, name):
    return isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) and node.targets[0].id == name


def assigned(tree, name):
    values = [n.value for n in tree.body if name_target(n, name)]
    if len(values) != 1:
        raise ReplayError(f'expected one assignment to {name}, found {len(values)}')
    return literal(values[0])


def pair_list(tree, name):
    pairs = assigned(tree, name)
    if not isinstance(pairs, (list, tuple)) or not all(isinstance(p, (list, tuple)) and len(p) == 2 and all(isinstance(x, str) for x in p) for p in pairs):
        raise ReplayError(f'{name} is not a list of string pairs')
    return pairs


def r_calls(tree):
    pairs = []
    for node in tree.body:
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id == 'R':
            args = node.value.args
            if len(args) not in (2, 3) or node.value.keywords or (len(args) == 3 and literal(args[2]) != 1):
                raise ReplayError('unexpected R invocation')
            pairs.append((literal(args[0]), literal(args[1])))
    if not pairs:
        raise ReplayError('no R calls found')
    return pairs


def direct_replacements(tree, stop_at_path=None):
    """Extract simple s.replace assignments; interpret no executable code."""
    env, pairs = {}, []
    for node in tree.body:
        if isinstance(node, ast.Assign) and name_target(node, 'p'):
            p = literal(node.value)
            if stop_at_path and p == stop_at_path:
                break
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            key = node.targets[0].id
            if key in ('a', 'b'):
                env[key] = literal(node.value, env)
            if key == 's' and isinstance(node.value, ast.Call):
                call = node.value
                if isinstance(call.func, ast.Attribute) and isinstance(call.func.value, ast.Name) and call.func.value.id == 's' and call.func.attr == 'replace':
                    if len(call.args) not in (2, 3) or call.keywords or (len(call.args) == 3 and literal(call.args[2], env) != 1):
                        raise ReplayError('unexpected replace invocation')
                    pairs.append((literal(call.args[0], env), literal(call.args[1], env)))
    return pairs


def index_anchor(tree, variable):
    nodes = [n.value for n in tree.body if name_target(n, variable)]
    if len(nodes) != 1:
        raise ReplayError(f'expected one index assignment for {variable}')
    call = nodes[0]
    if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute) and isinstance(call.func.value, ast.Name) and call.func.value.id == 's' and call.func.attr == 'index' and len(call.args) == 1 and not call.keywords):
        raise ReplayError(f'unexpected index expression for {variable}')
    return literal(call.args[0])


def add_pairs(ops, event, source, pairs):
    for old, new in pairs:
        if not isinstance(old, str) or not old or not isinstance(new, str):
            raise ReplayError('replacement must contain a nonempty string anchor')
        ops.append({'event': event, 'source': source, 'kind': 'replace', 'old': old, 'new': new})


def expect_sed(event, actual, target, expected_expr):
    parts = shlex.split(actual)
    if parts != ['sed', '-i', expected_expr, target]:
        raise ReplayError(f'unrecognized sed command at {event}: {parts!r}')


def compile_ops(manifest):
    events = manifest['events']
    if tuple(e['transcript_index_zero_based'] for e in events) != EXPECTED_EVENTS:
        raise ReplayError('unexpected manifest event sequence')
    ops = []
    for e in events:
        i = e['transcript_index_zero_based']
        blocks = e['heredoc_bodies_exact']
        if i in (10837, 10843, 11034, 11039):
            continue  # test-only; 10843 is also explicitly uncertain
        if i == 10671:
            add_pairs(ops, i, 'flow/flow.css', pair_list(ast.parse(blocks[0]), 'rep'))
        elif i == 10688:
            tree = ast.parse(blocks[0])
            add_pairs(ops, i, 'flow/Flow.html', pair_list(tree, 'rep'))
            nodes = tree.body
            record = next((j for j, n in enumerate(nodes) if name_target(n, 'p') and literal(n.value) == 'flow/parts/RecordRow.html'), None)
            table = next((j for j, n in enumerate(nodes) if name_target(n, 'p') and literal(n.value) == 'flow/parts/TableView.html'), None)
            if record is None or table is None or record >= table:
                raise ReplayError('unexpected RecordRow/TableView operation order')
            record_tree, table_tree = ast.Module(body=nodes[record:table], type_ignores=[]), ast.Module(body=nodes[table:], type_ignores=[])
            add_pairs(ops, i, 'flow/parts/RecordRow.html', direct_replacements(record_tree))
            add_pairs(ops, i, 'flow/parts/TableView.html', direct_replacements(table_tree))
        elif i == 10699:
            add_pairs(ops, i, 'flow/Flow.html', r_calls(ast.parse(blocks[0])))
        elif i == 10707:
            if len(blocks) != 2:
                raise ReplayError('missing sheet heredoc')
            tree = ast.parse(blocks[1])
            ops.append({'event': i, 'source': 'flow/Flow.html', 'kind': 'slice', 'start': index_anchor(tree, 'a'), 'end': index_anchor(tree, 'b'), 'new': blocks[0] + '\n'})
            add_pairs(ops, i, 'flow/Flow.html', [(assigned(tree, 'old'), assigned(tree, 'new'))])
        elif i == 10727:
            add_pairs(ops, i, 'flow/Flow.html', direct_replacements(ast.parse(blocks[0])))
        elif i == 10738:
            tree = ast.parse(blocks[0])
            loops = [n for n in tree.body if isinstance(n, ast.For)]
            if len(loops) != 1:
                raise ReplayError('unexpected row replacement loop')
            add_pairs(ops, i, 'flow/Flow.html', literal(loops[0].iter))
        elif i == 10743:
            tree = ast.parse(blocks[0])
            add_pairs(ops, i, 'flow/parts/ListSheet.html', r_calls(tree))
            ops.append({'event': i, 'source': 'flow/parts/ListSheet.html', 'kind': 'slice', 'start': index_anchor(tree, 'a'), 'end': index_anchor(tree, 'b'), 'new': assigned(tree, 'new')})
        elif i == 10750:
            if len(blocks) != 2:
                raise ReplayError('missing CSS append heredoc')
            ops.append({'event': i, 'source': 'flow/flow.css', 'kind': 'css_append', 'new': blocks[1] + '\n'})
        elif i == 10753:
            add_pairs(ops, i, 'flow/parts/PagePane.html', direct_replacements(ast.parse(blocks[0])))
        elif i == 10757:
            sed = e['sed_commands_exact']
            if len(sed) != 2:
                raise ReplayError('unexpected sed command count')
            old = 'class="ib vse" type="button" aria-label="Найти на странице" title="Найти на странице" onClick="{{pg.noop}}"'
            new = old.replace('{{pg.noop}}', '{{noop}}')
            expect_sed(i, sed[0], 'flow/parts/PagePane.html', 's/' + old + '/' + new + '/')
            add_pairs(ops, i, 'flow/parts/PagePane.html', [(old, new)])
            expect_sed(i, sed[1], 'flow/flow.css', r's/^\.vfi{flex:none;margin-right:-10px}/.vse{flex:none;margin-right:-6px}\n.vfi{flex:none;margin-right:-10px}/')
            ops.append({'event': i, 'source': 'flow/flow.css', 'kind': 'line_replace', 'old': '.vfi{flex:none;margin-right:-10px}', 'new': '.vse{flex:none;margin-right:-6px}\n.vfi{flex:none;margin-right:-10px}'})
        elif i == 10854:
            old = '/* The stock on the right of a row (Josh 29 Oct): have of need on a quiet plate; a tap opens − and + in its place; 1 or 0'
            new = '/* The stock on the right of a row (Josh 29 Oct): have of need, no plate (Josh 22:14Z); a tap opens − and + in its place; 1 or 0'
            expect_sed(i, e['sed_commands_exact'][0], 'flow/flow.css', 's|' + old.replace('/*', r'/\*', 1) + '|' + new + '|')
            add_pairs(ops, i, 'flow/flow.css', [(old, new)])
        elif i == 10886:
            add_pairs(ops, i, 'flow/Flow.html', direct_replacements(ast.parse(blocks[0]), 'tools/flowplay.mjs'))
        else:
            raise ReplayError(f'unhandled event {i}')
    # Fail closed if a manifest change silently changes the number of extracted edits.
    counts = {i: sum(op['event'] == i for op in ops) for i in EXPECTED_EVENTS}
    expected = {10671: 10, 10688: 8, 10699: 6, 10707: 2, 10727: 2, 10738: 2,
                10743: 8, 10750: 1, 10753: 1, 10757: 2, 10837: 0, 10843: 0,
                10854: 1, 10886: 2, 11034: 0, 11039: 0}
    if counts != expected:
        raise ReplayError(f'extracted operation counts differ: {counts!r}')
    return ops


def css_span(text):
    if text.count(CSS_START) != 1:
        raise ReplayError(f'CSS marker count is {text.count(CSS_START)}, expected 1')
    start = text.index(CSS_START)
    opening = text.rfind('<style>', 0, start)
    closing = text.find('</style>', start)
    if opening < 0 or closing < 0 or text.find('</style>', opening, start) >= 0 or text.find('<style>', start, closing) >= 0:
        raise ReplayError('cannot uniquely identify the flow stylesheet')
    return start, closing


def apply_one(text, op):
    css = op['source'] == 'flow/flow.css'
    start, end = css_span(text) if css else (0, len(text))
    body = text[start:end]
    kind = op['kind']
    if kind == 'css_append':
        if op['new'] in body or '/* «Настроить вид» in the choosing sheet:' in body:
            raise ReplayError('CSS append block is already present')
        updated, detail = body + op['new'], {'anchor': 'end of embedded flow stylesheet', 'matches': 1}
    elif kind == 'slice':
        a, b = op['start'], op['end']
        ac, bc = body.count(a), body.count(b)
        if ac != 1 or bc != 1 or body.index(a) >= body.index(b):
            raise ReplayError(f'slice anchors: start={ac}, end={bc}; ordered unique anchors required')
        x, y = body.index(a), body.index(b)
        updated, detail = body[:x] + op['new'] + body[y:], {'start_matches': ac, 'end_matches': bc, 'removed_chars': y - x}
    elif kind in ('replace', 'line_replace'):
        old, new = op['old'], op['new']
        count = body.count(old)
        if count != 1:
            raise ReplayError(f'exact anchor count {count}, expected 1; anchor={old[:160]!r}')
        at = body.index(old)
        if kind == 'line_replace' and at and body[at - 1] != '\n':
            raise ReplayError('sed line anchor is not at the beginning of a line')
        updated, detail = body[:at] + new + body[at + len(old):], {'matches': count, 'anchor_preview': old[:160]}
    else:
        raise ReplayError(f'unsupported operation {kind}')
    return text[:start] + updated + text[end:], detail


def simulate(documents, ops):
    work = dict(documents)
    log = []
    for ordinal, op in enumerate(ops, 1):
        name = DOCS[op['source']]
        record = {'ordinal': ordinal, 'event': op['event'], 'source': op['source'], 'document': name, 'kind': op['kind']}
        try:
            work[name], detail = apply_one(work[name], op)
        except (ReplayError, KeyError) as exc:
            record.update(status='mismatch', error=str(exc))
            log.append(record)
            return None, log
        record.update(status='validated', **detail)
        log.append(record)
    return work, log


def replace_file(path, data):
    fd, temp = tempfile.mkstemp(prefix='.' + path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(temp, path.stat().st_mode & 0o7777)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def run(apply):
    report = {'mode': 'apply' if apply else 'dry-run', 'status': 'error', 'manifest': str(MANIFEST),
              'project': str(PROJECT), 'operations': [], 'documents': {}, 'applied': [],
              'skipped': ['screens.json', 'tools/flowplay.mjs', 'uncertain event 10843'],
              'claim': 'Generated result is not proven equal to commit 99ac6ff.'}
    try:
        manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
        ops = compile_ops(manifest)
        originals, documents = {}, {}
        for name in dict.fromkeys(DOCS.values()):
            path = PROJECT / name
            if path.is_symlink() or not path.is_file():
                raise ReplayError(f'missing, non-regular, or symlink document: {path}')
            originals[name] = path.read_bytes()
            documents[name] = originals[name].decode('utf-8')
            report['documents'][name] = {'before_sha256': digest(originals[name]), 'before_bytes': len(originals[name])}
        work, report['operations'] = simulate(documents, ops)
        if work is None:
            report['status'] = 'mismatch'
            return report
        for name, value in work.items():
            after = value.encode('utf-8')
            report['documents'][name].update(after_sha256=digest(after), after_bytes=len(after), changed=after != originals[name])
        report['status'] = 'validated'
        if apply:
            # Recheck all files before the first write. Roll back earlier writes on an I/O error.
            for name, original in originals.items():
                path = PROJECT / name
                if path.is_symlink() or path.read_bytes() != original:
                    raise ReplayError(f'document changed since validation: {path}')
            try:
                for name, value in work.items():
                    if value.encode('utf-8') != originals[name]:
                        replace_file(PROJECT / name, value.encode('utf-8'))
                        report['applied'].append(name)
            except (OSError, UnicodeError) as exc:
                failures = []
                for name in reversed(report['applied']):
                    try:
                        replace_file(PROJECT / name, originals[name])
                    except OSError as rollback:
                        failures.append(f'{name}: {rollback}')
                report.update(status='write_error', error=str(exc), rollback_failures=failures)
                return report
            report['status'] = 'applied'
    except (OSError, UnicodeError, ValueError, KeyError, SyntaxError, TypeError, ReplayError) as exc:
        report['error'] = str(exc)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true', help='validate in memory (default)')
    mode.add_argument('--apply', action='store_true', help='write only after every operation validates')
    parser.add_argument('--report', type=Path, help='also write JSON report here; dry-run otherwise writes nothing')
    args = parser.parse_args()
    if args.report:
        report_path = args.report.resolve()
        if report_path == MANIFEST.resolve() or report_path == Path(__file__).resolve() or report_path == PROJECT.resolve() or PROJECT.resolve() in report_path.parents:
            parser.error('--report must not overwrite the manifest, this tool, or a project document')
    report = run(args.apply)
    output = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.report:
        try:
            args.report.write_text(output, encoding='utf-8')
        except OSError as exc:
            print(f'could not write report: {exc}', file=sys.stderr)
            print(output, end='')
            return 2
    print(output, end='')
    return 0 if report['status'] in ('validated', 'applied') else 1


if __name__ == '__main__':
    sys.exit(main())
