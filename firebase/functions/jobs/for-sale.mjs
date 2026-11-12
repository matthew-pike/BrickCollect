// "For sale by collectors": which sets and minifigures are on shared sale or trade lists whose sellers said
// "Let collectors who want these sets find my list". Rebuilt every hour (after the usage numbers) into one
// public document, meta/forsale, that the site reads to put "N for sale" on Wanted sets.
//
// Sale lists themselves stay where they are (shops/<id>, readable only by someone with the link). The seller's
// choice lives in their private share settings (data/users/<uid>/share: { on, id, find, cty }), so a list only
// becomes findable when its owner turns that on, and drops out within the hour when they turn it off, stop
// sharing or delete their account.
//
// meta/forsale = { v: 1, at, s: { <shopId>: <country code or ''> }, i: { <item key>: { <shopId>: copies } } }
// Item keys are BrickCollect's own item numbers (the x field on each shared item; e.g. 75192-1, fig-000123).
// No names, account IDs or contact details: the site fetches the sale list itself for those.
import { fs } from '../lib/common.mjs';

const MAX_BYTES = 900_000; // Firestore's limit is 1 MiB per document
// JSON with keys in order, so the copy read back from Firestore compares equal to a fresh build.
const stable = v => v && typeof v === 'object' && !Array.isArray(v)
  ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);

// Older shared lists (published before items carried x) only have the number as shown: LEGO sets drop "-1".
export const itemKey = it => it.x || (it.b === 'LEGO' && it.k === 's' && it.n && !/-\d+$/.test(it.n) ? `${it.n}-1` : null);

// Pure part, so it can be tested without a database: shops = [{ id, data }], settings = Map(ownerUid -> share settings).
export function buildIndex(shops, settings) {
  const s = {}, i = {};
  for (const { id, data } of shops) {
    const set = settings.get(data?.owner);
    // Only the list the owner is sharing now (sharing again gives a new id), and only if they opted in.
    if (!set?.on || set.id !== id || set.find !== true || !Array.isArray(data.items)) continue;
    let any = false;
    for (const it of data.items) {
      const k = itemKey(it || {}); if (!k) continue;
      const q = Math.max(1, Math.min(99, Number(it.q) || 1));
      (i[k] = i[k] || {})[id] = (i[k][id] || 0) + q;
      any = true;
    }
    if (any) s[id] = /^[A-Z]{2}$/.test(set.cty || '') ? set.cty : '';
  }
  return { v: 1, s, i };
}

export default async function forSale() {
  const snap = await fs.collection('shops').get();
  const shops = snap.docs.map(d => ({ id: d.id, data: d.data() || {} }));
  const owners = [...new Set(shops.map(x => x.data.owner).filter(Boolean))];
  const settings = new Map();
  for (let k = 0; k < owners.length; k += 100) {
    const refs = owners.slice(k, k + 100).map(o => fs.doc(`data/users/${o}/share`));
    const docs = await fs.getAll(...refs);
    docs.forEach((d, j) => { if (d.exists) settings.set(owners[k + j], d.data()); });
  }
  const out = buildIndex(shops, settings);
  const size = JSON.stringify(out).length;
  if (size > MAX_BYTES) { console.log(`for-sale: index too big (${size} bytes); kept the last one. Time to split it.`); return; }
  // Skip the write when nothing changed, so the site's copy isn't refreshed for no reason.
  const prev = (await fs.doc('meta/forsale').get()).data();
  if (prev && stable({ v: prev.v, s: prev.s, i: prev.i }) === stable(out)) { console.log('for-sale: unchanged'); return; }
  await fs.doc('meta/forsale').set({ ...out, at: Date.now() });
  console.log(`for-sale: ${Object.keys(out.s).length} findable lists of ${shops.length}, ${Object.keys(out.i).length} items, ${size} bytes`);
}
