// Shared helpers for the BrickCollect jobs on Firebase (Cloud Functions).
// Same names as the Netlify version (netlify/lib/common.mjs), with Firestore in place of Supabase.
// BrickLink keys arrive as environment variables from Google Secret Manager:
//   BRICKLINK_CONSUMER_KEY, BRICKLINK_CONSUMER_SECRET, BRICKLINK_TOKEN_VALUE, BRICKLINK_TOKEN_SECRET
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) initializeApp();
export const fs = getFirestore();
// Skip fields that are undefined (as Supabase's JSON did) instead of failing the write.
try { fs.settings({ ignoreUndefinedProperties: true }); } catch { /* already set */ }
export const env = k => process.env[k];
export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* ---------- accounts ---------- */
// The signed-in person from a Firebase ID token, or null.
export async function getUser(idToken) {
  if (!idToken) return null;
  try { const t = await getAuth().verifyIdToken(idToken); return { id: t.uid, email: t.email_verified ? t.email : null }; }
  catch { return null; }
}
export async function isAdmin(email) {
  if (!email) return false;
  return (await fs.doc(`admins/${email.toLowerCase()}`).get()).exists;
}

/* ---------- shared documents ---------- */
export async function readShared(collection, id) {
  const s = await fs.doc(`${collection}/${id}`).get();
  return s.exists ? s.data() : null;
}
export async function upsertShared(collection, id, data) { await fs.doc(`${collection}/${id}`).set(data); }

// Calls fn(data) for every signed-in person's collection (data/users/<uid>/collection).
export async function forEachCollection(fn) {
  const users = await fs.doc('data/users').listCollections();
  for (let i = 0; i < users.length; i += 50) {
    const snaps = await fs.getAll(...users.slice(i, i + 50).map(c => c.doc('collection')));
    for (const s of snaps) if (s.exists) fn(s.data());
  }
}

/* ---------- daily Sync Prices allowance (private: the site can't read or change it) ---------- */
export async function syncUsed(uid, day) { return (await readShared('private', `sync-${day}`))?.[uid] || 0; }
export async function syncAdd(uid, day, total) { await fs.doc(`private/sync-${day}`).set({ [uid]: total }, { merge: true }); }

/* ---------- shared prices, stored in 16 buckets (same split as the site) ---------- */
export const bucketOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'b' + (h % 16); };
export async function readBuckets(ids) {
  const out = new Map();
  if (ids) { const snaps = ids.length ? await fs.getAll(...ids.map(id => fs.doc(`iteminfo/${id}`))) : []; for (const s of snaps) out.set(s.id, (s.exists && s.data().items) || {}); }
  else for (const s of (await fs.collection('iteminfo').get()).docs) out.set(s.id, s.data().items || {});
  return out;
}
// Merge price updates into their buckets inside a transaction, so updates from another job aren't lost.
export async function savePrices(updates) {
  const byBucket = new Map();
  for (const [n, entry] of updates) { const b = bucketOf(n); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push([n, entry]); }
  for (const [b, list] of byBucket) {
    const ref = fs.doc(`iteminfo/${b}`);
    await fs.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const items = { ...((snap.exists && snap.data().items) || {}) };
      // Location prices merge, so refreshing one location keeps the others.
      for (const [n, entry] of list) items[n] = { ...(items[n] || {}), ...entry, ...(entry.loc ? { loc: { ...(items[n]?.loc || {}), ...entry.loc } } : {}) };
      tx.set(ref, { items, updatedAt: Date.now() });
    });
  }
}
export const isFresh = (entry, maxAgeMs) => !!(entry && (entry.checkedAt || entry.pricedAt) && Date.now() - Date.parse(entry.checkedAt || entry.pricedAt) < maxAgeMs);

/* ---------- BrickLink price guide (OAuth 1.0, HMAC-SHA1 via Web Crypto) ---------- */
const API = 'https://api.bricklink.com/api/store/v1';
const te = new TextEncoder();
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const b64 = buf => Buffer.from(buf).toString('base64');
async function oauthHeader(method, url, query) {
  const oauth = {
    oauth_consumer_key: env('BRICKLINK_CONSUMER_KEY'),
    oauth_token: env('BRICKLINK_TOKEN_VALUE'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join(''),
    oauth_version: '1.0',
  };
  const all = { ...query, ...oauth };
  const paramStr = Object.keys(all).sort().map(k => `${enc(k)}=${enc(all[k])}`).join('&');
  const base = [method, enc(url), enc(paramStr)].join('&');
  const key = await crypto.subtle.importKey('raw', te.encode(`${enc(env('BRICKLINK_CONSUMER_SECRET'))}&${enc(env('BRICKLINK_TOKEN_SECRET'))}`), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  oauth.oauth_signature = b64(await crypto.subtle.sign('HMAC', key, te.encode(base)));
  return 'OAuth realm="", ' + Object.keys(oauth).map(k => `${k}="${enc(oauth[k])}"`).join(', ');
}
export class BrickLinkAuthError extends Error {}
export async function blGet(path, query) {
  const url = API + path;
  const qs = Object.keys(query).map(k => `${enc(k)}=${enc(query[k])}`).join('&');
  const res = await fetch(`${url}?${qs}`, { headers: { Authorization: await oauthHeader('GET', url, query) } });
  const body = await res.json().catch(() => ({}));
  const code = body?.meta?.code;
  if (code !== 200) {
    const msg = body?.meta?.description || body?.meta?.message || `HTTP ${res.status}`;
    if (code === 401 || /signature|token|consumer|\bip\b/i.test(msg)) throw new BrickLinkAuthError(msg);
    throw new Error(msg);
  }
  return body.data;
}
const num = v => (v == null || v === '' ? null : Math.round(Number(v) * 100) / 100);
async function guide(type, no, cond, where) {
  const path = `/items/${type}/${encodeURIComponent(no)}/price`;
  const q = { guide_type: 'sold', new_or_used: cond, currency_code: 'AUD', vat: 'N', ...(where || {}) };
  let d = await blGet(path, q);
  if (!Number(d.total_quantity)) d = await blGet(path, { ...q, guide_type: 'stock' });
  if (!Number(d.total_quantity)) return null;
  return num(d.qty_avg_price) ?? num(d.avg_price);
}
export function bricklinkReady() {
  return ['BRICKLINK_CONSUMER_KEY', 'BRICKLINK_CONSUMER_SECRET', 'BRICKLINK_TOKEN_VALUE', 'BRICKLINK_TOKEN_SECRET'].every(k => env(k));
}
// Used and new average prices in AUD for one BrickLink item (null when nothing has sold or is listed).
// Seller locations a visitor can pick (besides worldwide). BrickLink filters by seller country or region.
export const LOCATIONS = {
  AU: { country_code: 'AU' }, US: { country_code: 'US' }, CA: { country_code: 'CA' },
  UK: { country_code: 'UK' }, EU: { region: 'eu' },
};
// loc (e.g. 'AU') limits it to sellers there; leave it out for worldwide.
export async function priceItem(type, bl, loc) {
  const where = loc ? LOCATIONS[loc] : null;
  let [used, neu] = await Promise.all([guide(type, bl, 'U', where), guide(type, bl, 'N', where)]);
  // BrickLink lists the United Kingdom as UK; try GB as well in case that changes.
  if (loc === 'UK' && used == null && neu == null) [used, neu] = await Promise.all([guide(type, bl, 'U', { country_code: 'GB' }), guide(type, bl, 'N', { country_code: 'GB' })]).catch(() => [null, null]);
  return { used, new: neu };
}
// Worldwide price plus the given locations', e.g. { used, new, loc: { AU: { used, new } } }.
export async function priceItemAll(type, bl, locs = []) {
  const list = [...new Set(locs)].filter(l => LOCATIONS[l]);
  const [world, ...local] = await Promise.all([priceItem(type, bl), ...list.map(l => priceItem(type, bl, l))]);
  const out = { ...world, loc: {} };
  const at = new Date().toISOString();
  list.forEach((l, k) => { out.loc[l] = { ...local[k], at }; });
  return out;
}
export const validLoc = l => (LOCATIONS[l] ? l : null);
// Whether a location's price for this item was checked within maxAgeMs.
export const locFresh = (entry, l, maxAgeMs) => !!(entry?.loc?.[l]?.at && Date.now() - Date.parse(entry.loc[l].at) < maxAgeMs);

/* ---------- run tasks a few at a time, stopping at a deadline ---------- */
export async function pool(items, size, deadline, fn) {
  const results = new Array(items.length).fill(undefined);
  let i = 0;
  async function worker() {
    while (i < items.length && Date.now() < deadline) { const k = i++; results[k] = await fn(items[k], k); }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}
