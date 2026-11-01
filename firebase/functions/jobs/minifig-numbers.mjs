// Hourly: fill in BrickLink numbers (e.g. sw0001) for minifigures, which Rebrickable numbers differently (fig-000123).
// Step 1 (once per mapping file): copy Rebrickable's own BrickLink numbers from public/bl-numbers.json.
// Step 2 (each run): for minifigures still without one, match by name within each set using BrickLink's set lists.
// For each set, BrickLink lists the minifigures inside it. Those are paired with Rebrickable's minifigures from the
// same set by name, and a number is saved only when the pairing is clear. Numbers you set or clear by hand are never touched.
//
// BrickLink allows about 5,000 API calls a day; this job uses at most SETS_PER_RUN a run (one call per set),
// leaving room for the nightly price refresh and Sync Prices. Progress is kept in shared_docs meta/minifig-numbers.
import { env, readShared, forEachCollection, readBuckets, savePrices, upsertShared, bricklinkReady, blGet, pool, BrickLinkAuthError } from '../lib/common.mjs';

const SETS_PER_RUN = Number(env('MINIFIG_SETS_PER_RUN') || 120);

const STOP = new Set(['the', 'a', 'an', 'and', 'with', 'of', 'in', 'on', 'from', 'minifig', 'minifigure', 'figure', 'lego', 'pattern', 'printed', 'print']);
const words = s => new Set(String(s || '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 1 && !STOP.has(w)));
// Share of the shorter name's words found in the other name (0..1), with a nudge for the same first word (usually the character).
export function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let hit = 0; for (const w of A) if (B.has(w)) hit++;
  const first = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/)[0];
  return Math.min(1, hit / Math.min(A.size, B.size) + (first(a) && first(a) === first(b) ? 0.1 : 0));
}

// rb: [{ n, name }] Rebrickable minifigures in a set; bl: [{ no, name }] BrickLink minifigures in the same set.
// Returns [[rbNumber, blNumber]] for clear pairs only.
export function matchSet(rb, bl) {
  const pairs = [];
  let R = [...rb], B = [...new Map(bl.map(x => [x.no, x])).values()];
  if (R.length === 1 && B.length === 1) return [[R[0].n, B[0].no]];
  for (let round = 0; round < 3 && R.length && B.length; round++) {
    const score = R.map(r => B.map(b => similarity(r.name, b.name)));
    const taken = [];
    R.forEach((r, i) => {
      const row = score[i], best = Math.max(...row), j = row.indexOf(best);
      const second = Math.max(-1, ...row.filter((_, k) => k !== j));
      const col = score.map(rw => rw[j]), colBest = Math.max(...col);
      // Mutual best, good enough, and clearly ahead of the runner-up both ways.
      const colSecond = Math.max(-1, ...col.filter((_, k) => k !== i));
      if (best >= 0.5 && col[i] === colBest && best - second >= 0.2 && best - colSecond >= 0.2) taken.push([i, j]);
    });
    if (!taken.length) break;
    for (const [i, j] of taken) pairs.push([R[i].n, B[j].no]);
    const ti = new Set(taken.map(t => t[0])), tj = new Set(taken.map(t => t[1]));
    R = R.filter((_, i) => !ti.has(i)); B = B.filter((_, j) => !tj.has(j));
    if (R.length === 1 && B.length === 1) { pairs.push([R[0].n, B[0].no]); break; }
  }
  return pairs;
}

export default async (req) => {
  const started = Date.now();
  if (!bricklinkReady()) { console.log('minifig-numbers: settings missing'); return; }
  const site = env('SITE_URL') || 'https://brickcollect-app.web.app';
  const cat = await (await fetch(`${site}/catalog.json`)).json();

  // Current numbers: which minifigures have one (or had it cleared by hand), and which BrickLink numbers are in use.
  const shared = new Map();
  for (const items of (await readBuckets()).values()) for (const [n, v] of Object.entries(items)) shared.set(n, v);
  const decided = n => { const v = shared.get(n); return !!v && Object.prototype.hasOwnProperty.call(v, 'bl'); };
  const usedBl = new Set([...shared.values()].map(v => v?.bl).filter(Boolean));

  const state = (await readShared('meta', 'minifig-numbers')) || { checked: {}, matched: 0, unsure: 0 };
  state.checked ||= {};

  // First, Rebrickable's own BrickLink numbers (public/bl-numbers.json, built from set_mappings.csv):
  // copied once per new version, only where no number has been set or cleared by hand.
  try {
    const map = await (await fetch(`${site}/bl-numbers.json`)).json();
    if (map?.version && map.version !== state.mappingVersion) {
      const copy = new Map();
      for (const [n, no] of [...Object.entries(map.figs || {}), ...Object.entries(map.sets || {})]) if (!decided(n)) copy.set(n, { bl: no, blAuto: true });
      await savePrices(copy);
      for (const [n, v] of copy) { shared.set(n, { ...(shared.get(n) || {}), ...v }); usedBl.add(v.bl); }
      state.mappingVersion = map.version; state.mappingCopied = copy.size;
      await upsertShared('meta', 'minifig-numbers', { ...state, updatedAt: Date.now() });
      console.log(`minifig-numbers: copied ${copy.size} BrickLink numbers from Rebrickable's mappings`);
      return; // leave the BrickLink lookups for the next run, to stay well inside the time limit
    }
  } catch (e) { console.log('minifig-numbers: no mapping file:', e.message); }

  // Sets that still have a minifigure without a number, most-owned first, then newest first.
  const figsIn = new Map(); // set index -> [{ n, name }]
  for (const [n, name, , si] of cat.figs) for (const i of si) { if (!figsIn.has(i)) figsIn.set(i, []); figsIn.get(i).push({ n, name }); }
  const owners = new Map();
  await forEachCollection(data => { for (const [n, v] of Object.entries(data?.items || {})) if (v?.owned) owners.set(n, (owners.get(n) || 0) + 1); });
  const todo = [...figsIn.keys()]
    .map(i => ({ set: cat.sets[i], figs: figsIn.get(i) }))
    .filter(t => !state.checked[t.set[0]] && t.figs.some(f => !decided(f.n)))
    .sort((a, b) => (Math.max(owners.get(b.set[0]) || 0, ...b.figs.map(f => owners.get(f.n) || 0)) - Math.max(owners.get(a.set[0]) || 0, ...a.figs.map(f => owners.get(f.n) || 0))) || (b.set[2] - a.set[2]))
    .slice(0, SETS_PER_RUN);
  if (!todo.length) { console.log('minifig-numbers: nothing left to check'); return; }

  const updates = new Map(); let calls = 0, unsure = 0;
  try {
    await pool(todo, 6, started + 22000, async t => {
      let groups;
      try { calls++; groups = await blGet(`/items/SET/${encodeURIComponent(t.set[0])}/subsets`, { break_minifigs: 'false' }); }
      catch (e) { if (e instanceof BrickLinkAuthError) throw e; state.checked[t.set[0]] = 'missing'; return; }
      const bl = [];
      for (const g of groups || []) for (const e of g.entries || []) if (e.item?.type === 'MINIFIG') bl.push({ no: e.item.no, name: e.item.name });
      const open = t.figs.filter(f => !decided(f.n) && !updates.has(f.n));
      const free = bl.filter(b => !usedBl.has(b.no));
      for (const [n, no] of matchSet(open, free)) {
        if (usedBl.has(no)) continue;
        usedBl.add(no); updates.set(n, { bl: no, blAuto: true });
      }
      unsure += open.filter(f => !updates.has(f.n)).length;
      state.checked[t.set[0]] = 1;
    });
  } catch (e) {
    if (e instanceof BrickLinkAuthError) { console.log('minifig-numbers: BrickLink refused the keys:', e.message); return; }
    throw e;
  }
  await savePrices(updates);
  state.matched = (state.matched || 0) + updates.size;
  state.unsure = unsure;
  state.updatedAt = Date.now();
  await upsertShared('meta', 'minifig-numbers', state);
  console.log(`minifig-numbers: ${calls} sets checked, ${updates.size} numbers added (${state.matched} so far), ${Object.keys(state.checked).length} sets done`);
};

