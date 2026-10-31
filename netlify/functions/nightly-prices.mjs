// Nightly (3am Sydney): refresh BrickLink prices for the sets people own most,
// so most prices stay current without anyone pressing Sync.
// Works through the most-owned sets whose price is more than 3 days old, for about 25 seconds a night.
import { env, sb, readBuckets, savePrices, isFresh, priceItem, bricklinkReady, pool, BrickLinkAuthError } from '../lib/common.mjs';

const STALE = 3 * 24 * 3600 * 1000;

export default async () => {
  const started = Date.now();
  if (!env('SUPABASE_URL') || !env('SUPABASE_SECRET_KEY') || !bricklinkReady()) { console.log('nightly: settings missing'); return; }

  // Count how many people own each item.
  const counts = new Map();
  for (let offset = 0; ; offset += 1000) {
    const rows = await sb(`user_docs?select=data&id=eq.collection&order=user_id&limit=1000&offset=${offset}`);
    for (const r of rows || []) for (const [n, v] of Object.entries(r.data?.items || {})) if (v?.owned) counts.set(n, (counts.get(n) || 0) + 1);
    if (!rows || rows.length < 1000) break;
  }
  const shared = new Map();
  for (const items of (await readBuckets()).values()) for (const [n, v] of Object.entries(items)) shared.set(n, v);

  // LEGO sets (Rebrickable numbers like 75192-1) and minifigures that have a BrickLink number.
  const queue = [...counts].sort((a, b) => b[1] - a[1]).map(([n]) => n)
    .filter(n => !n.includes(':') && !shared.get(n)?.manualPrice && !isFresh(shared.get(n), STALE))
    .map(n => n.startsWith('fig-') ? (shared.get(n)?.bl ? { n, type: 'MINIFIG', bl: shared.get(n).bl } : null) : { n, type: 'SET', bl: shared.get(n)?.bl || n })
    .filter(Boolean);
  if (!queue.length) { console.log('nightly: nothing to refresh'); return; }

  const updates = new Map(), now = new Date().toISOString();
  try {
    const out = await pool(queue, 8, started + 24000, async q => { try { return await priceItem(q.type, q.bl); } catch (e) { if (e instanceof BrickLinkAuthError) throw e; return null; } });
    queue.forEach((q, k) => { const p = out[k]; if (p) updates.set(q.n, { used: p.used, new: p.new, pricedAt: now, checkedAt: now, priceSource: 'BrickLink', ...(q.type === 'MINIFIG' ? { bl: q.bl } : {}) }); });
  } catch (e) {
    if (e instanceof BrickLinkAuthError) { console.log('nightly: BrickLink refused the keys:', e.message); return; }
    throw e;
  }
  await savePrices(updates);
  console.log(`nightly: refreshed ${updates.size} of ${queue.length} stale owned items`);
};

// 16:00 UTC is 3am in Sydney during daylight saving (2am the rest of the year).
export const config = { schedule: '0 16 * * *' };
