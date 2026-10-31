# Usage: python3 -I import_subs.py out.sql page1.mhtml page2.mhtml ...
# Reads saved set-list pages, matches set numbers to the catalog, and writes SQL that merges the
# subthemes into the automatic layer ("brickset" key) of each theme's subthemes doc. Hand edits ("manual") are untouched.
import sys, re, json, email, collections
from email import policy
from html.parser import HTMLParser
import os; CAT = os.path.join(os.path.dirname(__file__), '..', 'public', 'catalog.json')
class T(HTMLParser):
    def __init__(s): super().__init__(); s.t = []
    def handle_data(s, d):
        d = d.strip()
        if d: s.t.append(d)
def lines(path):
    raw = open(path, 'rb').read()
    if path.endswith(('.mhtml', '.mht')):
        m = email.message_from_bytes(raw, policy=policy.default)
        html = next(p.get_content() for p in m.walk() if p.get_content_type() == 'text/html')
        p = T(); p.feed(html); return p.t
    return raw.decode('utf-8', 'replace').splitlines()
found = {}
for f in sys.argv[2:]:
    L = [l.strip() for l in lines(f)]
    for i, l in enumerate(L):
        m = re.match(r'^([A-Za-z]{0,3}\d{3,8}(?:-\d+)?)\s+(.+)$', l)
        if not (m and i + 2 < len(L) and L[i + 1].startswith('Theme')): continue
        if L[i + 1].startswith('Theme / Subtheme'):
            rest = L[i + 1][len('Theme / Subtheme'):].strip()
            if rest: theme, sub = [x.strip() for x in rest.split('/', 1)]          # one-line form
            else: theme, sub = L[i + 2].rstrip(' /').strip(), L[i + 3].strip()      # page form
        else: theme, sub = L[i + 2].strip(), ''
        num = m.group(1) if '-' in m.group(1) else m.group(1) + '-1'
        found[num] = (m.group(2), theme, sub)
# Same subtheme spelled differently (e.g. MicroFighters / Microfighters): use the most common spelling.
spell = collections.Counter(v[2] for v in found.values() if v[2]); best = {}
for k, n in spell.most_common(): best.setdefault(k.lower(), k)
found = {k: (a, t, best.get(s.lower(), s)) for k, (a, t, s) in found.items()}
c = json.load(open(CAT))
th = {t[0]: t for t in c['themes']}
def chain(i):
    out = []; g = 0
    while i and i in th and g < 8: out.insert(0, th[i][1]); i = th[i][2]; g += 1
    return out or ['Other']
cat = {s[0]: s for s in c['sets']}
slug = lambda t: re.sub(r'^-+|-+$', '', re.sub(r'[^A-Za-z0-9]+', '-', t or 'Other'))[:120] or 'Other'
per = collections.defaultdict(dict); covered = collections.defaultdict(list); missing = []; nosub = 0; changes = collections.Counter(); same = 0; other = 0
for num, (name, theme, sub) in found.items():
    if not sub: nosub += 1; continue
    if num not in cat: missing.append(f'{num} {name}'); continue
    ch = chain(cat[num][3]); ctheme = ch[0]; rb = ch[1] if len(ch) > 1 else ''
    if theme != ctheme: other += 1; continue
    covered[ctheme].append(num)
    if sub == rb: same += 1; continue
    per[ctheme][num] = sub; changes[(ctheme, sub)] += 1
print(f'pages read: {len(sys.argv) - 2}   sets found: {len(found)}   no subtheme given: {nosub}   already right: {same}   to set: {sum(len(v) for v in per.values())}   not in catalog: {len(missing)}   filed under another theme here: {other}')
for m in missing: print('  not in catalog:', m)
for (t, s), n in sorted(changes.items()): print(f'  {t} / {s}: {n}')
sql = ['-- Subthemes imported from saved set-list pages. Safe to re-run.',
       '-- Merges into each theme\'s automatic subthemes. Earlier hand edits for the sets in these pages are cleared,',
       '-- so the imported subtheme shows; hand edits for other sets, and any you make after this, still win.']
for t in sorted(set(per) | set(covered)):
    m = per.get(t, {})
    keys = "array[" + ",".join("'" + k.replace("'", "''") + "'" for k in sorted(covered[t])) + "]::text[]" if covered[t] else "array[]::text[]"
    js = json.dumps(m, ensure_ascii=False).replace("'", "''")
    tj = json.dumps(t).replace("'", "''")
    sql.append(f"""insert into public.shared_docs (collection, id, data)
values ('subthemes', '{slug(t)}', jsonb_build_object('theme', '{tj}'::jsonb #>> '{{}}', 'brickset', '{js}'::jsonb, 'manual', '{{}}'::jsonb, 'films', '{{}}'::jsonb))
on conflict (collection, id) do update set
  data = shared_docs.data || jsonb_build_object('brickset', coalesce(shared_docs.data->'brickset', '{{}}'::jsonb) || excluded.data->'brickset', 'manual', coalesce(shared_docs.data->'manual', '{{}}'::jsonb) - {keys}, 'updatedAt', (extract(epoch from now()) * 1000)::bigint),
  updated_at = now();""")
open(sys.argv[1], 'w').write('\n\n'.join(sql) + '\n')
