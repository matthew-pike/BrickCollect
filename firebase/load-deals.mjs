// Owner data job: deals ("On special") found by the deal scan, into Firestore meta/deals for the Admin page to approve.
// File: firebase/data/deals.json, written by the scheduled deal scan (or by hand):
//   { "deals": [ { "id": "bigw-bf-2026-75367", "title": "…", "store": "Big W", "url": "https://…",
//                  "sets": [ { "n": "75367-1", "price": 99, "was": 149.99 } ],
//                  "starts": "2026-11-23", "ends": "2026-11-30", "note": "…", "source": { "title": "…", "url": "…" },
//                  "found": "2026-11-22" } ] }
// Prices are AUD. Set numbers: LEGO "75367-1" (or "75367"), other brands "<brand doc>:<number>" as in iteminfo.
// Usage: node load-deals.mjs data/deals.json   (the file is optional: without it only the tidy-up runs)
//
// meta/deals = { deals: { <id>: { …the deal…, status: 'draft' | 'live' | 'skipped' | 'ended', addedAt, … } }, updatedAt }
//  - A new id comes in as a draft. A draft the scan sends again is refreshed. Live, skipped and ended deals are left alone
//    (the owner decided), so re-running is safe.
//  - Publishing on the Admin page sets status 'live' and writes items.<n>.sale into iteminfo (the set pages read it).
//  - Tidy-up (every run): a live deal or draft past its end date becomes 'ended' and its iteminfo sale entries are removed;
//    ended and skipped deals are dropped 60 days later. Deals without an end date end 7 days after they were found.
// meta is readable by anyone (the public pages read the live deals from it); only admins can write it from the site.
import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore';

const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const bucketOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'b' + (h % 16); };
// Today in Sydney (deals are Australian; an end date means "until the end of that day").
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
const addDays = (d, k) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const money = v => (v == null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 100) / 100 : NaN);

export function readDeals(file, catalog) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.deals || [];
  const out = [], bad = [];
  for (const d of list) {
    const why = [];
    if (!d || typeof d !== 'object') { bad.push('not an object'); continue; }
    const id = slug(d.id || `${d.store}-${(d.sets || []).map(s => s.n).join('-')}-${d.found || ''}`).slice(0, 80);
    if (!d.title || !d.store) why.push('title and store needed');
    if (d.url && !/^https:\/\//.test(d.url)) why.push('url must be https');
    for (const k of ['starts', 'ends', 'found']) if (d[k] && !DAY_RE.test(d[k])) why.push(`${k} must be YYYY-MM-DD`);
    const sets = [];
    for (const s of d.sets || []) {
      let n = String(s.n || '').trim();
      if (/^\d{3,7}$/.test(n)) n += '-1';
      const price = money(s.price), was = money(s.was);
      if (!n || Number.isNaN(price) || Number.isNaN(was)) { why.push(`set ${n || '?'}: bad number or price`); continue; }
      const c = catalog.get(n);
      if (!c) { why.push(`set ${n}: not in the catalog`); continue; }
      sets.push({ n, name: c.name, img: c.img, path: c.path, pieces: c.pieces || null, price, was: was && price && was > price ? was : null });
    }
    if (!sets.length) why.push('no sets');
    if (why.length) { bad.push(`${id}: ${why.join('; ')}`); continue; }
    const found = d.found || today();
    out.push({ id, title: String(d.title).slice(0, 140), store: String(d.store).slice(0, 40), url: d.url || '', sets,
      starts: d.starts || '', ends: d.ends || addDays(found, 7), endsGuess: !d.ends, note: String(d.note || '').slice(0, 400),
      source: d.source && d.source.url ? { title: String(d.source.title || d.source.url).slice(0, 120), url: d.source.url } : null, found });
  }
  return { deals: out, bad };
}

// Set names, pictures and page addresses (same address rule as build-pages.mjs) for LEGO sets and other brands.
export async function loadCatalog(fs) {
  const m = new Map();
  const raw = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
  for (const [n, name, year, , pieces] of raw.sets) m.set(n, { name, year, pieces, img: `https://cdn.rebrickable.com/media/sets/${encodeURIComponent(n.toLowerCase())}.jpg`, path: `/set/${slug(n)}` });
  if (fs) {
    const snap = await fs.collection('catalog').get();
    for (const d of snap.docs) { const v = d.data() || {}; for (const [num, it] of Object.entries(v.items || {})) m.set(`${d.id}:${num}`, { name: it.name || num, year: it.year, pieces: it.pieces, img: it.img || '', path: `/set/${slug(v.brand || d.id)}-${slug(num)}` }); }
  }
  return m;
}

async function main() {
  const [file] = process.argv.slice(2);
  initializeApp({ credential: applicationDefault() });
  const fs = getFirestore();
  const incoming = file && existsSync(file) ? readDeals(file, await loadCatalog(fs)) : { deals: [], bad: [] };
  for (const b of incoming.bad) console.log(`::warning title=Deals::Skipped ${b}`);
  const ref = fs.doc('meta/deals'), day = today(), now = Date.now();
  const ended = []; // [id, sets] whose sale entries come off the set pages
  const counts = { added: 0, refreshed: 0, kept: 0, ended: 0, dropped: 0 };
  await fs.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const all = { ...((snap.exists && snap.data().deals) || {}) };
    for (const d of incoming.deals) {
      const cur = all[d.id];
      if (!cur) { all[d.id] = { ...d, status: 'draft', addedAt: now }; counts.added++; }
      else if (cur.status === 'draft' && !cur.edited) { all[d.id] = { ...cur, ...d, status: 'draft', refreshedAt: now }; counts.refreshed++; }
      else counts.kept++;
    }
    for (const [id, d] of Object.entries(all)) {
      if ((d.status === 'live' || d.status === 'draft') && d.ends && d.ends < day) {
        if (d.status === 'live') ended.push([id, d.sets || []]);
        all[id] = { ...d, status: 'ended', endedAt: now }; counts.ended++;
      } else if ((d.status === 'ended' || d.status === 'skipped') && now - (d.endedAt || d.skippedAt || d.addedAt || now) > 60 * 864e5) { delete all[id]; counts.dropped++; }
    }
    tx.set(ref, { deals: all, updatedAt: now });
  });
  // Take ended deals off the set pages (only entries that came from that deal: another deal on the same set stays).
  // A set that's also in another live deal gets that deal's price (the cheapest) instead.
  const after = ((await ref.get()).data() || {}).deals || {};
  let cleared = 0;
  for (const [id, sets] of ended) for (const s of sets) {
    let next = null;
    for (const [oid, o] of Object.entries(after)) {
      if (oid === id || o.status !== 'live' || (o.ends && o.ends < day)) continue;
      const x = (o.sets || []).find(y => y.n === s.n);
      if (x && (!next || x.price < next.p)) next = { p: x.price, was: x.was || null, store: o.store, url: o.url || '', ends: o.ends, id: oid, at: now };
    }
    const bref = fs.doc(`iteminfo/${bucketOf(s.n)}`);
    await fs.runTransaction(async tx => {
      const b = await tx.get(bref); const it = b.exists && ((b.data().items || {})[s.n]);
      if (it && it.sale && it.sale.id === id) { tx.update(bref, new FieldPath('items', s.n, 'sale'), next || FieldValue.delete()); cleared++; }
    });
  }
  console.log(`::notice title=Deals::${incoming.deals.length} in the file: ${counts.added} new drafts, ${counts.refreshed} drafts refreshed, ${counts.kept} already decided; ${counts.ended} ended (${cleared} set-page specials removed), ${counts.dropped} old ones dropped. Approve drafts on the Admin page.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
