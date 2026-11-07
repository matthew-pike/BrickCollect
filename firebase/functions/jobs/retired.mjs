// Retired and retiring-soon LEGO sets, from Brickset's API (https://brickset.com/article/52664).
// Runs once a week from the 4am store job. Stores per set in the shared iteminfo buckets:
//   ret: 'R' retired | 'S' retiring soon | 'A' still on sale,  exit: 'YYYY-MM-DD' (LEGO's retirement date, when known)
// Sets the site owner marked by hand (manualRet) are never changed.
// The Brickset key lives in private/settings as bricksetKey (the site can't read /private).
// Free keys allow 100 getSets calls a day; one run uses about 2 per year covered (about 16).
import { fs, readShared, bucketOf } from '../lib/common.mjs';

const API = 'https://brickset.com/api/v3.asmx/getSets';
const DAY = 864e5;
const YEARS_BACK = 6;      // older sets fall back to the site's age rule (5+ years old = retired)
const SOON_DAYS = 183;     // "Retiring soon" when LEGO's exit date is within about 6 months
const GONE_DAYS = 90;      // not seen on LEGO.com in any region for 3 months = retired

const when = v => { const t = Date.parse(v || ''); return Number.isFinite(t) && t > 0 ? t : null; };
const day = t => new Date(t).toISOString().slice(0, 10);

// Status for one Brickset set, or null when Brickset doesn't say.
export function statusOf(s, now = Date.now()) {
  const exit = when(s.exitDate);
  if (exit != null && exit <= now) return { ret: 'R', exit: day(exit) };
  if (exit != null && exit - now <= SOON_DAYS * DAY) return { ret: 'S', exit: day(exit) };
  const last = Object.values(s.LEGOCom || {}).map(r => when(r?.dateLastAvailable)).filter(t => t != null);
  if (last.length) return { ret: now - Math.max(...last) > GONE_DAYS * DAY ? 'R' : 'A', ...(exit != null ? { exit: day(exit) } : {}) };
  if (exit != null) return { ret: 'A', exit: day(exit) };
  return null;
}

async function getYear(key, year) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const params = JSON.stringify({ year: String(year), pageSize: 500, pageNumber: page });
    const url = `${API}?apiKey=${encodeURIComponent(key)}&userHash=&params=${encodeURIComponent(params)}`;
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (body.status !== 'success') throw new Error(`Brickset ${year} p${page}: ${body.message || `HTTP ${res.status}`}`);
    out.push(...(body.sets || []));
    if ((body.sets || []).length < 500) break;
  }
  return out;
}

export default async function retired({ force = false } = {}) {
  const key = (await readShared('private', 'settings'))?.bricksetKey;
  if (!key) { console.log('retired: no bricksetKey in private/settings, skipped'); return; }
  const state = (await readShared('private', 'retired')) || {};
  if (!force && state.at && Date.now() - Date.parse(state.at) < 6.5 * DAY) { console.log('retired: ran on', state.at, '- next run in a week'); return; }

  const now = Date.now(), y0 = new Date().getFullYear();
  const found = new Map();
  for (let y = y0 - YEARS_BACK; y <= y0 + 1; y++) {
    for (const s of await getYear(key, y)) {
      if (!s.number) continue;
      const st = statusOf(s, now);
      if (st) found.set(`${s.number}-${s.numberVariant || 1}`, st);
    }
  }

  // Merge into the iteminfo buckets, only where something changed, skipping hand-set ones.
  const byBucket = new Map();
  for (const [n, st] of found) { const b = bucketOf(n); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push([n, st]); }
  const counts = { R: 0, S: 0, A: 0, changed: 0, manual: 0 };
  for (const [b, list] of byBucket) {
    const ref = fs.doc(`iteminfo/${b}`);
    await fs.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const items = { ...((snap.exists && snap.data().items) || {}) };
      let dirty = false;
      for (const [n, st] of list) {
        const cur = items[n] || {};
        counts[st.ret]++;
        if (cur.manualRet) { counts.manual++; continue; }
        if (cur.ret === st.ret && (cur.exit || null) === (st.exit || null)) continue;
        const next = { ...cur, ret: st.ret };
        if (st.exit) next.exit = st.exit; else delete next.exit;
        items[n] = next; dirty = true; counts.changed++;
      }
      if (dirty) tx.set(ref, { items, updatedAt: Date.now() });
    });
  }
  await fs.doc('private/retired').set({ at: new Date().toISOString(), years: `${y0 - YEARS_BACK}-${y0 + 1}`, ...counts });
  console.log(`retired: ${found.size} sets from Brickset; retired ${counts.R}, soon ${counts.S}, on sale ${counts.A}; ${counts.changed} changed, ${counts.manual} hand-set kept`);
}
