// Every hour (after the minifigure numbers job): price the whole LEGO catalog a little at a time,
// so every set has a value in every price location, not just the ones people own or want.
//   Round 1: worldwide + Australia for each set, newest first.
//   Round 2: US, UK, EU and Canada.
// Then it starts over, refreshing anything older than 30 days.
// Stays under a daily cap of BrickLink requests (BrickLink allows about 5,000 a day, shared with the
// twice-daily refresh, the minifigure job and Sync Prices). Never touches prices the site owner typed in.
// Off switch: set priceSweep: false in private/settings. Progress is kept in private/sweep.
import { fs, readShared, readBuckets, savePrices, isFresh, locFresh, priceItem, priceItemAll, bricklinkReady, pool, blCalls, BrickLinkAuthError } from '../lib/common.mjs';

const DAILY_CAP = 3500;          // BrickLink requests per Sydney day for the sweep
const PER_RUN = 200;             // and per hourly run, so it spreads across the day
const FRESH = 30 * 24 * 3600 * 1000;
const MIN_PIECES = 25;           // skips keyrings, magnets, books and other extras
const ROUNDS = { 1: ['AU'], 2: ['US', 'UK', 'EU', 'CA'] };
const CATALOG_URL = 'https://brickcollect.app/catalog.json';

let catalog = null; // cached for the life of the instance
async function loadQueue() {
  if (catalog) return catalog;
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const raw = await res.json();
  // sets: [number, name, year, themeId, pieces]
  catalog = raw.sets.filter(s => Number(s[4]) >= MIN_PIECES)
    .sort((a, b) => (b[2] || 0) - (a[2] || 0) || String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }))
    .map(s => s[0]);
  return catalog;
}
const sydneyDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

// room: BrickLink requests still free this hour (the hourly job passes what the minifigure job left).
export default async ({ room = PER_RUN } = {}) => {
  const started = Date.now(), deadline = started + 45000;
  if ((await readShared('private', 'settings'))?.priceSweep === false) { console.log('sweep: switched off'); return; }
  if (!bricklinkReady()) { console.log('sweep: BrickLink keys missing'); return; }

  const ref = fs.doc('private/sweep');
  const st = { round: 1, cursor: 0, day: '', used: 0, loops: 0, ...((await ref.get()).data() || {}) };
  const today = sydneyDay();
  if (st.day !== today) { st.day = today; st.used = 0; }
  const budget = Math.min(PER_RUN, room, DAILY_CAP - st.used);
  if (budget <= 0) { console.log(`sweep: no room this hour (today ${st.used}/${DAILY_CAP})`); return; }

  const queue = await loadQueue();
  const shared = new Map();
  for (const items of (await readBuckets()).values()) for (const [n, v] of Object.entries(items)) shared.set(n, v);

  const locs = ROUNDS[st.round] || ROUNDS[1];
  const needs = n => {
    const e = shared.get(n);
    if (e?.manualPrice) return false;
    if (e?.sweepMissAt && Date.now() - Date.parse(e.sweepMissAt) < FRESH) return false;
    if (st.round === 1) return !(isFresh(e, FRESH) && locFresh(e, 'AU', FRESH));
    return !locs.every(l => locFresh(e, l, FRESH));
  };

  const calls0 = blCalls.n, updates = new Map(), now = new Date().toISOString();
  let priced = 0, missed = 0;
  try {
    while (st.cursor < queue.length && Date.now() < deadline && blCalls.n - calls0 < budget) {
      // Next few sets that need prices (skipping ones already fresh costs nothing).
      const chunk = [];
      while (st.cursor < queue.length && chunk.length < (st.round === 1 ? 6 : 3)) { const n = queue[st.cursor++]; if (needs(n)) chunk.push(n); }
      if (!chunk.length) continue;
      const out = await pool(chunk, 3, deadline + 10000, async n => {
        const bl = shared.get(n)?.bl || n;
        try {
          if (st.round === 1) return await priceItemAll('SET', bl, ['AU']);
          const loc = {};
          for (const l of locs) loc[l] = { ...(await priceItem('SET', bl, l)), at: new Date().toISOString() };
          return { loc };
        } catch (e) { if (e instanceof BrickLinkAuthError) throw e; return { error: e.message }; }
      });
      chunk.forEach((n, k) => {
        const p = out[k];
        if (!p) { st.cursor = Math.min(st.cursor, queue.indexOf(n)); return; } // didn't get to it: try again next run
        if (p.error) { updates.set(n, { sweepMissAt: now }); missed++; return; }
        updates.set(n, st.round === 1
          ? { used: p.used, new: p.new, loc: p.loc, pricedAt: now, checkedAt: now, priceSource: 'BrickLink' }
          : { loc: p.loc });
        priced++;
      });
    }
  } catch (e) {
    if (e instanceof BrickLinkAuthError) console.log('sweep: BrickLink refused the keys:', e.message);
    else throw e;
  } finally {
    await savePrices(updates);
    st.used += blCalls.n - calls0;
    if (st.cursor >= queue.length) { // round finished: next round, or start over
      st.cursor = 0;
      if (st.round === 1) st.round = 2; else { st.round = 1; st.loops = (st.loops || 0) + 1; }
    }
    st.updatedAt = now;
    await ref.set(st);
    console.log(`sweep: round ${st.round} at ${st.cursor}/${queue.length}, priced ${priced}, not on BrickLink ${missed}, requests ${blCalls.n - calls0} (today ${st.used}/${DAILY_CAP})`);
  }
};
