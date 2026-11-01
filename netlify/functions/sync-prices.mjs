// POST /api/sync-prices  — the Sync Prices button.
// Body: { type: 'SET' | 'MINIFIG', items: [{ n, bl }], loc?: 'AU' | 'US' | 'CA' | 'UK' | 'EU' }   (at most 20 items per call)
// Signed-in people only. Prices checked in the last 24 hours come straight from the database;
// anything older is looked up on BrickLink, saved for everyone, and counts against the
// person's daily allowance (admins have no allowance).
import { env, json, sb, getUser, isAdmin, bucketOf, readBuckets, savePrices, isFresh, priceItemAll, validLoc, locFresh, bricklinkReady, pool, BrickLinkAuthError } from '../lib/common.mjs';

const DAY = 24 * 3600 * 1000;
const MAX_PER_CALL = 20;
const valid = s => typeof s === 'string' && s.length > 0 && s.length <= 60 && /^[A-Za-z0-9._~:@+-]+$/.test(s);

export default async (req) => {
  const started = Date.now();
  if (req.method !== 'POST') return json(405, { code: 'method', message: 'Use POST.' });
  if (!env('SUPABASE_URL') || !env('SUPABASE_SECRET_KEY')) return json(500, { code: 'setup', message: 'The site’s database settings are missing.' });

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const user = await getUser(token);
  if (!user) return json(401, { code: 'signed_out', message: 'Sign in to sync prices.' });

  let body; try { body = await req.json(); } catch { return json(400, { code: 'bad_request', message: 'The request wasn’t readable.' }); }
  const type = body?.type === 'MINIFIG' ? 'MINIFIG' : 'SET';
  const loc = validLoc(body?.loc); // the seller location the visitor picked (none = worldwide)
  const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_PER_CALL).filter(x => x && valid(x.n)) : [];
  if (!items.length) return json(400, { code: 'bad_request', message: 'Nothing to sync.' });

  const admin = await isAdmin(user.email);
  // Only the site owner syncs by hand; everyone else's prices come from the twice-daily refresh.
  if (!admin) return json(403, { code: 'admin_only', message: 'Prices refresh automatically twice a day.' });
  const buckets = await readBuckets([...new Set(items.map(x => bucketOf(x.n)))]);
  const entryOf = n => (buckets.get(bucketOf(n)) || {})[n];

  // Work out the BrickLink number for each item. Minifigures use the shared number the admin set,
  // so one person's guess can't put the wrong price on everyone's list.
  const results = [], stale = [];
  for (const it of items) {
    const entry = entryOf(it.n);
    const bl = type === 'SET' ? (entry?.bl || it.n) : (admin && valid(it.bl) ? it.bl : entry?.bl);
    if (!bl) { results.push({ n: it.n, error: 'no BrickLink number' }); continue; }
    // Prices the site owner typed in are kept; otherwise anything checked in the last day comes from the database.
    if (entry?.manualPrice || (isFresh(entry, DAY) && (!loc || locFresh(entry, loc, DAY)))) { results.push({ n: it.n, used: entry.used ?? null, new: entry.new ?? null, loc: entry.loc, pricedAt: entry.pricedAt, cached: true }); continue; }
    stale.push({ n: it.n, bl });
  }

  // Daily allowance
  const today = new Date().toISOString().slice(0, 10);
  let usedToday = 0, allowance = Infinity;
  if (!admin) {
    allowance = Math.max(0, Number(env('SYNC_DAILY_ITEMS') || 60));
    const rows = await sb(`sync_log?select=items&user_id=eq.${user.id}&day=eq.${today}`);
    usedToday = rows?.[0]?.items || 0;
  }
  const canFetch = Math.max(0, allowance - usedToday);
  const toFetch = stale.slice(0, canFetch);
  const limitReached = stale.length > toFetch.length;
  for (const s of stale.slice(toFetch.length)) results.push({ n: s.n, skipped: true });

  if (toFetch.length && !bricklinkReady()) return json(500, { code: 'setup', message: 'BrickLink keys aren’t set up on the site yet.' });

  // Look up on BrickLink, a few at a time, finishing before the function's time limit.
  const updates = new Map();
  const now = new Date().toISOString();
  let fetched = 0;
  try {
    const out = await pool(toFetch, 8, started + 8000, async s => {
      try { const p = await priceItemAll(type, s.bl, loc ? [loc] : []); fetched++; return p; }
      catch (e) { if (e instanceof BrickLinkAuthError) throw e; return { error: e.message }; }
    });
    toFetch.forEach((s, k) => {
      const p = out[k];
      if (p === undefined) { results.push({ n: s.n, skipped: true }); return; }
      if (p.error) { results.push({ n: s.n, error: p.error }); return; }
      const entry = { used: p.used, new: p.new, loc: p.loc, pricedAt: now, checkedAt: now, priceSource: 'BrickLink' };
      if (type === 'MINIFIG') entry.bl = s.bl;
      updates.set(s.n, entry);
      results.push({ n: s.n, used: p.used, new: p.new, loc: p.loc, pricedAt: now });
    });
  } catch (e) {
    if (e instanceof BrickLinkAuthError) return json(502, { code: 'bricklink_auth', message: `BrickLink refused the request (${e.message}). The site’s BrickLink keys need checking.` });
    throw e;
  }

  await savePrices(updates);
  if (!admin && fetched) {
    await sb('sync_log?on_conflict=user_id,day', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ user_id: user.id, day: today, items: usedToday + fetched }],
    });
  }
  return json(200, { results, left: admin ? null : Math.max(0, allowance - usedToday - fetched), limitReached });
};

export const config = { path: '/api/sync-prices' };
