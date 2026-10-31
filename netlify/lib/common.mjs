// Shared helpers for the BrickCollect Netlify functions. No npm packages needed.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   SUPABASE_URL                 e.g. https://xxxx.supabase.co
//   SUPABASE_SECRET_KEY          Supabase "secret" key (sb_secret_…) or the legacy service_role key. Never put this in the site.
//   BRICKLINK_CONSUMER_KEY, BRICKLINK_CONSUMER_SECRET, BRICKLINK_TOKEN_VALUE, BRICKLINK_TOKEN_SECRET
//   SYNC_DAILY_ITEMS             optional: price lookups each signed-in person may trigger per day (default 60)
//   MINIFIG_SETS_PER_RUN         optional: sets the hourly minifig-numbers job checks on BrickLink per run (default 120)

export const env = k => (globalThis.Netlify?.env?.get?.(k)) ?? process.env[k];

export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* ---------- Supabase REST ---------- */
function sbHeaders(extra = {}) {
  const key = env('SUPABASE_SECRET_KEY');
  const h = { apikey: key, 'Content-Type': 'application/json', ...extra };
  if (key && !key.startsWith('sb_')) h.Authorization = `Bearer ${key}`; // legacy service_role JWT
  return h;
}
export async function sb(path, { method = 'GET', body, headers } = {}) {
  const url = `${env('SUPABASE_URL')}/rest/v1/${path}`;
  const res = await fetch(url, { method, headers: sbHeaders(headers), body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
export async function getUser(accessToken) {
  if (!accessToken) return null;
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_SECRET_KEY'), Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  return res.json();
}
export async function isAdmin(email) {
  if (!email) return false;
  const rows = await sb(`admins?select=email&email=ilike.${encodeURIComponent(email)}`);
  return Array.isArray(rows) && rows.length > 0;
}
export async function upsertShared(collection, id, data) {
  await sb('shared_docs?on_conflict=collection,id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [{ collection, id, data, updated_at: new Date().toISOString() }],
  });
}

/* ---------- shared prices, stored in 16 buckets (same split as the site) ---------- */
export const bucketOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'b' + (h % 16); };
export async function readBuckets(ids) {
  const filter = ids ? `&id=in.(${ids.map(encodeURIComponent).join(',')})` : '';
  const rows = await sb(`shared_docs?select=id,data&collection=eq.iteminfo${filter}`);
  const out = new Map();
  for (const r of rows || []) out.set(r.id, (r.data && r.data.items) || {});
  return out;
}
// Merge price updates into their buckets, re-reading each bucket just before writing
// so updates from another sync aren't lost.
export async function savePrices(updates) {
  const byBucket = new Map();
  for (const [n, entry] of updates) { const b = bucketOf(n); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push([n, entry]); }
  if (!byBucket.size) return;
  const current = await readBuckets([...byBucket.keys()]);
  for (const [b, list] of byBucket) {
    const items = { ...(current.get(b) || {}) };
    for (const [n, entry] of list) items[n] = { ...(items[n] || {}), ...entry };
    await upsertShared('iteminfo', b, { items, updatedAt: Date.now() });
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
async function guide(type, no, cond) {
  const path = `/items/${type}/${encodeURIComponent(no)}/price`;
  const q = { guide_type: 'sold', new_or_used: cond, currency_code: 'AUD', vat: 'N' };
  let d = await blGet(path, q);
  if (!Number(d.total_quantity)) d = await blGet(path, { ...q, guide_type: 'stock' });
  if (!Number(d.total_quantity)) return null;
  return num(d.qty_avg_price) ?? num(d.avg_price);
}
export function bricklinkReady() {
  return ['BRICKLINK_CONSUMER_KEY', 'BRICKLINK_CONSUMER_SECRET', 'BRICKLINK_TOKEN_VALUE', 'BRICKLINK_TOKEN_SECRET'].every(k => env(k));
}
// Used and new average prices in AUD for one BrickLink item (null when nothing has sold or is listed).
export async function priceItem(type, bl) {
  const [used, neu] = await Promise.all([guide(type, bl, 'U'), guide(type, bl, 'N')]);
  return { used, new: neu };
}

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
