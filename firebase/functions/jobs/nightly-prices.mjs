// Twice a day (3am and 3pm Sydney): refresh BrickLink prices for the sets and minifigures people own or want,
// most-owned first, plus each seller location those collectors have picked. Only the site owner can Sync by hand.
// Works through items whose price is more than 3 days old, for about 25 seconds a run.
import { forEachCollection, readBuckets, savePrices, isFresh, priceItemAll, validLoc, locFresh, bricklinkReady, pool, BrickLinkAuthError } from '../lib/common.mjs';

const STALE = 3 * 24 * 3600 * 1000;

export default async () => {
  const started = Date.now();
  if (!bricklinkReady()) { console.log('nightly: settings missing'); return; }

  // Count how many people own each item.
  const counts = new Map(), locsOf = new Map(); // item -> seller locations its owners have picked
  await forEachCollection(data => {
    const loc = validLoc(data?.loc);
    // Owned and wanted items both get kept up to date (owned first: they count double).
    for (const [n, v] of Object.entries(data?.items || {})) if (v?.owned || v?.wanted) {
      counts.set(n, (counts.get(n) || 0) + (v.owned ? 2 : 1));
      if (loc) { if (!locsOf.has(n)) locsOf.set(n, new Set()); locsOf.get(n).add(loc); }
    }
  });
  const shared = new Map();
  for (const items of (await readBuckets()).values()) for (const [n, v] of Object.entries(items)) shared.set(n, v);

  // LEGO sets (Rebrickable numbers like 75192-1) and minifigures that have a BrickLink number.
  const queue = [...counts].sort((a, b) => b[1] - a[1]).map(([n]) => n)
    .filter(n => !n.includes(':') && !shared.get(n)?.manualPrice && !(isFresh(shared.get(n), STALE) && [...(locsOf.get(n) || [])].every(l => locFresh(shared.get(n), l, STALE))))
    .map(n => n.startsWith('fig-') ? (shared.get(n)?.bl ? { n, type: 'MINIFIG', bl: shared.get(n).bl } : null) : { n, type: 'SET', bl: shared.get(n)?.bl || n })
    .filter(Boolean);
  if (!queue.length) { console.log('nightly: nothing to refresh'); return; }

  const updates = new Map(), now = new Date().toISOString();
  try {
    const out = await pool(queue, 8, started + 24000, async q => { try { return await priceItemAll(q.type, q.bl, [...(locsOf.get(q.n) || [])]); } catch (e) { if (e instanceof BrickLinkAuthError) throw e; return null; } });
    queue.forEach((q, k) => { const p = out[k]; if (p) updates.set(q.n, { used: p.used, new: p.new, loc: p.loc, pricedAt: now, checkedAt: now, priceSource: 'BrickLink', ...(q.type === 'MINIFIG' ? { bl: q.bl } : {}) }); });
  } catch (e) {
    if (e instanceof BrickLinkAuthError) { console.log('nightly: BrickLink refused the keys:', e.message); return; }
    throw e;
  }
  await savePrices(updates);
  console.log(`nightly: refreshed ${updates.size} of ${queue.length} stale owned items`);
};

