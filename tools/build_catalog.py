# Rebuild public/catalog.json from Rebrickable's database downloads (https://rebrickable.com/downloads/).
# Usage: python3 tools/build_catalog.py <folder with the files> [public/catalog.json]
# Needs themes, sets, minifigs, inventories and inventory_minifigs, as .csv or .csv.gz.
# Collections, prices and subthemes are keyed by set number, so they carry over untouched.
import csv, gzip, io, json, sys, os, collections
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'public', 'catalog.json')
def rd(name):
    for f in (name + '.csv', name + '.csv.gz'):
        p = os.path.join(src, f)
        if os.path.exists(p):
            fh = gzip.open(p, 'rt', encoding='utf-8') if f.endswith('.gz') else open(p, encoding='utf-8')
            return list(csv.DictReader(fh))
    sys.exit(f'Missing {name}.csv(.gz) in {src}')
themes = rd('themes'); sets = rd('sets'); figs = rd('minifigs')
inv = {r['id']: r['set_num'] for r in rd('inventories')}
set_idx = {s['set_num']: i for i, s in enumerate(sets)}
fig_sets = collections.defaultdict(set)
for r in rd('inventory_minifigs'):
    sn = inv.get(r['inventory_id'])
    if sn in set_idx: fig_sets[r['fig_num']].add(set_idx[sn])
data = {
  'themes': [[int(t['id']), t['name'], int(t['parent_id']) if t['parent_id'] else 0] for t in themes],
  'sets': [[s['set_num'], s['name'], int(s['year']), int(s['theme_id']), int(s['num_parts'])] for s in sets],
  'figs': [[f['fig_num'], f['name'], int(f['num_parts']), sorted(fig_sets.get(f['fig_num'], []))] for f in figs],
}
old = {}
try: old = {s[0] for s in json.load(open(out, encoding='utf-8'))['sets']}
except Exception: pass
json.dump(data, open(out, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
# BrickLink numbers from Rebrickable's set_mappings file (optional): every minifigure, plus sets whose
# BrickLink number differs from Rebrickable's. The hourly minifig-numbers job copies them into the database.
mp = os.path.join(src, 'set_mappings.csv')
if os.path.exists(mp) or os.path.exists(mp + '.gz'):
    figs_bl, sets_bl = {}, {}
    for r in rd('set_mappings'):
        if r['ext_system'] != 'BL' or not r['ext_id']: continue
        if r['set_num'].startswith('fig-'): figs_bl.setdefault(r['set_num'], r['ext_id'])
        elif r['ext_id'] != r['set_num']: sets_bl.setdefault(r['set_num'], r['ext_id'])
    import hashlib
    blob = json.dumps({'figs': figs_bl, 'sets': sets_bl}, sort_keys=True, separators=(',', ':'))
    bl_out = os.path.join(os.path.dirname(out), 'bl-numbers.json')
    json.dump({'version': hashlib.sha1(blob.encode()).hexdigest()[:12], 'figs': figs_bl, 'sets': sets_bl}, open(bl_out, 'w', encoding='utf-8'), separators=(',', ':'), sort_keys=True)
    print(f'BrickLink numbers: {len(figs_bl)} minifigures, {len(sets_bl)} sets with a different number -> {bl_out}')
new = [s for s in data['sets'] if s[0] not in old] if old else []
print(f"{len(data['themes'])} themes, {len(data['sets'])} sets, {len(data['figs'])} minifigures; newest year {max(s[2] for s in data['sets'])}")
if old: print(f'{len(new)} new sets since the last catalog' + (': ' + ', '.join(f'{s[0]} {s[1]}' for s in new[:15]) + (' …' if len(new) > 15 else '') if new else ''))
